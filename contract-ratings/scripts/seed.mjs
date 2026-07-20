// Seeds the Contract Ratings DynamoDB tables with a few realistic
// contracts, contract-level contacts (leads / POCs / alternate POCs),
// nested contractors, and ratings -- for testing/demo only.
//
// Usage:
//   cd contract-ratings/scripts
//   npm install
//   node seed.mjs                          # writes the built-in demo data
//   node seed.mjs --file <data.json>       # writes contracts from a JSON seed document
//   node seed.mjs --wipe                   # deletes all seed-* items, writes nothing
//
// A JSON seed document is either an array of contracts or an object with a
// `contracts` array, shaped like the CONTRACTS constant below (see
// seed-data-kuwait.json for an example). Contact entries may omit `id`,
// `inDate`, and `outDate`; ids are generated and prefixed "seed-", and
// contract ids are prefixed "seed-" if they aren't already, so --wipe
// still removes everything a seed run created.
//
// Uses your ambient AWS credentials (same ones deploy.sh uses) and writes
// directly to the tables via the DynamoDB API -- it does NOT go through
// Cognito/API Gateway. Table names and region can be overridden with
// CONTRACTS_TABLE / CONTRACTORS_TABLE / RATINGS_TABLE / AWS_REGION.
//
// Everything it creates has an id (or userSub) prefixed "seed-", so
// --wipe can find and remove exactly what this script added without
// touching real data.

import { readFileSync } from "node:fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const CONTRACTS_TABLE = process.env.CONTRACTS_TABLE || "contract-ratings-contracts";
const CONTRACTORS_TABLE = process.env.CONTRACTORS_TABLE || "contract-ratings-contractors";
const RATINGS_TABLE = process.env.RATINGS_TABLE || "contract-ratings-ratings";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const now = new Date().toISOString();
const SEED = "seed-";

// Synthetic raters (stand in for Cognito subs). Rating rows are keyed
// (targetKey, userSub), so re-running overwrites rather than duplicating.
const RATERS = ["seed-user-alice", "seed-user-bob", "seed-user-carol", "seed-user-dave"];

function contact(name, phone, email, inDate = "", outDate = "") {
  return { id: `${SEED}${crypto.randomUUID()}`, name, phone, email, inDate, outDate };
}

// The demo data. `ratings` arrays are star values from distinct raters;
// the script turns them into ratings rows and the denormalized
// avgRating / ratingCount on the parent item.
const CONTRACTS = [
  {
    id: `${SEED}c1`,
    contractNumber: "W91QF1-24-C-0042",
    title: "Base Operations Support Services",
    pwsLink: "https://example.mil/pws/W91QF1-24-C-0042.pdf",
    contractStart: "2024-01-01",
    contractEnd: "2026-08-15",
    milestone30: "Confirm option-year exercise decision with KO.",
    milestone60: "QASP surveillance summary due to CO.",
    milestone90: "Draft closeout checklist; verify GFP inventory.",
    milestone120: "Begin re-compete market research.",
    notes: "High-visibility BOS contract; PoP ends within FY. Watch funding ceiling.",
    agency: "USACE",
    contractValue: 4500000,
    description: "Facilities, grounds, and logistics support for the installation.",
    leads: [contact("MAJ Ellen Ruiz", "(555) 010-2000", "ellen.ruiz@example.mil")],
    pocs: [
      contact("SFC Marcus Bell", "(555) 010-2100", "marcus.bell@example.mil", "2024-01-05", "2025-06-30"),
      contact("SSG Dana Pruitt", "(555) 010-2101", "dana.pruitt@example.mil", "2025-07-01", ""),
    ],
    alternatePocs: [contact("Mr. Alan Frey", "(555) 010-2200", "alan.frey@example.mil")],
    ratings: [4, 5, 4],
    contractors: [
      { company: "Sentinel Logistics LLC", cageCode: "3AB92", ueiSam: "SL9K2M4N7QP1", notes: "Prime; strong past performance.", ratings: [4, 5, 4, 5] },
      { company: "Ironclad Facilities Inc.", cageCode: "7XC15", ueiSam: "IF3T8R2V6WY9", notes: "HVAC subcontractor.", ratings: [3, 4] },
    ],
  },
  {
    id: `${SEED}c2`,
    contractNumber: "W91QF1-23-C-0117",
    title: "Vehicle Maintenance Support",
    pwsLink: "https://example.mil/pws/W91QF1-23-C-0117.pdf",
    contractStart: "2023-06-01",
    contractEnd: "2026-07-25",
    milestone30: "Validate parts-on-hand report.",
    milestone60: "Mid-year surveillance visit.",
    milestone90: "",
    milestone120: "",
    notes: "Fleet readiness dipped in Q2; corrective action plan on file.",
    agency: "TACOM",
    contractValue: 1200000,
    description: "Preventive and corrective maintenance for the motor pool fleet.",
    leads: [contact("CW2 Priya Nair", "(555) 010-3000", "priya.nair@example.mil")],
    pocs: [contact("SGT Owen Diaz", "(555) 010-3100", "owen.diaz@example.mil", "2023-06-01", "")],
    alternatePocs: [],
    ratings: [3, 3],
    contractors: [
      { company: "Ironclad Fleet Services", cageCode: "5DR44", ueiSam: "IFS2N9K4M7T3", notes: "Responsive but parts lead times long.", ratings: [3, 2, 3] },
    ],
  },
  {
    id: `${SEED}c3`,
    contractNumber: "W91QF1-25-C-0008",
    title: "IT Help Desk & Network Support",
    pwsLink: "",
    contractStart: "2025-03-01",
    contractEnd: "2028-02-28",
    milestone30: "Kickoff and account provisioning complete.",
    milestone60: "Baseline ticket SLA report.",
    milestone90: "First quarterly performance review.",
    milestone120: "ATO renewal coordination.",
    notes: "New award; transition-in period ongoing.",
    agency: "PEO EIS",
    contractValue: 2750000,
    description: "Tier 1-2 help desk, network monitoring, and endpoint support.",
    leads: [
      contact("Ms. Regina Cole", "(555) 010-4000", "regina.cole@example.mil"),
      contact("CPT Sam Okafor", "(555) 010-4001", "sam.okafor@example.mil"),
    ],
    pocs: [contact("SPC Lily Tran", "(555) 010-4100", "lily.tran@example.mil", "2025-03-01", "")],
    alternatePocs: [contact("Mr. Victor Hu", "(555) 010-4200", "victor.hu@example.mil")],
    ratings: [5, 4],
    contractors: [
      { company: "NorthGrid Technologies", cageCode: "9KP03", ueiSam: "NGT7R2M4K9V1", notes: "Prime; strong transition-in.", ratings: [5, 4, 5] },
    ],
  },
];

function normalizeContact(ct) {
  return {
    inDate: "",
    outDate: "",
    ...ct,
    id: ct.id ?? `${SEED}${crypto.randomUUID()}`,
  };
}

function loadContracts() {
  const i = process.argv.indexOf("--file");
  if (i === -1) return CONTRACTS;
  const path = process.argv[i + 1];
  if (!path || path.startsWith("--")) {
    console.error("Usage: node seed.mjs --file <data.json>");
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(path, "utf8"));
  const list = Array.isArray(doc) ? doc : doc.contracts;
  if (!Array.isArray(list)) {
    throw new Error(`${path}: expected an array of contracts or { "contracts": [...] }`);
  }
  return list.map((c) => ({
    ...c,
    id: String(c.id).startsWith(SEED) ? c.id : `${SEED}${c.id}`,
    leads: (c.leads ?? []).map(normalizeContact),
    pocs: (c.pocs ?? []).map(normalizeContact),
    alternatePocs: (c.alternatePocs ?? []).map(normalizeContact),
    ratings: c.ratings ?? [],
    contractors: c.contractors ?? [],
  }));
}

function summarize(ratings) {
  const count = ratings.length;
  const avg = count > 0 ? ratings.reduce((s, r) => s + r, 0) / count : 0;
  return { avg, count };
}

async function put(table, item) {
  await ddb.send(new PutCommand({ TableName: table, Item: item }));
}

async function ratingRows(targetKey, ratings) {
  for (let i = 0; i < ratings.length; i++) {
    await put(RATINGS_TABLE, {
      targetKey,
      userSub: RATERS[i % RATERS.length],
      stars: ratings[i],
      comment: "",
      ratedBy: RATERS[i % RATERS.length],
      updatedAt: now,
    });
  }
}

async function seed() {
  const contracts = loadContracts();
  let contractorCount = 0;
  for (const c of contracts) {
    const { ratings, contractors, ...fields } = c;
    const { avg, count } = summarize(ratings);
    await put(CONTRACTS_TABLE, {
      ...fields,
      avgRating: avg,
      ratingCount: count,
      createdBy: "seed-script",
      createdAt: now,
      updatedAt: now,
    });
    await ratingRows(`CONTRACT#${c.id}`, ratings);

    for (let i = 0; i < contractors.length; i++) {
      const co = contractors[i];
      const coId = `${c.id}-co${i + 1}`;
      const s = summarize(co.ratings);
      await put(CONTRACTORS_TABLE, {
        id: coId,
        contractId: c.id,
        company: co.company,
        cageCode: co.cageCode || "",
        ueiSam: co.ueiSam || "",
        notes: co.notes || "",
        avgRating: s.avg,
        ratingCount: s.count,
        createdBy: "seed-script",
        createdAt: now,
        updatedAt: now,
      });
      await ratingRows(`CONTRACTOR#${coId}`, co.ratings);
      contractorCount++;
    }
  }
  console.log(`Seeded ${contracts.length} contracts and ${contractorCount} contractors (with ratings).`);
}

async function wipe() {
  let deleted = 0;

  const contracts = await ddb.send(new ScanCommand({ TableName: CONTRACTS_TABLE }));
  for (const item of contracts.Items ?? []) {
    if (String(item.id).startsWith(SEED)) {
      await ddb.send(new DeleteCommand({ TableName: CONTRACTS_TABLE, Key: { id: item.id } }));
      deleted++;
    }
  }

  const contractors = await ddb.send(new ScanCommand({ TableName: CONTRACTORS_TABLE }));
  for (const item of contractors.Items ?? []) {
    if (String(item.id).startsWith(SEED)) {
      await ddb.send(new DeleteCommand({ TableName: CONTRACTORS_TABLE, Key: { id: item.id } }));
      deleted++;
    }
  }

  const ratings = await ddb.send(new ScanCommand({ TableName: RATINGS_TABLE }));
  for (const item of ratings.Items ?? []) {
    if (String(item.targetKey).includes(SEED) || String(item.userSub).startsWith(SEED)) {
      await ddb.send(
        new DeleteCommand({ TableName: RATINGS_TABLE, Key: { targetKey: item.targetKey, userSub: item.userSub } })
      );
      deleted++;
    }
  }

  console.log(`Wiped ${deleted} seed items.`);
}

const mode = process.argv.includes("--wipe") ? wipe : seed;
mode().catch((err) => {
  console.error(err);
  process.exit(1);
});
