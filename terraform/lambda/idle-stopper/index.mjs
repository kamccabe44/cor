import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { SSMClient, DescribeSessionsCommand } from "@aws-sdk/client-ssm";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ec2 = new EC2Client({});
const ssm = new SSMClient({});
const sns = new SNSClient({});
const INSTANCE_ID = process.env.INSTANCE_ID;
const INSTANCE_NAME = process.env.INSTANCE_NAME ?? INSTANCE_ID;
const IDLE_MINUTES = Number(process.env.IDLE_MINUTES ?? "20");
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

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

// Covers SSM Session Manager connections (the default, keyless access path
// -- see ssm_session_command in outputs.tf). Raw SSH connections (only
// possible at all if ssh_key_name is set) aren't visible to any AWS API;
// those are covered separately by an on-instance timer that touches the
// LastActive tag directly -- see user_data.sh.tftpl.
async function hasActiveSsmSession() {
  const res = await ssm.send(
    new DescribeSessionsCommand({ State: "Active", Filters: [{ key: "Target", value: INSTANCE_ID }] })
  );
  return (res.Sessions?.length ?? 0) > 0;
}

export const handler = async () => {
  const res = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  const instance = res.Reservations?.[0]?.Instances?.[0];
  const state = instance?.State?.Name;

  if (state !== "running") {
    return { skipped: true, state };
  }

  if (await hasActiveSsmSession()) {
    console.log("Skipping stop: active SSM session on", INSTANCE_ID);
    return { stopped: false, skippedReason: "active-ssm-session" };
  }

  // A missing or unparseable tag (e.g. no activity recorded yet on a
  // freshly-launched instance) is treated as "just started," not "been
  // idle since the epoch" -- the latter caused a real incident where a
  // brand new instance got stopped by its first idle-check tick, mid
  // way through user_data's first boot, because there was no tag yet.
  const lastActiveTag = instance.Tags?.find((t) => t.Key === "LastActive")?.Value;
  const parsed = Number(lastActiveTag);
  const lastActive = Number.isFinite(parsed) ? parsed : Date.now();
  const idleMinutes = (Date.now() - lastActive) / 60000;

  if (idleMinutes < IDLE_MINUTES) {
    return { stopped: false, idleMinutes: Math.round(idleMinutes) };
  }

  await ec2.send(new StopInstancesCommand({ InstanceIds: [INSTANCE_ID] }));

  const when = new Date().toISOString();
  await notify(
    `COR Tracker: ${INSTANCE_NAME} stopping`,
    `Instance: ${INSTANCE_NAME} (${INSTANCE_ID})\n` +
      `Action: STOPPED\n` +
      `When: ${when}\n` +
      `Reason: idle for ${Math.round(idleMinutes)} minutes, exceeding the ${IDLE_MINUTES}-minute threshold.`
  );

  return { stopped: true, idleMinutes: Math.round(idleMinutes) };
};
