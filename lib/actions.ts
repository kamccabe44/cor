"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  contracts,
  deliverables,
  surveillanceEvents,
  invoices,
  gfpItems,
  correspondence,
  keyPersonnel,
  modifications,
  updateCorProfile,
} from "./data";
import { getAwardDetail } from "./usaspending";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function num(fd: FormData, key: string): number {
  const v = fd.get(key);
  if (v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function bool(fd: FormData, key: string): number {
  return fd.get(key) ? 1 : 0;
}

// ---------- Contracts ----------

export async function createContract(fd: FormData) {
  const contract = contracts.create({
    contract_number: str(fd, "contract_number") ?? "",
    task_order_number: str(fd, "task_order_number"),
    title: str(fd, "title") ?? "Untitled Contract",
    vendor_name: str(fd, "vendor_name"),
    cage_code: str(fd, "cage_code"),
    uei: str(fd, "uei"),
    contract_type: str(fd, "contract_type"),
    naics_code: str(fd, "naics_code"),
    psc_code: str(fd, "psc_code"),
    contracting_officer: str(fd, "contracting_officer"),
    contracting_officer_email: str(fd, "contracting_officer_email"),
    aco_office: str(fd, "aco_office"),
    requiring_activity: str(fd, "requiring_activity"),
    pop_start: str(fd, "pop_start"),
    pop_end: str(fd, "pop_end"),
    base_value: num(fd, "base_value"),
    total_value_with_options: num(fd, "total_value_with_options"),
    obligated_amount: num(fd, "obligated_amount"),
    invoiced_amount: num(fd, "invoiced_amount"),
    funding_source: str(fd, "funding_source"),
    place_of_performance: str(fd, "place_of_performance"),
    status: str(fd, "status") ?? "ACTIVE",
    description: str(fd, "description"),
    usaspending_award_id: str(fd, "usaspending_award_id"),
  });
  revalidatePath("/contracts");
  redirect(`/contracts/${contract.id}`);
}

export async function updateContract(id: string, fd: FormData) {
  contracts.update(id, {
    contract_number: str(fd, "contract_number") ?? "",
    task_order_number: str(fd, "task_order_number"),
    title: str(fd, "title") ?? "Untitled Contract",
    vendor_name: str(fd, "vendor_name"),
    cage_code: str(fd, "cage_code"),
    uei: str(fd, "uei"),
    contract_type: str(fd, "contract_type"),
    naics_code: str(fd, "naics_code"),
    psc_code: str(fd, "psc_code"),
    contracting_officer: str(fd, "contracting_officer"),
    contracting_officer_email: str(fd, "contracting_officer_email"),
    aco_office: str(fd, "aco_office"),
    requiring_activity: str(fd, "requiring_activity"),
    pop_start: str(fd, "pop_start"),
    pop_end: str(fd, "pop_end"),
    base_value: num(fd, "base_value"),
    total_value_with_options: num(fd, "total_value_with_options"),
    obligated_amount: num(fd, "obligated_amount"),
    invoiced_amount: num(fd, "invoiced_amount"),
    funding_source: str(fd, "funding_source"),
    place_of_performance: str(fd, "place_of_performance"),
    status: str(fd, "status") ?? "ACTIVE",
    description: str(fd, "description"),
  });
  revalidatePath("/contracts");
  revalidatePath(`/contracts/${id}`);
  redirect(`/contracts/${id}`);
}

export async function deleteContract(id: string) {
  contracts.remove(id);
  revalidatePath("/contracts");
  redirect("/contracts");
}

export async function importAwardAsContract(awardId: string) {
  const detail = await getAwardDetail(awardId);
  const contract = contracts.create({
    contract_number: detail.piid ?? "UNKNOWN",
    title: detail.title ?? detail.piid ?? "Imported Award",
    vendor_name: detail.vendorName,
    uei: detail.uei,
    naics_code: detail.naicsCode,
    psc_code: detail.pscCode,
    pop_start: detail.popStart,
    pop_end: detail.popEnd,
    base_value: detail.baseValue ?? 0,
    total_value_with_options: detail.totalValueWithOptions ?? 0,
    obligated_amount: detail.obligatedAmount ?? 0,
    place_of_performance: detail.placeOfPerformance,
    funding_source: detail.fundingSource,
    requiring_activity: detail.awardingAgency,
    status: "ACTIVE",
    usaspending_award_id: detail.awardId,
  });
  revalidatePath("/contracts");
  redirect(`/contracts/${contract.id}`);
}

// ---------- Deliverables ----------

export async function createDeliverable(contractId: string, fd: FormData) {
  deliverables.create({
    contract_id: contractId,
    clin: str(fd, "clin"),
    title: str(fd, "title") ?? "Deliverable",
    description: str(fd, "description"),
    due_date: str(fd, "due_date"),
    frequency: str(fd, "frequency") ?? "ONE_TIME",
    status: str(fd, "status") ?? "PENDING",
    submitted_date: str(fd, "submitted_date"),
    accepted_date: str(fd, "accepted_date"),
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#deliverables`);
}

export async function updateDeliverable(contractId: string, id: string, fd: FormData) {
  deliverables.update(id, {
    clin: str(fd, "clin"),
    title: str(fd, "title") ?? "Deliverable",
    description: str(fd, "description"),
    due_date: str(fd, "due_date"),
    frequency: str(fd, "frequency") ?? "ONE_TIME",
    status: str(fd, "status") ?? "PENDING",
    submitted_date: str(fd, "submitted_date"),
    accepted_date: str(fd, "accepted_date"),
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#deliverables`);
}

export async function deleteDeliverable(contractId: string, id: string) {
  deliverables.remove(id);
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#deliverables`);
}

// ---------- Surveillance ----------

export async function createSurveillanceEvent(contractId: string, fd: FormData) {
  surveillanceEvents.create({
    contract_id: contractId,
    event_date: str(fd, "event_date") ?? new Date().toISOString().slice(0, 10),
    method: str(fd, "method") ?? "PERIODIC",
    performance_standard: str(fd, "performance_standard"),
    result: str(fd, "result") ?? "SATISFACTORY",
    findings: str(fd, "findings"),
    corrective_action_required: bool(fd, "corrective_action_required"),
    corrective_action_due_date: str(fd, "corrective_action_due_date"),
    follow_up_date: str(fd, "follow_up_date"),
    follow_up_status: str(fd, "follow_up_status"),
    reported_by: str(fd, "reported_by"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#surveillance`);
}

export async function updateSurveillanceEvent(contractId: string, id: string, fd: FormData) {
  surveillanceEvents.update(id, {
    event_date: str(fd, "event_date") ?? new Date().toISOString().slice(0, 10),
    method: str(fd, "method") ?? "PERIODIC",
    performance_standard: str(fd, "performance_standard"),
    result: str(fd, "result") ?? "SATISFACTORY",
    findings: str(fd, "findings"),
    corrective_action_required: bool(fd, "corrective_action_required"),
    corrective_action_due_date: str(fd, "corrective_action_due_date"),
    follow_up_date: str(fd, "follow_up_date"),
    follow_up_status: str(fd, "follow_up_status"),
    reported_by: str(fd, "reported_by"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#surveillance`);
}

export async function deleteSurveillanceEvent(contractId: string, id: string) {
  surveillanceEvents.remove(id);
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#surveillance`);
}

// ---------- Invoices ----------

export async function createInvoice(contractId: string, fd: FormData) {
  invoices.create({
    contract_id: contractId,
    invoice_number: str(fd, "invoice_number"),
    wawf_doc_number: str(fd, "wawf_doc_number"),
    date_received: str(fd, "date_received"),
    amount: num(fd, "amount"),
    period_start: str(fd, "period_start"),
    period_end: str(fd, "period_end"),
    status: str(fd, "status") ?? "PENDING_REVIEW",
    reviewed_date: str(fd, "reviewed_date"),
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#invoices`);
}

export async function updateInvoice(contractId: string, id: string, fd: FormData) {
  invoices.update(id, {
    invoice_number: str(fd, "invoice_number"),
    wawf_doc_number: str(fd, "wawf_doc_number"),
    date_received: str(fd, "date_received"),
    amount: num(fd, "amount"),
    period_start: str(fd, "period_start"),
    period_end: str(fd, "period_end"),
    status: str(fd, "status") ?? "PENDING_REVIEW",
    reviewed_date: str(fd, "reviewed_date"),
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#invoices`);
}

export async function deleteInvoice(contractId: string, id: string) {
  invoices.remove(id);
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#invoices`);
}

// ---------- GFP ----------

export async function createGfpItem(contractId: string, fd: FormData) {
  gfpItems.create({
    contract_id: contractId,
    item_name: str(fd, "item_name") ?? "Item",
    nsn: str(fd, "nsn"),
    serial_number: str(fd, "serial_number"),
    quantity: num(fd, "quantity") || 1,
    acquisition_cost: num(fd, "acquisition_cost"),
    condition: str(fd, "condition") ?? "SERVICEABLE",
    location: str(fd, "location"),
    date_issued: str(fd, "date_issued"),
    date_returned: str(fd, "date_returned"),
    dd_form_number: str(fd, "dd_form_number"),
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#gfp`);
}

export async function updateGfpItem(contractId: string, id: string, fd: FormData) {
  gfpItems.update(id, {
    item_name: str(fd, "item_name") ?? "Item",
    nsn: str(fd, "nsn"),
    serial_number: str(fd, "serial_number"),
    quantity: num(fd, "quantity") || 1,
    acquisition_cost: num(fd, "acquisition_cost"),
    condition: str(fd, "condition") ?? "SERVICEABLE",
    location: str(fd, "location"),
    date_issued: str(fd, "date_issued"),
    date_returned: str(fd, "date_returned"),
    dd_form_number: str(fd, "dd_form_number"),
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#gfp`);
}

export async function deleteGfpItem(contractId: string, id: string) {
  gfpItems.remove(id);
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#gfp`);
}

// ---------- Correspondence ----------

export async function createCorrespondence(contractId: string, fd: FormData) {
  correspondence.create({
    contract_id: contractId,
    entry_date: str(fd, "entry_date") ?? new Date().toISOString().slice(0, 10),
    type: str(fd, "type") ?? "EMAIL",
    with_whom: str(fd, "with_whom"),
    subject: str(fd, "subject"),
    summary: str(fd, "summary"),
    action_required: bool(fd, "action_required"),
    follow_up_date: str(fd, "follow_up_date"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#correspondence`);
}

export async function updateCorrespondence(contractId: string, id: string, fd: FormData) {
  correspondence.update(id, {
    entry_date: str(fd, "entry_date") ?? new Date().toISOString().slice(0, 10),
    type: str(fd, "type") ?? "EMAIL",
    with_whom: str(fd, "with_whom"),
    subject: str(fd, "subject"),
    summary: str(fd, "summary"),
    action_required: bool(fd, "action_required"),
    follow_up_date: str(fd, "follow_up_date"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#correspondence`);
}

export async function deleteCorrespondence(contractId: string, id: string) {
  correspondence.remove(id);
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#correspondence`);
}

// ---------- Key Personnel ----------

export async function createKeyPersonnel(contractId: string, fd: FormData) {
  keyPersonnel.create({
    contract_id: contractId,
    name: str(fd, "name") ?? "Unnamed",
    labor_category: str(fd, "labor_category"),
    clearance_level: str(fd, "clearance_level"),
    clearance_expiration: str(fd, "clearance_expiration"),
    is_required_key_personnel: bool(fd, "is_required_key_personnel"),
    start_date: str(fd, "start_date"),
    end_date: str(fd, "end_date"),
    status: str(fd, "status") ?? "ACTIVE",
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#personnel`);
}

export async function updateKeyPersonnel(contractId: string, id: string, fd: FormData) {
  keyPersonnel.update(id, {
    name: str(fd, "name") ?? "Unnamed",
    labor_category: str(fd, "labor_category"),
    clearance_level: str(fd, "clearance_level"),
    clearance_expiration: str(fd, "clearance_expiration"),
    is_required_key_personnel: bool(fd, "is_required_key_personnel"),
    start_date: str(fd, "start_date"),
    end_date: str(fd, "end_date"),
    status: str(fd, "status") ?? "ACTIVE",
    notes: str(fd, "notes"),
  });
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#personnel`);
}

export async function deleteKeyPersonnel(contractId: string, id: string) {
  keyPersonnel.remove(id);
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#personnel`);
}

// ---------- Modifications ----------

export async function createModification(contractId: string, fd: FormData) {
  const dollarChange = num(fd, "dollar_change");
  modifications.create({
    contract_id: contractId,
    mod_number: str(fd, "mod_number") ?? "",
    mod_date: str(fd, "mod_date"),
    type: str(fd, "type") ?? "ADMIN",
    description: str(fd, "description"),
    dollar_change: dollarChange,
    new_pop_end: str(fd, "new_pop_end"),
    new_total_value: fd.get("new_total_value") ? num(fd, "new_total_value") : null,
  });

  const contract = contracts.get(contractId);
  if (contract) {
    const updates: Record<string, string | number | null> = {};
    if (dollarChange) {
      updates.obligated_amount = contract.obligated_amount + dollarChange;
    }
    const newPopEnd = str(fd, "new_pop_end");
    if (newPopEnd) updates.pop_end = newPopEnd;
    const newTotal = fd.get("new_total_value") ? num(fd, "new_total_value") : null;
    if (newTotal !== null) updates.total_value_with_options = newTotal;
    if (Object.keys(updates).length > 0) contracts.update(contractId, updates);
  }

  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#modifications`);
}

export async function deleteModification(contractId: string, id: string) {
  modifications.remove(id);
  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}#modifications`);
}

// ---------- COR Profile ----------

export async function saveCorProfile(fd: FormData) {
  updateCorProfile({
    full_name: str(fd, "full_name"),
    rank_grade: str(fd, "rank_grade"),
    unit: str(fd, "unit"),
    duty_title: str(fd, "duty_title"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    dodaac: str(fd, "dodaac"),
    cor_level: str(fd, "cor_level"),
    appointment_letter_date: str(fd, "appointment_letter_date"),
    cert_completion_date: str(fd, "cert_completion_date"),
    cert_expiration_date: str(fd, "cert_expiration_date"),
    clc106_date: str(fd, "clc106_date"),
    ethics_training_date: str(fd, "ethics_training_date"),
    ctip_training_date: str(fd, "ctip_training_date"),
    supervising_co: str(fd, "supervising_co"),
    supervising_co_email: str(fd, "supervising_co_email"),
    supervising_co_phone: str(fd, "supervising_co_phone"),
    administrative_co_dcma: str(fd, "administrative_co_dcma"),
    notes: str(fd, "notes"),
  });
  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile");
}
