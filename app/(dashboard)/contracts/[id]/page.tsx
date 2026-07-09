import Link from "next/link";
import { notFound } from "next/navigation";
import {
  contracts as contractsRepo,
  deliverables as deliverablesRepo,
  surveillanceEvents as surveillanceRepo,
  invoices as invoicesRepo,
  gfpItems as gfpRepo,
  correspondence as correspondenceRepo,
  keyPersonnel as personnelRepo,
  modifications as modificationsRepo,
} from "@/lib/data";
import {
  createDeliverable,
  deleteDeliverable,
  createSurveillanceEvent,
  deleteSurveillanceEvent,
  createInvoice,
  deleteInvoice,
  createGfpItem,
  deleteGfpItem,
  createCorrespondence,
  deleteCorrespondence,
  createKeyPersonnel,
  deleteKeyPersonnel,
  createModification,
  deleteModification,
} from "@/lib/actions";
import Badge from "@/components/Badge";
import Section from "@/components/Section";
import ConfirmButton from "@/components/ConfirmButton";
import { Field, TextAreaField, SelectField, CheckboxField, FormGrid, SubmitButton } from "@/components/Field";
import { fmtCurrency, fmtDate } from "@/lib/format";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = contractsRepo.get(id);
  if (!contract) notFound();

  const deliverables = deliverablesRepo.listByContract(id, "due_date ASC");
  const events = surveillanceRepo.listByContract(id, "event_date DESC");
  const invoices = invoicesRepo.listByContract(id, "date_received DESC");
  const gfp = gfpRepo.listByContract(id);
  const corr = correspondenceRepo.listByContract(id, "entry_date DESC");
  const personnel = personnelRepo.listByContract(id);
  const mods = modificationsRepo.listByContract(id, "mod_date DESC");

  const utilizationPct =
    contract.obligated_amount > 0 ? Math.round((contract.invoiced_amount / contract.obligated_amount) * 1000) / 10 : 0;

  const addDeliverable = createDeliverable.bind(null, id);
  const addSurveillance = createSurveillanceEvent.bind(null, id);
  const addInvoice = createInvoice.bind(null, id);
  const addGfp = createGfpItem.bind(null, id);
  const addCorrespondence = createCorrespondence.bind(null, id);
  const addPersonnel = createKeyPersonnel.bind(null, id);
  const addModification = createModification.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{contract.title}</h1>
            <Badge value={contract.status} />
          </div>
          <p className="text-sm text-slate-500">
            {contract.contract_number}
            {contract.task_order_number && ` · TO ${contract.task_order_number}`} · {contract.vendor_name ?? "No vendor on file"}
          </p>
        </div>
        <Link href={`/contracts/${id}/edit`} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Edit Contract
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryStat label="Obligated" value={fmtCurrency(contract.obligated_amount)} />
        <SummaryStat label="Invoiced" value={fmtCurrency(contract.invoiced_amount)} />
        <SummaryStat label="Utilization" value={`${utilizationPct}%`} warn={utilizationPct >= 85} />
        <SummaryStat label="PoP End" value={fmtDate(contract.pop_end)} />
      </div>

      <div className="card grid grid-cols-1 gap-x-6 gap-y-2 p-4 text-sm md:grid-cols-3">
        <Detail label="Contracting Officer" value={contract.contracting_officer} />
        <Detail label="ACO / DCMA Office" value={contract.aco_office} />
        <Detail label="Requiring Activity" value={contract.requiring_activity} />
        <Detail label="Contract Type" value={contract.contract_type} />
        <Detail label="NAICS" value={contract.naics_code} />
        <Detail label="PSC" value={contract.psc_code} />
        <Detail label="CAGE" value={contract.cage_code} />
        <Detail label="UEI" value={contract.uei} />
        <Detail label="Place of Performance" value={contract.place_of_performance} />
        <Detail label="Funding Source" value={contract.funding_source} />
        <Detail label="PoP Start" value={fmtDate(contract.pop_start)} />
        <Detail label="Base Value" value={fmtCurrency(contract.base_value)} />
        <Detail label="Total w/ Options" value={fmtCurrency(contract.total_value_with_options)} />
        {contract.usaspending_award_id && (
          <Detail label="USASpending Award ID" value={contract.usaspending_award_id} />
        )}
        {contract.description && (
          <div className="md:col-span-3">
            <div className="text-xs font-medium uppercase text-slate-500">Description</div>
            <div className="text-slate-800">{contract.description}</div>
          </div>
        )}
      </div>

      <nav className="flex flex-wrap gap-2 text-xs">
        {[
          ["#deliverables", "Deliverables"],
          ["#surveillance", "QASP / Surveillance"],
          ["#invoices", "Invoices / WAWF"],
          ["#gfp", "Gov't Furnished Property"],
          ["#correspondence", "Correspondence"],
          ["#personnel", "Key Personnel"],
          ["#modifications", "Modifications"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-600 hover:bg-slate-100">
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="deliverables"
        title="Deliverables (CDRL)"
        count={deliverables.length}
        addForm={
          <form action={addDeliverable} className="flex flex-col gap-3">
            <FormGrid>
              <Field label="CLIN" name="clin" />
              <Field label="Title" name="title" required />
              <Field label="Due Date" name="due_date" type="date" />
              <SelectField label="Frequency" name="frequency" options={["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"]} />
              <SelectField label="Status" name="status" options={["PENDING", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"]} />
              <TextAreaField label="Description" name="description" />
            </FormGrid>
            <SubmitButton>Add Deliverable</SubmitButton>
          </form>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>CLIN</th>
              <th>Title</th>
              <th>Due</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d) => {
              const del = deleteDeliverable.bind(null, id, d.id);
              return (
                <tr key={d.id}>
                  <td>{d.clin ?? "—"}</td>
                  <td>
                    <div className="font-medium">{d.title}</div>
                    {d.description && <div className="text-xs text-slate-500">{d.description}</div>}
                  </td>
                  <td>{fmtDate(d.due_date)}</td>
                  <td>
                    <Badge value={d.status} />
                  </td>
                  <td className="max-w-xs truncate">{d.notes ?? "—"}</td>
                  <td>
                    <form action={del}>
                      <ConfirmButton className="text-xs text-red-600 hover:underline" message="Delete this deliverable?">
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {deliverables.length === 0 && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </Section>

      <Section
        id="surveillance"
        title="QASP / Surveillance Log"
        count={events.length}
        addForm={
          <form action={addSurveillance} className="flex flex-col gap-3">
            <FormGrid>
              <Field label="Event Date" name="event_date" type="date" required />
              <SelectField
                label="Surveillance Method"
                name="method"
                options={["100_PERCENT", "RANDOM_SAMPLE", "PERIODIC", "CUSTOMER_COMPLAINT"]}
              />
              <Field label="Performance Standard" name="performance_standard" />
              <SelectField label="Result" name="result" options={["SATISFACTORY", "UNSATISFACTORY"]} />
              <Field label="Reported By" name="reported_by" />
              <CheckboxField label="Corrective action required" name="corrective_action_required" />
              <Field label="Corrective Action Due" name="corrective_action_due_date" type="date" />
              <Field label="Follow-up Date" name="follow_up_date" type="date" />
              <SelectField label="Follow-up Status" name="follow_up_status" options={["OPEN", "CLOSED"]} />
              <TextAreaField label="Findings" name="findings" />
            </FormGrid>
            <SubmitButton>Log Surveillance Event</SubmitButton>
          </form>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Result</th>
              <th>Findings</th>
              <th>Corrective Action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((s) => {
              const del = deleteSurveillanceEvent.bind(null, id, s.id);
              return (
                <tr key={s.id}>
                  <td>{fmtDate(s.event_date)}</td>
                  <td>{s.method.replaceAll("_", " ")}</td>
                  <td>
                    <Badge value={s.result} />
                  </td>
                  <td className="max-w-xs truncate">{s.findings ?? "—"}</td>
                  <td>
                    {s.corrective_action_required ? (
                      <span className="text-xs">
                        Due {fmtDate(s.corrective_action_due_date)} &middot; {s.follow_up_status ?? "OPEN"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <form action={del}>
                      <ConfirmButton className="text-xs text-red-600 hover:underline" message="Delete this surveillance entry?">
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </Section>

      <Section
        id="invoices"
        title="Invoices / WAWF Receiving Reports"
        count={invoices.length}
        addForm={
          <form action={addInvoice} className="flex flex-col gap-3">
            <FormGrid>
              <Field label="Invoice Number" name="invoice_number" />
              <Field label="WAWF Document Number" name="wawf_doc_number" />
              <Field label="Date Received" name="date_received" type="date" />
              <Field label="Amount ($)" name="amount" type="number" step="0.01" />
              <Field label="Period Start" name="period_start" type="date" />
              <Field label="Period End" name="period_end" type="date" />
              <SelectField label="Status" name="status" options={["PENDING_REVIEW", "APPROVED", "REJECTED", "DISPUTED", "PAID"]} />
              <Field label="Reviewed Date" name="reviewed_date" type="date" />
              <TextAreaField label="Notes" name="notes" />
            </FormGrid>
            <SubmitButton>Add Invoice</SubmitButton>
          </form>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>WAWF Doc #</th>
              <th>Received</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const del = deleteInvoice.bind(null, id, i.id);
              return (
                <tr key={i.id}>
                  <td>{i.invoice_number ?? "—"}</td>
                  <td>{i.wawf_doc_number ?? "—"}</td>
                  <td>{fmtDate(i.date_received)}</td>
                  <td>{fmtCurrency(i.amount)}</td>
                  <td>
                    <Badge value={i.status} />
                  </td>
                  <td>
                    <form action={del}>
                      <ConfirmButton className="text-xs text-red-600 hover:underline" message="Delete this invoice?">
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </Section>

      <Section
        id="gfp"
        title="Government Furnished Property"
        count={gfp.length}
        addForm={
          <form action={addGfp} className="flex flex-col gap-3">
            <FormGrid>
              <Field label="Item Name" name="item_name" required />
              <Field label="NSN" name="nsn" />
              <Field label="Serial Number" name="serial_number" />
              <Field label="Quantity" name="quantity" type="number" defaultValue={1} />
              <Field label="Acquisition Cost ($)" name="acquisition_cost" type="number" step="0.01" />
              <SelectField label="Condition" name="condition" options={["SERVICEABLE", "UNSERVICEABLE", "REPAIR_NEEDED"]} />
              <Field label="Location" name="location" />
              <Field label="DD Form Number" name="dd_form_number" />
              <Field label="Date Issued" name="date_issued" type="date" />
              <Field label="Date Returned" name="date_returned" type="date" />
              <TextAreaField label="Notes" name="notes" />
            </FormGrid>
            <SubmitButton>Add GFP Item</SubmitButton>
          </form>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Serial / NSN</th>
              <th>Qty</th>
              <th>Condition</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gfp.map((g) => {
              const del = deleteGfpItem.bind(null, id, g.id);
              return (
                <tr key={g.id}>
                  <td>{g.item_name}</td>
                  <td>
                    {g.serial_number ?? "—"}
                    {g.nsn && <div className="text-xs text-slate-500">NSN {g.nsn}</div>}
                  </td>
                  <td>{g.quantity}</td>
                  <td>
                    <Badge value={g.condition} />
                  </td>
                  <td>{g.location ?? "—"}</td>
                  <td>
                    <form action={del}>
                      <ConfirmButton className="text-xs text-red-600 hover:underline" message="Delete this GFP record?">
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {gfp.length === 0 && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </Section>

      <Section
        id="correspondence"
        title="Correspondence Log"
        count={corr.length}
        addForm={
          <form action={addCorrespondence} className="flex flex-col gap-3">
            <FormGrid>
              <Field label="Date" name="entry_date" type="date" required />
              <SelectField label="Type" name="type" options={["EMAIL", "PHONE", "MEETING", "SITE_VISIT", "LETTER"]} />
              <Field label="With Whom" name="with_whom" />
              <Field label="Subject" name="subject" />
              <CheckboxField label="Follow-up action required" name="action_required" />
              <Field label="Follow-up Date" name="follow_up_date" type="date" />
              <TextAreaField label="Summary" name="summary" />
            </FormGrid>
            <SubmitButton>Log Correspondence</SubmitButton>
          </form>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>With</th>
              <th>Subject</th>
              <th>Follow-up</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {corr.map((c) => {
              const del = deleteCorrespondence.bind(null, id, c.id);
              return (
                <tr key={c.id}>
                  <td>{fmtDate(c.entry_date)}</td>
                  <td>{c.type.replaceAll("_", " ")}</td>
                  <td>{c.with_whom ?? "—"}</td>
                  <td className="max-w-xs truncate">{c.subject ?? "—"}</td>
                  <td>{c.action_required ? fmtDate(c.follow_up_date) : "—"}</td>
                  <td>
                    <form action={del}>
                      <ConfirmButton className="text-xs text-red-600 hover:underline" message="Delete this correspondence entry?">
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {corr.length === 0 && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </Section>

      <Section
        id="personnel"
        title="Key Personnel"
        count={personnel.length}
        addForm={
          <form action={addPersonnel} className="flex flex-col gap-3">
            <FormGrid>
              <Field label="Name" name="name" required />
              <Field label="Labor Category" name="labor_category" />
              <Field label="Clearance Level" name="clearance_level" />
              <Field label="Clearance Expiration" name="clearance_expiration" type="date" />
              <CheckboxField label="Contractually required key personnel" name="is_required_key_personnel" />
              <SelectField label="Status" name="status" options={["ACTIVE", "PENDING", "DEPARTED"]} />
              <Field label="Start Date" name="start_date" type="date" />
              <Field label="End Date" name="end_date" type="date" />
              <TextAreaField label="Notes" name="notes" />
            </FormGrid>
            <SubmitButton>Add Personnel</SubmitButton>
          </form>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Labor Category</th>
              <th>Clearance</th>
              <th>Status</th>
              <th>Key Personnel</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personnel.map((p) => {
              const del = deleteKeyPersonnel.bind(null, id, p.id);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.labor_category ?? "—"}</td>
                  <td>
                    {p.clearance_level ?? "—"}
                    {p.clearance_expiration && <div className="text-xs text-slate-500">exp {fmtDate(p.clearance_expiration)}</div>}
                  </td>
                  <td>
                    <Badge value={p.status} />
                  </td>
                  <td>{p.is_required_key_personnel ? "Yes" : "No"}</td>
                  <td>
                    <form action={del}>
                      <ConfirmButton className="text-xs text-red-600 hover:underline" message="Delete this personnel record?">
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {personnel.length === 0 && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </Section>

      <Section
        id="modifications"
        title="Modifications"
        count={mods.length}
        addForm={
          <form action={addModification} className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">
              Adding a modification with a dollar change or new PoP end / total value will automatically update
              this contract&apos;s obligated amount, PoP end, and/or total value.
            </p>
            <FormGrid>
              <Field label="Mod Number" name="mod_number" required />
              <Field label="Mod Date" name="mod_date" type="date" />
              <SelectField label="Type" name="type" options={["ADMIN", "FUNDING", "SCOPE", "POP_EXTENSION", "OTHER"]} />
              <Field label="Dollar Change ($, +/-)" name="dollar_change" type="number" step="0.01" />
              <Field label="New PoP End (if changed)" name="new_pop_end" type="date" />
              <Field label="New Total Value (if changed)" name="new_total_value" type="number" step="0.01" />
              <TextAreaField label="Description" name="description" />
            </FormGrid>
            <SubmitButton>Add Modification</SubmitButton>
          </form>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Mod #</th>
              <th>Date</th>
              <th>Type</th>
              <th>$ Change</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mods.map((m) => {
              const del = deleteModification.bind(null, id, m.id);
              return (
                <tr key={m.id}>
                  <td>{m.mod_number}</td>
                  <td>{fmtDate(m.mod_date)}</td>
                  <td>{m.type.replaceAll("_", " ")}</td>
                  <td>{m.dollar_change ? fmtCurrency(m.dollar_change) : "—"}</td>
                  <td className="max-w-xs truncate">{m.description ?? "—"}</td>
                  <td>
                    <form action={del}>
                      <ConfirmButton className="text-xs text-red-600 hover:underline" message="Delete this modification record? This will not automatically reverse any contract totals it changed.">
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {mods.length === 0 && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function SummaryStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${warn ? "text-red-700" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="text-slate-800">{value || "—"}</div>
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-4 text-center text-slate-400">
        No entries yet.
      </td>
    </tr>
  );
}
