// Imports a JSON seed document (see seed-data-kuwait.json) into a RUNNING
// container-mode Contract Ratings instance through its HTTP API -- the
// sqlite-backed build deployed by Dockerfile + k8s/. For the AWS/DynamoDB
// deployment use seed.mjs instead.
//
// Zero dependencies (Node 18+ global fetch). It signs in with the shared
// password, then creates each contract and its contractors via the same
// /api routes the SPA uses.
//
// Usage:
//   node import-local.mjs --file seed-data-kuwait.json \
//     [--url http://localhost:8080] [--password <APP_PASSWORD>]
//
// The password can also come from the APP_PASSWORD environment variable.
// Re-running is safe: contracts whose contractNumber already exists on the
// server are skipped.
//
// Note on ratings: the container build has a single shared user, and the
// API keeps one rating per user per target -- so the sample `ratings`
// arrays in the document are collapsed to a single rating (the rounded
// average) on each contract/contractor. Leave the arrays empty to import
// with no ratings.

import { readFileSync } from "node:fs";

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : fallback;
}

const url = (arg("--url", "http://localhost:8080")).replace(/\/+$/, "");
const file = arg("--file");
const password = arg("--password", process.env.APP_PASSWORD || "");

if (!file || !password) {
  console.error(
    "Usage: node import-local.mjs --file <data.json> [--url http://localhost:8080] [--password <APP_PASSWORD>]"
  );
  process.exit(1);
}

const doc = JSON.parse(readFileSync(file, "utf8"));
const contracts = Array.isArray(doc) ? doc : doc.contracts;
if (!Array.isArray(contracts)) {
  throw new Error(`${file}: expected an array of contracts or { "contracts": [...] }`);
}

let cookie = "";

async function api(method, path, body) {
  const res = await fetch(url + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${data.error || text.slice(0, 200)}`);
  }
  return { res, data };
}

function avgStars(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) return null;
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
}

async function main() {
  const { res } = await api("POST", "/api/login", { password });
  const setCookie = res.headers.get("set-cookie") || "";
  cookie = setCookie.split(";")[0];
  if (!cookie) throw new Error("login succeeded but no session cookie was returned");

  const existing = new Set(
    ((await api("GET", "/api/contracts")).data.items ?? []).map((c) => c.contractNumber)
  );

  let created = 0;
  let skipped = 0;
  let contractorCount = 0;

  for (const c of contracts) {
    if (existing.has(c.contractNumber)) {
      console.log(`skip (already exists): ${c.contractNumber}`);
      skipped++;
      continue;
    }

    const { id: _id, ratings, contractors, ...fields } = c;
    const { data: createdContract } = await api("POST", "/api/contracts", fields);
    console.log(`created contract: ${c.contractNumber} (${createdContract.id})`);
    created++;

    const stars = avgStars(ratings);
    if (stars) await api("POST", `/api/contracts/${createdContract.id}/rating`, { stars });

    for (const co of contractors ?? []) {
      const { ratings: coRatings, ...coFields } = co;
      const { data: createdCo } = await api(
        "POST",
        `/api/contracts/${createdContract.id}/contractors`,
        coFields
      );
      console.log(`  contractor: ${co.company}`);
      contractorCount++;
      const coStars = avgStars(coRatings);
      if (coStars) await api("POST", `/api/contractors/${createdCo.id}/rating`, { stars: coStars });
    }
  }

  console.log(`Done: ${created} contract(s) created, ${skipped} skipped, ${contractorCount} contractor(s).`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
