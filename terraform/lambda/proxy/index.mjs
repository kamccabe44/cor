import {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  CreateTagsCommand,
} from "@aws-sdk/client-ec2";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ec2 = new EC2Client({});
const sns = new SNSClient({});
const INSTANCE_ID = process.env.INSTANCE_ID;
const INSTANCE_NAME = process.env.INSTANCE_NAME ?? INSTANCE_ID;
const EC2_HOST = process.env.EC2_HOST;
const APP_HOST_HEADER = process.env.APP_HOST_HEADER;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const PROXY_TIMEOUT_MS = 4000;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "host",
]);

function splashPage(message, status = 200) {
  return {
    statusCode: status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    body: `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="8">
<title>Starting the COR Tracker...</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
         height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
  .card { max-width: 28rem; text-align: center; padding: 2rem; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #94a3b8; font-size: 0.9rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>Starting the COR Tracker&hellip;</h1>
    <p>${message}</p>
    <p>This page refreshes automatically every 8 seconds.</p>
  </div>
</body>
</html>`,
  };
}

async function getInstanceState() {
  const res = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  return res.Reservations?.[0]?.Instances?.[0]?.State?.Name;
}

async function notify(subject, message) {
  if (!SNS_TOPIC_ARN) return;
  try {
    await sns.send(
      new PublishCommand({ TopicArn: SNS_TOPIC_ARN, Subject: subject.slice(0, 100), Message: message })
    );
  } catch (err) {
    console.error("SNS publish failed:", err);
  }
}

async function touchLastActive() {
  await ec2.send(
    new CreateTagsCommand({
      Resources: [INSTANCE_ID],
      Tags: [{ Key: "LastActive", Value: String(Date.now()) }],
    })
  );
}

async function proxyToInstance(event) {
  const method = event.requestContext?.http?.method ?? "GET";
  const path = event.rawPath || "/";
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const url = `http://${EC2_HOST}${path}${qs}`;

  const headers = {};
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers[key] = value;
  }
  headers["host"] = APP_HOST_HEADER;
  headers["x-forwarded-proto"] = "https";
  headers["x-forwarded-host"] = APP_HOST_HEADER;

  let body;
  if (event.body && !["GET", "HEAD"].includes(method)) {
    body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { method, headers, body, redirect: "manual", signal: controller.signal });
    const respHeaders = {};
    resp.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) respHeaders[key] = value;
    });
    const buf = Buffer.from(await resp.arrayBuffer());
    return {
      statusCode: resp.status,
      headers: respHeaders,
      body: buf.toString("base64"),
      isBase64Encoded: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const handler = async (event) => {
  const state = await getInstanceState();

  if (state === "stopped" || state === "stopping") {
    await ec2.send(new StartInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    await touchLastActive();

    const sourceIp = event.requestContext?.http?.sourceIp ?? "unknown";
    const path = event.rawPath || "/";
    const when = new Date().toISOString();
    await notify(
      `COR Tracker: ${INSTANCE_NAME} starting`,
      `Instance: ${INSTANCE_NAME} (${INSTANCE_ID})\n` +
        `Action: STARTED\n` +
        `When: ${when}\n` +
        `Reason: incoming request to https://${APP_HOST_HEADER}${path} from ${sourceIp} while the instance was ${state}.`
    );

    return splashPage("Waking up the server — this usually takes a minute or two.");
  }

  if (state !== "running") {
    return splashPage(`Instance is currently ${state ?? "unknown"}.`);
  }

  try {
    const response = await proxyToInstance(event);
    await touchLastActive();
    return response;
  } catch {
    return splashPage("The instance is up but the app is still starting inside it — hang tight.");
  }
};
