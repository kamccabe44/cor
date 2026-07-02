import { db, nowIso } from "./db";
import { createRepo } from "./repo";
import type {
  Contract,
  Deliverable,
  SurveillanceEvent,
  Invoice,
  GfpItem,
  Correspondence,
  KeyPersonnel,
  Modification,
  CorProfile,
} from "./types";

export const contracts = createRepo<Contract>("contracts", [
  "id",
  "contract_number",
  "task_order_number",
  "title",
  "vendor_name",
  "cage_code",
  "uei",
  "contract_type",
  "naics_code",
  "psc_code",
  "contracting_officer",
  "contracting_officer_email",
  "aco_office",
  "requiring_activity",
  "pop_start",
  "pop_end",
  "base_value",
  "total_value_with_options",
  "obligated_amount",
  "invoiced_amount",
  "funding_source",
  "place_of_performance",
  "status",
  "description",
  "usaspending_award_id",
  "created_at",
  "updated_at",
]);

export const deliverables = createRepo<Deliverable>("deliverables", [
  "id",
  "contract_id",
  "clin",
  "title",
  "description",
  "due_date",
  "frequency",
  "status",
  "submitted_date",
  "accepted_date",
  "notes",
  "created_at",
  "updated_at",
]);

export const surveillanceEvents = createRepo<SurveillanceEvent>("surveillance_events", [
  "id",
  "contract_id",
  "event_date",
  "method",
  "performance_standard",
  "result",
  "findings",
  "corrective_action_required",
  "corrective_action_due_date",
  "follow_up_date",
  "follow_up_status",
  "reported_by",
  "created_at",
  "updated_at",
]);

export const invoices = createRepo<Invoice>("invoices", [
  "id",
  "contract_id",
  "invoice_number",
  "wawf_doc_number",
  "date_received",
  "amount",
  "period_start",
  "period_end",
  "status",
  "reviewed_date",
  "notes",
  "created_at",
  "updated_at",
]);

export const gfpItems = createRepo<GfpItem>("gfp_items", [
  "id",
  "contract_id",
  "item_name",
  "nsn",
  "serial_number",
  "quantity",
  "acquisition_cost",
  "condition",
  "location",
  "date_issued",
  "date_returned",
  "dd_form_number",
  "notes",
  "created_at",
  "updated_at",
]);

export const correspondence = createRepo<Correspondence>("correspondence", [
  "id",
  "contract_id",
  "entry_date",
  "type",
  "with_whom",
  "subject",
  "summary",
  "action_required",
  "follow_up_date",
  "created_at",
  "updated_at",
]);

export const keyPersonnel = createRepo<KeyPersonnel>("key_personnel", [
  "id",
  "contract_id",
  "name",
  "labor_category",
  "clearance_level",
  "clearance_expiration",
  "is_required_key_personnel",
  "start_date",
  "end_date",
  "status",
  "notes",
  "created_at",
  "updated_at",
]);

export const modifications = createRepo<Modification>("modifications", [
  "id",
  "contract_id",
  "mod_number",
  "mod_date",
  "type",
  "description",
  "dollar_change",
  "new_pop_end",
  "new_total_value",
  "created_at",
  "updated_at",
]);

const CONTRACT_ID = "singleton";

export function getCorProfile(): CorProfile {
  const row = db
    .prepare("SELECT * FROM cor_profile WHERE id = $id")
    .get({ $id: CONTRACT_ID }) as unknown as CorProfile | undefined;
  if (row) return row;
  const blank: CorProfile = {
    id: CONTRACT_ID,
    full_name: null,
    rank_grade: null,
    unit: null,
    duty_title: null,
    email: null,
    phone: null,
    dodaac: null,
    cor_level: null,
    appointment_letter_date: null,
    cert_completion_date: null,
    cert_expiration_date: null,
    clc106_date: null,
    ethics_training_date: null,
    ctip_training_date: null,
    supervising_co: null,
    supervising_co_email: null,
    supervising_co_phone: null,
    administrative_co_dcma: null,
    notes: null,
    updated_at: nowIso(),
  };
  db.prepare(
    `INSERT INTO cor_profile (id, updated_at) VALUES ($id, $updated_at)`
  ).run({ $id: CONTRACT_ID, $updated_at: blank.updated_at });
  return blank;
}

export function updateCorProfile(data: Partial<CorProfile>): CorProfile {
  getCorProfile();
  const cols = Object.keys(data).filter((c) => c !== "id" && c !== "updated_at");
  if (cols.length > 0) {
    const setSql = cols.map((c) => `${c} = $${c}`).join(", ") + ", updated_at = $updated_at";
    const values: Record<string, string | number | null> = { $id: CONTRACT_ID, $updated_at: nowIso() };
    for (const c of cols) values[`$${c}`] = (data as Record<string, string | number | null>)[c] ?? null;
    db.prepare(`UPDATE cor_profile SET ${setSql} WHERE id = $id`).run(values);
  }
  return getCorProfile();
}
