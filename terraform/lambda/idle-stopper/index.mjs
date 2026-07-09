import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ec2 = new EC2Client({});
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

export const handler = async () => {
  const res = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  const instance = res.Reservations?.[0]?.Instances?.[0];
  const state = instance?.State?.Name;

  if (state !== "running") {
    return { skipped: true, state };
  }

  const lastActiveTag = instance.Tags?.find((t) => t.Key === "LastActive")?.Value;
  const lastActive = lastActiveTag ? Number(lastActiveTag) : 0;
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
