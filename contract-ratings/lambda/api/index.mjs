import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CONTRACTORS_TABLE = process.env.CONTRACTORS_TABLE;
const CONTRACTS_TABLE = process.env.CONTRACTS_TABLE;
const RATINGS_TABLE = process.env.RATINGS_TABLE;
const CONTRACTS_BY_CONTRACTOR_INDEX = "byContractor";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function badRequest(message) {
  return json(400, { error: message });
}

function notFound() {
  return json(404, { error: "Not found" });
}

function currentUser(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
  return {
    sub: claims.sub,
    name: claims.email || claims["cognito:username"] || claims.sub,
  };
}

function isValidStars(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

async function rateTarget({ table, id, targetPrefix, event, body }) {
  if (!isValidStars(body.stars)) return badRequest("stars must be an integer from 1 to 5");

  const existing = await ddb.send(new GetCommand({ TableName: table, Key: { id } }));
  if (!existing.Item) return notFound();

  const user = currentUser(event);
  const targetKey = `${targetPrefix}#${id}`;
  const now = new Date().toISOString();

  await ddb.send(
    new PutCommand({
      TableName: RATINGS_TABLE,
      Item: {
        targetKey,
        userSub: user.sub,
        stars: body.stars,
        comment: typeof body.comment === "string" ? body.comment.slice(0, 1000) : undefined,
        ratedBy: user.name,
        updatedAt: now,
      },
    })
  );

  const all = await ddb.send(
    new QueryCommand({
      TableName: RATINGS_TABLE,
      KeyConditionExpression: "targetKey = :t",
      ExpressionAttributeValues: { ":t": targetKey },
    })
  );
  const ratings = all.Items ?? [];
  const count = ratings.length;
  const avg = count > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / count : 0;

  await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: { id },
      UpdateExpression: "SET avgRating = :avg, ratingCount = :count, updatedAt = :now",
      ExpressionAttributeValues: { ":avg": avg, ":count": count, ":now": now },
    })
  );

  return json(200, { avgRating: avg, ratingCount: count, myRating: body.stars });
}

async function myRatingFor(targetPrefix, id, sub) {
  if (!sub) return null;
  const res = await ddb.send(
    new GetCommand({ TableName: RATINGS_TABLE, Key: { targetKey: `${targetPrefix}#${id}`, userSub: sub } })
  );
  return res.Item ? { stars: res.Item.stars, comment: res.Item.comment ?? null } : null;
}

// --- Contractors ---

async function listContractors() {
  const res = await ddb.send(new ScanCommand({ TableName: CONTRACTORS_TABLE }));
  return json(200, { items: res.Items ?? [] });
}

async function getContractor(id, event) {
  const res = await ddb.send(new GetCommand({ TableName: CONTRACTORS_TABLE, Key: { id } }));
  if (!res.Item) return notFound();
  const myRating = await myRatingFor("CONTRACTOR", id, currentUser(event).sub);
  return json(200, { ...res.Item, myRating });
}

async function createContractor(event, body) {
  if (!body.name || typeof body.name !== "string") return badRequest("name is required");

  const user = currentUser(event);
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    cageCode: typeof body.cageCode === "string" ? body.cageCode.trim() : "",
    ueiSam: typeof body.ueiSam === "string" ? body.ueiSam.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : "",
    avgRating: 0,
    ratingCount: 0,
    createdBy: user.name,
    createdAt: now,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: CONTRACTORS_TABLE, Item: item }));
  return json(201, item);
}

async function updateContractor(id, body) {
  const existing = await ddb.send(new GetCommand({ TableName: CONTRACTORS_TABLE, Key: { id } }));
  if (!existing.Item) return notFound();

  const now = new Date().toISOString();
  const next = {
    ...existing.Item,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.Item.name,
    cageCode: typeof body.cageCode === "string" ? body.cageCode.trim() : existing.Item.cageCode,
    ueiSam: typeof body.ueiSam === "string" ? body.ueiSam.trim() : existing.Item.ueiSam,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : existing.Item.notes,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: CONTRACTORS_TABLE, Item: next }));
  return json(200, next);
}

async function deleteContractor(id) {
  await ddb.send(new DeleteCommand({ TableName: CONTRACTORS_TABLE, Key: { id } }));
  return json(204, {});
}

// --- Contracts ---

async function listContracts(event) {
  const contractorId = event.queryStringParameters?.contractorId;
  if (contractorId) {
    const res = await ddb.send(
      new QueryCommand({
        TableName: CONTRACTS_TABLE,
        IndexName: CONTRACTS_BY_CONTRACTOR_INDEX,
        KeyConditionExpression: "contractorId = :c",
        ExpressionAttributeValues: { ":c": contractorId },
      })
    );
    return json(200, { items: res.Items ?? [] });
  }
  const res = await ddb.send(new ScanCommand({ TableName: CONTRACTS_TABLE }));
  return json(200, { items: res.Items ?? [] });
}

async function getContract(id, event) {
  const res = await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  if (!res.Item) return notFound();
  const myRating = await myRatingFor("CONTRACT", id, currentUser(event).sub);
  return json(200, { ...res.Item, myRating });
}

async function createContract(event, body) {
  if (!body.contractNumber || typeof body.contractNumber !== "string") {
    return badRequest("contractNumber is required");
  }
  if (!body.title || typeof body.title !== "string") return badRequest("title is required");
  if (!body.contractorId || typeof body.contractorId !== "string") return badRequest("contractorId is required");

  const contractor = await ddb.send(new GetCommand({ TableName: CONTRACTORS_TABLE, Key: { id: body.contractorId } }));
  if (!contractor.Item) return badRequest("contractorId does not refer to an existing contractor");

  const user = currentUser(event);
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    contractNumber: body.contractNumber.trim(),
    title: body.title.trim(),
    contractorId: body.contractorId,
    agency: typeof body.agency === "string" ? body.agency.trim() : "",
    awardDate: typeof body.awardDate === "string" ? body.awardDate : "",
    contractValue: typeof body.contractValue === "number" ? body.contractValue : null,
    description: typeof body.description === "string" ? body.description.slice(0, 2000) : "",
    avgRating: 0,
    ratingCount: 0,
    createdBy: user.name,
    createdAt: now,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: CONTRACTS_TABLE, Item: item }));
  return json(201, item);
}

async function updateContract(id, body) {
  const existing = await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  if (!existing.Item) return notFound();

  const now = new Date().toISOString();
  const next = {
    ...existing.Item,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : existing.Item.title,
    agency: typeof body.agency === "string" ? body.agency.trim() : existing.Item.agency,
    awardDate: typeof body.awardDate === "string" ? body.awardDate : existing.Item.awardDate,
    contractValue: typeof body.contractValue === "number" ? body.contractValue : existing.Item.contractValue,
    description: typeof body.description === "string" ? body.description.slice(0, 2000) : existing.Item.description,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: CONTRACTS_TABLE, Item: next }));
  return json(200, next);
}

async function deleteContract(id) {
  await ddb.send(new DeleteCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  return json(204, {});
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
    if (body === null) return badRequest("Invalid JSON body");
  }

  try {
    switch (routeKey) {
      case "GET /api/contractors":
        return await listContractors();
      case "POST /api/contractors":
        return await createContractor(event, body);
      case "GET /api/contractors/{id}":
        return await getContractor(id, event);
      case "PUT /api/contractors/{id}":
        return await updateContractor(id, body);
      case "DELETE /api/contractors/{id}":
        return await deleteContractor(id);
      case "POST /api/contractors/{id}/rating":
        return await rateTarget({ table: CONTRACTORS_TABLE, id, targetPrefix: "CONTRACTOR", event, body });

      case "GET /api/contracts":
        return await listContracts(event);
      case "POST /api/contracts":
        return await createContract(event, body);
      case "GET /api/contracts/{id}":
        return await getContract(id, event);
      case "PUT /api/contracts/{id}":
        return await updateContract(id, body);
      case "DELETE /api/contracts/{id}":
        return await deleteContract(id);
      case "POST /api/contracts/{id}/rating":
        return await rateTarget({ table: CONTRACTS_TABLE, id, targetPrefix: "CONTRACT", event, body });

      default:
        return json(404, { error: `No route for ${routeKey}` });
    }
  } catch (err) {
    console.error("Handler error:", err);
    return json(500, { error: "Internal error" });
  }
};
