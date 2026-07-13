// AWS Lambda entry point. Wires the backend-agnostic core (core.mjs) to
// DynamoDB, S3 presigned URLs, and the Cognito JWT claims that API
// Gateway puts on the event. The route logic itself lives in core.mjs and
// is shared with the container build (../../server).
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createRouter, json } from "./core.mjs";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const CONTRACTORS_TABLE = process.env.CONTRACTORS_TABLE;
const CONTRACTS_TABLE = process.env.CONTRACTS_TABLE;
const RATINGS_TABLE = process.env.RATINGS_TABLE;
const PWS_BUCKET = process.env.PWS_BUCKET;
const CONTRACTORS_BY_CONTRACT_INDEX = "byContract";
const PWS_UPLOAD_URL_TTL = 300; // 5 min to start the upload
const PWS_DOWNLOAD_URL_TTL = 3600; // 1 hour to open the link

const store = {
  async getContract(id) {
    return (await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id } }))).Item ?? null;
  },
  async putContract(item) {
    await ddb.send(new PutCommand({ TableName: CONTRACTS_TABLE, Item: item }));
  },
  async deleteContract(id) {
    await ddb.send(new DeleteCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  },
  async scanContracts() {
    return (await ddb.send(new ScanCommand({ TableName: CONTRACTS_TABLE }))).Items ?? [];
  },
  async getContractor(id) {
    return (await ddb.send(new GetCommand({ TableName: CONTRACTORS_TABLE, Key: { id } }))).Item ?? null;
  },
  async putContractor(item) {
    await ddb.send(new PutCommand({ TableName: CONTRACTORS_TABLE, Item: item }));
  },
  async deleteContractor(id) {
    await ddb.send(new DeleteCommand({ TableName: CONTRACTORS_TABLE, Key: { id } }));
  },
  async queryContractorsByContract(contractId) {
    const res = await ddb.send(
      new QueryCommand({
        TableName: CONTRACTORS_TABLE,
        IndexName: CONTRACTORS_BY_CONTRACT_INDEX,
        KeyConditionExpression: "contractId = :c",
        ExpressionAttributeValues: { ":c": contractId },
      })
    );
    return res.Items ?? [];
  },
  async getRating(targetKey, userSub) {
    return (await ddb.send(new GetCommand({ TableName: RATINGS_TABLE, Key: { targetKey, userSub } }))).Item ?? null;
  },
  async putRating(item) {
    await ddb.send(new PutCommand({ TableName: RATINGS_TABLE, Item: item }));
  },
  async queryRatingsByTarget(targetKey) {
    const res = await ddb.send(
      new QueryCommand({
        TableName: RATINGS_TABLE,
        KeyConditionExpression: "targetKey = :t",
        ExpressionAttributeValues: { ":t": targetKey },
      })
    );
    return res.Items ?? [];
  },
};

const files = {
  async uploadTarget(key) {
    if (!PWS_BUCKET) throw new Error("PWS storage not configured");
    const cmd = new PutObjectCommand({ Bucket: PWS_BUCKET, Key: key });
    return { uploadUrl: await getSignedUrl(s3, cmd, { expiresIn: PWS_UPLOAD_URL_TTL }) };
  },
  async downloadUrl(key, filename) {
    if (!PWS_BUCKET || !key) return null;
    const cmd = new GetObjectCommand({
      Bucket: PWS_BUCKET,
      Key: key,
      ResponseContentDisposition: `inline; filename="${filename || "pws"}"`,
    });
    return getSignedUrl(s3, cmd, { expiresIn: PWS_DOWNLOAD_URL_TTL });
  },
  async delete(key) {
    if (!PWS_BUCKET || !key) return;
    await s3.send(new DeleteObjectCommand({ Bucket: PWS_BUCKET, Key: key })).catch(() => {});
  },
};

function currentUser(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
  return { sub: claims.sub, name: claims.email || claims["cognito:username"] || claims.sub };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const handler = async (event) => {
  const routeKey = event.routeKey;
  const id = event.pathParameters?.id;

  let body;
  if (["POST", "PUT"].some((m) => routeKey?.startsWith(m))) {
    body = parseBody(event);
    if (body === null) return json(400, { error: "Invalid JSON body" });
  }

  try {
    const route = createRouter({ store, files, getUser: () => currentUser(event) });
    return await route({ routeKey, id, body });
  } catch (err) {
    console.error("Handler error:", err);
    return json(500, { error: "Internal error" });
  }
};
