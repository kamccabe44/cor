import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";

const ec2 = new EC2Client({});
const INSTANCE_ID = process.env.INSTANCE_ID;
const IDLE_MINUTES = Number(process.env.IDLE_MINUTES ?? "20");

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
  return { stopped: true, idleMinutes: Math.round(idleMinutes) };
};
