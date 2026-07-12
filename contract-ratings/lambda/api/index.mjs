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
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const CONTRACTORS_TABLE = process.env.CONTRACTORS_TABLE;
const CONTRACTS_TABLE = process.env.CONTRACTS_TABLE;
const RATINGS_TABLE = process.env.RATINGS_TABLE;
const PWS_BUCKET = process.env.PWS_BUCKET;
const CONTRACTORS_BY_CONTRACT_INDEX = "byContract";
const PWS_UPLOAD_URL_TTL = 300; // 5 min to start the upload
const PWS_DOWNLOAD_URL_TTL = 3600; // 1 hour to open the link

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

function str(value, max = 500) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

// Keep only safe filename characters so the S3 key is predictable and
// can't contain path traversal or odd bytes. Preserves the extension.
function sanitizeFilename(name) {
  const base = String(name || "")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return base || "document";
}

// Presigned GET URL for a contract's stored PWS, or null if none. Sets
// Content-Disposition so it opens inline in the browser with its real
// filename (PDFs render, other types download).
async function pwsDownloadUrl(item) {
  if (!PWS_BUCKET || !item.pwsKey) return null;
  const cmd = new GetObjectCommand({
    Bucket: PWS_BUCKET,
    Key: item.pwsKey,
    ResponseContentDisposition: `inline; filename="${item.pwsFilename || "pws"}"`,
  });
  return getSignedUrl(s3, cmd, { expiresIn: PWS_DOWNLOAD_URL_TTL });
}

// Contract-level contacts (leads, POCs, alternate POCs) are stored as
// lists of small objects directly on the contract item -- they aren't
// rated or queried on their own, so a nested list is simpler than a
// separate table. Every field is coerced to a string so the DynamoDB
// document client never sees an undefined (it throws on those by default).
function sanitizeContact(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    id: typeof c.id === "string" && c.id ? c.id : crypto.randomUUID(),
    name: str(c.name, 200).trim(),
    phone: str(c.phone, 100).trim(),
    email: str(c.email, 200).trim(),
    inDate: str(c.inDate, 40),
    outDate: str(c.outDate, 40),
  };
}

function sanitizeContactList(raw) {
  return Array.isArray(raw) ? raw.slice(0, 200).map(sanitizeContact) : [];
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

async function listContractorsForContract(contractId) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: CONTRACTORS_TABLE,
      IndexName: CONTRACTORS_BY_CONTRACT_INDEX,
      KeyConditionExpression: "contractId = :c",
      ExpressionAttributeValues: { ":c": contractId },
    })
  );
  return json(200, { items: res.Items ?? [] });
}

async function getContractor(id, event) {
  const res = await ddb.send(new GetCommand({ TableName: CONTRACTORS_TABLE, Key: { id } }));
  if (!res.Item) return notFound();
  const myRating = await myRatingFor("CONTRACTOR", id, currentUser(event).sub);
  return json(200, { ...res.Item, myRating });
}

async function createContractor(event, body, contractId) {
  if (!body.company || typeof body.company !== "string") return badRequest("company is required");

  const contract = await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id: contractId } }));
  if (!contract.Item) return notFound();

  const user = currentUser(event);
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    contractId,
    company: body.company.trim(),
    cageCode: str(body.cageCode, 50).trim(),
    ueiSam: str(body.ueiSam, 50).trim(),
    notes: str(body.notes, 2000),
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
    company: typeof body.company === "string" && body.company.trim() ? body.company.trim() : existing.Item.company,
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

async function listContracts() {
  const res = await ddb.send(new ScanCommand({ TableName: CONTRACTS_TABLE }));
  return json(200, { items: res.Items ?? [] });
}

async function getContract(id, event) {
  const res = await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  if (!res.Item) return notFound();
  const myRating = await myRatingFor("CONTRACT", id, currentUser(event).sub);
  const pwsUrl = await pwsDownloadUrl(res.Item);
  return json(200, { ...res.Item, myRating, pwsDownloadUrl: pwsUrl });
}

async function createContract(event, body) {
  if (!body.contractNumber || typeof body.contractNumber !== "string") {
    return badRequest("contractNumber is required");
  }
  if (!body.title || typeof body.title !== "string") return badRequest("title is required");

  const user = currentUser(event);
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    contractNumber: body.contractNumber.trim(),
    title: body.title.trim(),
    pwsLink: typeof body.pwsLink === "string" ? body.pwsLink.trim() : "",
    contractStart: typeof body.contractStart === "string" ? body.contractStart : "",
    contractEnd: typeof body.contractEnd === "string" ? body.contractEnd : "",
    milestone30: typeof body.milestone30 === "string" ? body.milestone30 : "",
    milestone60: typeof body.milestone60 === "string" ? body.milestone60 : "",
    milestone90: typeof body.milestone90 === "string" ? body.milestone90 : "",
    milestone120: typeof body.milestone120 === "string" ? body.milestone120 : "",
    leads: sanitizeContactList(body.leads),
    pocs: sanitizeContactList(body.pocs),
    alternatePocs: sanitizeContactList(body.alternatePocs),
    notes: str(body.notes, 2000),
    pwsKey: "",
    pwsFilename: "",
    agency: typeof body.agency === "string" ? body.agency.trim() : "",
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
    pwsLink: typeof body.pwsLink === "string" ? body.pwsLink.trim() : existing.Item.pwsLink,
    contractStart: typeof body.contractStart === "string" ? body.contractStart : existing.Item.contractStart,
    contractEnd: typeof body.contractEnd === "string" ? body.contractEnd : existing.Item.contractEnd, 
    milestone30: typeof body.milestone30 === "string" ? body.milestone30 : existing.Item.milestone30, 
    milestone60: typeof body.milestone60 === "string" ? body.milestone60 : existing.Item.milestone60, 
    milestone90: typeof body.milestone90 === "string" ? body.milestone90 : existing.Item.milestone90,
    milestone120: typeof body.milestone120 === "string" ? body.milestone120 : existing.Item.milestone120,
    leads: Array.isArray(body.leads) ? sanitizeContactList(body.leads) : existing.Item.leads,
    pocs: Array.isArray(body.pocs) ? sanitizeContactList(body.pocs) : existing.Item.pocs,
    alternatePocs: Array.isArray(body.alternatePocs) ? sanitizeContactList(body.alternatePocs) : existing.Item.alternatePocs,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : existing.Item.notes,
    agency: typeof body.agency === "string" ? body.agency.trim() : existing.Item.agency,
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

// Mints a short-lived presigned PUT URL so the browser can upload the PWS
// file straight to S3 (bypassing API Gateway's ~6MB payload limit). The
// key is server-chosen under this contract's prefix; recordPws() below
// confirms it onto the contract after the upload succeeds.
async function pwsUploadUrl(id, body) {
  if (!PWS_BUCKET) return json(500, { error: "PWS storage not configured" });
  if (!body.filename || typeof body.filename !== "string") return badRequest("filename is required");

  const contract = await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  if (!contract.Item) return notFound();

  const filename = sanitizeFilename(body.filename);
  const key = `pws/${id}/${crypto.randomUUID()}-${filename}`;
  const cmd = new PutObjectCommand({ Bucket: PWS_BUCKET, Key: key });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: PWS_UPLOAD_URL_TTL });
  return json(200, { uploadUrl, key, filename });
}

// Records an uploaded PWS onto the contract. Validates the key really is
// under this contract's prefix so a client can't point it at someone
// else's object. Deletes the previously-stored file if it's being replaced.
async function recordPws(id, body) {
  if (!body.key || typeof body.key !== "string") return badRequest("key is required");
  if (!body.key.startsWith(`pws/${id}/`)) return badRequest("key does not belong to this contract");

  const existing = await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  if (!existing.Item) return notFound();

  if (existing.Item.pwsKey && existing.Item.pwsKey !== body.key) {
    await s3.send(new DeleteObjectCommand({ Bucket: PWS_BUCKET, Key: existing.Item.pwsKey })).catch(() => {});
  }

  const next = {
    ...existing.Item,
    pwsKey: body.key,
    pwsFilename: sanitizeFilename(body.filename),
    updatedAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: CONTRACTS_TABLE, Item: next }));
  return json(200, { ...next, pwsDownloadUrl: await pwsDownloadUrl(next) });
}

async function removePws(id) {
  const existing = await ddb.send(new GetCommand({ TableName: CONTRACTS_TABLE, Key: { id } }));
  if (!existing.Item) return notFound();

  if (existing.Item.pwsKey) {
    await s3.send(new DeleteObjectCommand({ Bucket: PWS_BUCKET, Key: existing.Item.pwsKey })).catch(() => {});
  }

  const next = { ...existing.Item, pwsKey: "", pwsFilename: "", updatedAt: new Date().toISOString() };
  await ddb.send(new PutCommand({ TableName: CONTRACTS_TABLE, Item: next }));
  return json(200, { ...next, pwsDownloadUrl: null });
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
      case "GET /api/contractors/{id}":
        return await getContractor(id, event);
      case "PUT /api/contractors/{id}":
        return await updateContractor(id, body);
      case "DELETE /api/contractors/{id}":
        return await deleteContractor(id);
      case "POST /api/contractors/{id}/rating":
        return await rateTarget({ table: CONTRACTORS_TABLE, id, targetPrefix: "CONTRACTOR", event, body });

      case "GET /api/contracts":
        return await listContracts();
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
      case "GET /api/contracts/{id}/contractors":
        return await listContractorsForContract(id);
      case "POST /api/contracts/{id}/contractors":
        return await createContractor(event, body, id);
      case "POST /api/contracts/{id}/pws/upload-url":
        return await pwsUploadUrl(id, body);
      case "POST /api/contracts/{id}/pws":
        return await recordPws(id, body);
      case "DELETE /api/contracts/{id}/pws":
        return await removePws(id);

      default:
        return json(404, { error: `No route for ${routeKey}` });
    }
  } catch (err) {
    console.error("Handler error:", err);
    return json(500, { error: "Internal error" });
  }
};
