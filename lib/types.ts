export type ContractStatus =
  | "ACTIVE"
  | "OPTION_PENDING"
  | "CLOSEOUT"
  | "EXPIRED"
  | "TERMINATED";

export interface Contract {
  id: string;
  contract_number: string;
  task_order_number: string | null;
  title: string;
  vendor_name: string | null;
  cage_code: string | null;
  uei: string | null;
  contract_type: string | null;
  naics_code: string | null;
  psc_code: string | null;
  contracting_officer: string | null;
  contracting_officer_email: string | null;
  aco_office: string | null;
  requiring_activity: string | null;
  pop_start: string | null;
  pop_end: string | null;
  base_value: number;
  total_value_with_options: number;
  obligated_amount: number;
  invoiced_amount: number;
  funding_source: string | null;
  place_of_performance: string | null;
  status: ContractStatus;
  description: string | null;
  usaspending_award_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliverableStatus =
  | "PENDING"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "REJECTED";

export interface Deliverable {
  id: string;
  contract_id: string;
  clin: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  frequency: string;
  status: DeliverableStatus;
  submitted_date: string | null;
  accepted_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SurveillanceResult = "SATISFACTORY" | "UNSATISFACTORY";

export interface SurveillanceEvent {
  id: string;
  contract_id: string;
  event_date: string;
  method: string;
  performance_standard: string | null;
  result: SurveillanceResult;
  findings: string | null;
  corrective_action_required: number;
  corrective_action_due_date: string | null;
  follow_up_date: string | null;
  follow_up_status: string | null;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "DISPUTED"
  | "PAID";

export interface Invoice {
  id: string;
  contract_id: string;
  invoice_number: string | null;
  wawf_doc_number: string | null;
  date_received: string | null;
  amount: number;
  period_start: string | null;
  period_end: string | null;
  status: InvoiceStatus;
  reviewed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GfpItem {
  id: string;
  contract_id: string;
  item_name: string;
  nsn: string | null;
  serial_number: string | null;
  quantity: number;
  acquisition_cost: number;
  condition: string;
  location: string | null;
  date_issued: string | null;
  date_returned: string | null;
  dd_form_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Correspondence {
  id: string;
  contract_id: string;
  entry_date: string;
  type: string;
  with_whom: string | null;
  subject: string | null;
  summary: string | null;
  action_required: number;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface KeyPersonnel {
  id: string;
  contract_id: string;
  name: string;
  labor_category: string | null;
  clearance_level: string | null;
  clearance_expiration: string | null;
  is_required_key_personnel: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Modification {
  id: string;
  contract_id: string;
  mod_number: string;
  mod_date: string | null;
  type: string;
  description: string | null;
  dollar_change: number;
  new_pop_end: string | null;
  new_total_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface CorProfile {
  id: string;
  full_name: string | null;
  rank_grade: string | null;
  unit: string | null;
  duty_title: string | null;
  email: string | null;
  phone: string | null;
  dodaac: string | null;
  cor_level: string | null;
  appointment_letter_date: string | null;
  cert_completion_date: string | null;
  cert_expiration_date: string | null;
  clc106_date: string | null;
  ethics_training_date: string | null;
  ctip_training_date: string | null;
  supervising_co: string | null;
  supervising_co_email: string | null;
  supervising_co_phone: string | null;
  administrative_co_dcma: string | null;
  notes: string | null;
  updated_at: string;
}
