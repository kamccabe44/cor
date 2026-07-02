import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "cor.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

declare global {
  var __corDb: DatabaseSync | undefined;
}

function createConnection(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export const db = globalThis.__corDb ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__corDb = db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cor_profile (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  rank_grade TEXT,
  unit TEXT,
  duty_title TEXT,
  email TEXT,
  phone TEXT,
  dodaac TEXT,
  cor_level TEXT,
  appointment_letter_date TEXT,
  cert_completion_date TEXT,
  cert_expiration_date TEXT,
  clc106_date TEXT,
  ethics_training_date TEXT,
  ctip_training_date TEXT,
  supervising_co TEXT,
  supervising_co_email TEXT,
  supervising_co_phone TEXT,
  administrative_co_dcma TEXT,
  notes TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_number TEXT NOT NULL,
  task_order_number TEXT,
  title TEXT NOT NULL,
  vendor_name TEXT,
  cage_code TEXT,
  uei TEXT,
  contract_type TEXT,
  naics_code TEXT,
  psc_code TEXT,
  contracting_officer TEXT,
  contracting_officer_email TEXT,
  aco_office TEXT,
  requiring_activity TEXT,
  pop_start TEXT,
  pop_end TEXT,
  base_value REAL DEFAULT 0,
  total_value_with_options REAL DEFAULT 0,
  obligated_amount REAL DEFAULT 0,
  invoiced_amount REAL DEFAULT 0,
  funding_source TEXT,
  place_of_performance TEXT,
  status TEXT DEFAULT 'ACTIVE',
  description TEXT,
  usaspending_award_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  clin TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  frequency TEXT DEFAULT 'ONE_TIME',
  status TEXT DEFAULT 'PENDING',
  submitted_date TEXT,
  accepted_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS surveillance_events (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  method TEXT DEFAULT 'PERIODIC',
  performance_standard TEXT,
  result TEXT DEFAULT 'SATISFACTORY',
  findings TEXT,
  corrective_action_required INTEGER DEFAULT 0,
  corrective_action_due_date TEXT,
  follow_up_date TEXT,
  follow_up_status TEXT,
  reported_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  invoice_number TEXT,
  wawf_doc_number TEXT,
  date_received TEXT,
  amount REAL DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  status TEXT DEFAULT 'PENDING_REVIEW',
  reviewed_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gfp_items (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  nsn TEXT,
  serial_number TEXT,
  quantity INTEGER DEFAULT 1,
  acquisition_cost REAL DEFAULT 0,
  condition TEXT DEFAULT 'SERVICEABLE',
  location TEXT,
  date_issued TEXT,
  date_returned TEXT,
  dd_form_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS correspondence (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,
  type TEXT DEFAULT 'EMAIL',
  with_whom TEXT,
  subject TEXT,
  summary TEXT,
  action_required INTEGER DEFAULT 0,
  follow_up_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS key_personnel (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  labor_category TEXT,
  clearance_level TEXT,
  clearance_expiration TEXT,
  is_required_key_personnel INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS modifications (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  mod_number TEXT NOT NULL,
  mod_date TEXT,
  type TEXT DEFAULT 'ADMIN',
  description TEXT,
  dollar_change REAL DEFAULT 0,
  new_pop_end TEXT,
  new_total_value REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deliverables_contract ON deliverables(contract_id);
CREATE INDEX IF NOT EXISTS idx_surveillance_contract ON surveillance_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_gfp_contract ON gfp_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_contract ON correspondence(contract_id);
CREATE INDEX IF NOT EXISTS idx_personnel_contract ON key_personnel(contract_id);
CREATE INDEX IF NOT EXISTS idx_modifications_contract ON modifications(contract_id);
`;

db.exec(SCHEMA);

export function nowIso(): string {
  return new Date().toISOString();
}
