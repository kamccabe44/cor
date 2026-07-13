// Backend-agnostic route logic for the Contract Ratings API.
//
// This is the single source of truth for what every endpoint does. It is
// used two ways:
//   - index.mjs (AWS Lambda): wires DynamoDB + S3 presigner + Cognito.
//   - ../../server (container): wires node:sqlite + local disk + a shared
//     password, and serves it over plain HTTP for Kubernetes/Docker.
//
// It talks to three injected adapters so it never imports the AWS SDK
// (or anything backend-specific) itself:
//   store  - typed data access (contracts, contractors, ratings)
//   files  - PWS blob storage (upload target, download URL, delete)
//   getUser() -> { sub, name } for the caller
//
// createRouter(deps) returns route({ routeKey, id, body }) -> a plain
// { statusCode, headers, body } response (body already JSON-stringified),
// which both entry points relay to their transport.

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

const badRequest = (message) => json(400, { error: message });
const notFound = () => json(404, { error: "Not found" });

function isValidStars(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function str(value, max = 500) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

// Keep only safe filename characters so the storage key is predictable
// and can't contain path traversal or odd bytes. Preserves the extension.
function sanitizeFilename(name) {
  const base = String(name || "")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return base || "document";
}

// Contract-level contacts (leads, POCs, alternate POCs) are stored as
// lists of small objects directly on the contract item. Every field is
// coerced to a string so no undefined ever reaches the store.
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

export function createRouter({ store, files, getUser }) {
  async function pwsDownloadUrl(item) {
    if (!item.pwsKey) return null;
    return files.downloadUrl(item.pwsKey, item.pwsFilename);
  }

  async function myRatingFor(kind, id) {
    const user = getUser();
    if (!user.sub) return null;
    const item = await store.getRating(`${kind}#${id}`, user.sub);
    return item ? { stars: item.stars, comment: item.comment ?? null } : null;
  }

  async function rate(kind, id, body) {
    if (!isValidStars(body.stars)) return badRequest("stars must be an integer from 1 to 5");

    const getTarget = kind === "CONTRACT" ? store.getContract : store.getContractor;
    const putTarget = kind === "CONTRACT" ? store.putContract : store.putContractor;

    const existing = await getTarget(id);
    if (!existing) return notFound();

    const user = getUser();
    const targetKey = `${kind}#${id}`;
    const now = new Date().toISOString();

    await store.putRating({
      targetKey,
      userSub: user.sub,
      stars: body.stars,
      comment: typeof body.comment === "string" ? body.comment.slice(0, 1000) : "",
      ratedBy: user.name,
      updatedAt: now,
    });

    const ratings = await store.queryRatingsByTarget(targetKey);
    const count = ratings.length;
    const avg = count > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / count : 0;

    await putTarget({ ...existing, avgRating: avg, ratingCount: count, updatedAt: now });
    return json(200, { avgRating: avg, ratingCount: count, myRating: body.stars });
  }

  // --- Contractors ---

  async function listContractorsForContract(contractId) {
    const items = await store.queryContractorsByContract(contractId);
    return json(200, { items });
  }

  async function getContractor(id) {
    const item = await store.getContractor(id);
    if (!item) return notFound();
    return json(200, { ...item, myRating: await myRatingFor("CONTRACTOR", id) });
  }

  async function createContractor(body, contractId) {
    if (!body.company || typeof body.company !== "string") return badRequest("company is required");
    if (!(await store.getContract(contractId))) return notFound();

    const user = getUser();
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
    await store.putContractor(item);
    return json(201, item);
  }

  async function updateContractor(id, body) {
    const existing = await store.getContractor(id);
    if (!existing) return notFound();

    const next = {
      ...existing,
      company: typeof body.company === "string" && body.company.trim() ? body.company.trim() : existing.company,
      cageCode: typeof body.cageCode === "string" ? body.cageCode.trim() : existing.cageCode,
      ueiSam: typeof body.ueiSam === "string" ? body.ueiSam.trim() : existing.ueiSam,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : existing.notes,
      updatedAt: new Date().toISOString(),
    };
    await store.putContractor(next);
    return json(200, next);
  }

  async function deleteContractor(id) {
    await store.deleteContractor(id);
    return json(204, {});
  }

  // --- Contracts ---

  async function listContracts() {
    return json(200, { items: await store.scanContracts() });
  }

  async function getContract(id) {
    const item = await store.getContract(id);
    if (!item) return notFound();
    return json(200, {
      ...item,
      myRating: await myRatingFor("CONTRACT", id),
      pwsDownloadUrl: await pwsDownloadUrl(item),
    });
  }

  async function createContract(body) {
    if (!body.contractNumber || typeof body.contractNumber !== "string") {
      return badRequest("contractNumber is required");
    }
    if (!body.title || typeof body.title !== "string") return badRequest("title is required");

    const user = getUser();
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
    await store.putContract(item);
    return json(201, item);
  }

  async function updateContract(id, body) {
    const existing = await store.getContract(id);
    if (!existing) return notFound();

    const next = {
      ...existing,
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : existing.title,
      pwsLink: typeof body.pwsLink === "string" ? body.pwsLink.trim() : existing.pwsLink,
      contractStart: typeof body.contractStart === "string" ? body.contractStart : existing.contractStart,
      contractEnd: typeof body.contractEnd === "string" ? body.contractEnd : existing.contractEnd,
      milestone30: typeof body.milestone30 === "string" ? body.milestone30 : existing.milestone30,
      milestone60: typeof body.milestone60 === "string" ? body.milestone60 : existing.milestone60,
      milestone90: typeof body.milestone90 === "string" ? body.milestone90 : existing.milestone90,
      milestone120: typeof body.milestone120 === "string" ? body.milestone120 : existing.milestone120,
      leads: Array.isArray(body.leads) ? sanitizeContactList(body.leads) : existing.leads,
      pocs: Array.isArray(body.pocs) ? sanitizeContactList(body.pocs) : existing.pocs,
      alternatePocs: Array.isArray(body.alternatePocs) ? sanitizeContactList(body.alternatePocs) : existing.alternatePocs,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : existing.notes,
      agency: typeof body.agency === "string" ? body.agency.trim() : existing.agency,
      contractValue: typeof body.contractValue === "number" ? body.contractValue : existing.contractValue,
      description: typeof body.description === "string" ? body.description.slice(0, 2000) : existing.description,
      updatedAt: new Date().toISOString(),
    };
    await store.putContract(next);
    return json(200, next);
  }

  async function deleteContract(id) {
    const existing = await store.getContract(id);
    if (existing?.pwsKey) await files.delete(existing.pwsKey);
    await store.deleteContract(id);
    return json(204, {});
  }

  async function pwsUploadUrl(id, body) {
    if (!body.filename || typeof body.filename !== "string") return badRequest("filename is required");
    if (!(await store.getContract(id))) return notFound();

    const filename = sanitizeFilename(body.filename);
    const key = `pws/${id}/${crypto.randomUUID()}-${filename}`;
    const { uploadUrl } = await files.uploadTarget(key);
    return json(200, { uploadUrl, key, filename });
  }

  async function recordPws(id, body) {
    if (!body.key || typeof body.key !== "string") return badRequest("key is required");
    if (!body.key.startsWith(`pws/${id}/`)) return badRequest("key does not belong to this contract");

    const existing = await store.getContract(id);
    if (!existing) return notFound();

    if (existing.pwsKey && existing.pwsKey !== body.key) await files.delete(existing.pwsKey);

    const next = {
      ...existing,
      pwsKey: body.key,
      pwsFilename: sanitizeFilename(body.filename),
      updatedAt: new Date().toISOString(),
    };
    await store.putContract(next);
    return json(200, { ...next, pwsDownloadUrl: await pwsDownloadUrl(next) });
  }

  async function removePws(id) {
    const existing = await store.getContract(id);
    if (!existing) return notFound();
    if (existing.pwsKey) await files.delete(existing.pwsKey);

    const next = { ...existing, pwsKey: "", pwsFilename: "", updatedAt: new Date().toISOString() };
    await store.putContract(next);
    return json(200, { ...next, pwsDownloadUrl: null });
  }

  return async function route({ routeKey, id, body }) {
    switch (routeKey) {
      case "GET /api/contractors/{id}":
        return getContractor(id);
      case "PUT /api/contractors/{id}":
        return updateContractor(id, body);
      case "DELETE /api/contractors/{id}":
        return deleteContractor(id);
      case "POST /api/contractors/{id}/rating":
        return rate("CONTRACTOR", id, body);

      case "GET /api/contracts":
        return listContracts();
      case "POST /api/contracts":
        return createContract(body);
      case "GET /api/contracts/{id}":
        return getContract(id);
      case "PUT /api/contracts/{id}":
        return updateContract(id, body);
      case "DELETE /api/contracts/{id}":
        return deleteContract(id);
      case "POST /api/contracts/{id}/rating":
        return rate("CONTRACT", id, body);
      case "GET /api/contracts/{id}/contractors":
        return listContractorsForContract(id);
      case "POST /api/contracts/{id}/contractors":
        return createContractor(body, id);
      case "POST /api/contracts/{id}/pws/upload-url":
        return pwsUploadUrl(id, body);
      case "POST /api/contracts/{id}/pws":
        return recordPws(id, body);
      case "DELETE /api/contracts/{id}/pws":
        return removePws(id);

      default:
        return json(404, { error: `No route for ${routeKey}` });
    }
  };
}
