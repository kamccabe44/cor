import { Field, TextAreaField, SelectField, FormGrid, SubmitButton } from "@/components/Field";
import type { Contract } from "@/lib/types";

const CONTRACT_TYPES = [
  "FFP",
  "FFP-LOE",
  "CPFF",
  "CPIF",
  "CPAF",
  "T&M",
  "LABOR_HOUR",
  "IDIQ_TASK_ORDER",
  "BPA_CALL",
  "OTHER",
];

const STATUSES = ["ACTIVE", "OPTION_PENDING", "CLOSEOUT", "EXPIRED", "TERMINATED"];

export default function ContractForm({
  action,
  contract,
  submitLabel,
}: {
  action: (fd: FormData) => void;
  contract?: Contract;
  submitLabel: string;
}) {
  return (
    <form action={action} className="card flex flex-col gap-6 p-6">
      <FormGrid>
        <Field label="Contract Number (PIID)" name="contract_number" defaultValue={contract?.contract_number} required />
        <Field label="Task/Delivery Order Number" name="task_order_number" defaultValue={contract?.task_order_number} />
        <div className="md:col-span-2">
          <Field label="Title / Requirement" name="title" defaultValue={contract?.title} required />
        </div>
        <Field label="Vendor / Contractor Name" name="vendor_name" defaultValue={contract?.vendor_name} />
        <Field label="CAGE Code" name="cage_code" defaultValue={contract?.cage_code} />
        <Field label="Unique Entity ID (UEI)" name="uei" defaultValue={contract?.uei} />
        <SelectField label="Contract Type" name="contract_type" defaultValue={contract?.contract_type} options={CONTRACT_TYPES} />
        <Field label="NAICS Code" name="naics_code" defaultValue={contract?.naics_code} />
        <Field label="PSC Code" name="psc_code" defaultValue={contract?.psc_code} />
        <SelectField label="Status" name="status" defaultValue={contract?.status} options={STATUSES} />
        <Field label="Contracting Officer (KO)" name="contracting_officer" defaultValue={contract?.contracting_officer} />
        <Field label="KO Email" name="contracting_officer_email" type="email" defaultValue={contract?.contracting_officer_email} />
        <Field label="Administrative CO / DCMA Office" name="aco_office" defaultValue={contract?.aco_office} />
        <Field label="Requiring Activity / Unit" name="requiring_activity" defaultValue={contract?.requiring_activity} />
        <Field label="Period of Performance Start" name="pop_start" type="date" defaultValue={contract?.pop_start} />
        <Field label="Period of Performance End" name="pop_end" type="date" defaultValue={contract?.pop_end} />
        <Field label="Base Value ($)" name="base_value" type="number" step="0.01" defaultValue={contract?.base_value} />
        <Field label="Total Value w/ Options ($)" name="total_value_with_options" type="number" step="0.01" defaultValue={contract?.total_value_with_options} />
        <Field label="Obligated Amount ($)" name="obligated_amount" type="number" step="0.01" defaultValue={contract?.obligated_amount} />
        <Field label="Invoiced-to-Date ($)" name="invoiced_amount" type="number" step="0.01" defaultValue={contract?.invoiced_amount} />
        <Field label="Funding Source (appropriation)" name="funding_source" defaultValue={contract?.funding_source} />
        <Field label="Place of Performance" name="place_of_performance" defaultValue={contract?.place_of_performance} />
        <TextAreaField label="Description / Scope" name="description" defaultValue={contract?.description} rows={4} />
      </FormGrid>
      <input type="hidden" name="usaspending_award_id" defaultValue={contract?.usaspending_award_id ?? ""} />
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
