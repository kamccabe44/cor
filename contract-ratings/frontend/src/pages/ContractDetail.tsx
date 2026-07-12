import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Contract, type Contractor } from "../api";
import { StarRatingDisplay, StarRatingInput } from "../components/StarRating";
import { UsersIcon } from "../components/Icons";

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.85rem" }}>
      <span className="meta">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: "0.4rem" }}>
      <span className="meta">{label}: </span>
      {value}
    </div>
  );
}

// --- Contract-level edit form ---

function ContractEditForm({ contract, onSaved }: { contract: Contract; onSaved: (c: Contract) => void }) {
  const [form, setForm] = useState({
    title: contract.title,
    pwsLink: contract.pwsLink,
    contractStart: contract.contractStart,
    contractEnd: contract.contractEnd,
    milestone30: contract.milestone30,
    milestone60: contract.milestone60,
    milestone90: contract.milestone90,
    milestone120: contract.milestone120,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateContract(contract.id, form);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
      <Labeled label="Title">
        <input value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </Labeled>
      <Labeled label="PWS link">
        <input value={form.pwsLink} onChange={(e) => set("pwsLink", e.target.value)} placeholder="https://…" />
      </Labeled>
      <Labeled label="Contract start">
        <input type="date" value={form.contractStart} onChange={(e) => set("contractStart", e.target.value)} />
      </Labeled>
      <Labeled label="Contract end">
        <input type="date" value={form.contractEnd} onChange={(e) => set("contractEnd", e.target.value)} />
      </Labeled>
      <Labeled label="30 day out milestone">
        <textarea rows={2} value={form.milestone30} onChange={(e) => set("milestone30", e.target.value)} />
      </Labeled>
      <Labeled label="60 day out milestone">
        <textarea rows={2} value={form.milestone60} onChange={(e) => set("milestone60", e.target.value)} />
      </Labeled>
      <Labeled label="90 day out milestone">
        <textarea rows={2} value={form.milestone90} onChange={(e) => set("milestone90", e.target.value)} />
      </Labeled>
      <Labeled label="120 day out milestone">
        <textarea rows={2} value={form.milestone120} onChange={(e) => set("milestone120", e.target.value)} />
      </Labeled>
      {error && (
        <p className="error-banner" style={{ gridColumn: "1 / -1" }}>
          {error}
        </p>
      )}
      <div style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save contract details"}
        </button>
      </div>
    </form>
  );
}

// --- One contractor card ---

const EMPTY_CONTRACTOR = {
  company: "",
  poc: "",
  pocPhone: "",
  pocEmail: "",
  lead: "",
  leadPhone: "",
  leadEmail: "",
  alternatePoc: "",
  alternatePocPhone: "",
  alternatePocEmail: "",
  pocInDate: "",
  pocOutDate: "",
};

function ContractorFields({
  form,
  set,
}: {
  form: typeof EMPTY_CONTRACTOR;
  set: (key: keyof typeof EMPTY_CONTRACTOR, value: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "1fr 1fr 1fr" }}>
      <Labeled label="Company *">
        <input value={form.company} onChange={(e) => set("company", e.target.value)} required />
      </Labeled>
      <Labeled label="POC">
        <input value={form.poc} onChange={(e) => set("poc", e.target.value)} />
      </Labeled>
      <Labeled label="Alternate POC">
        <input value={form.alternatePoc} onChange={(e) => set("alternatePoc", e.target.value)} />
      </Labeled>
      <Labeled label="POC number">
        <input value={form.pocPhone} onChange={(e) => set("pocPhone", e.target.value)} />
      </Labeled>
      <Labeled label="POC email">
        <input value={form.pocEmail} onChange={(e) => set("pocEmail", e.target.value)} />
      </Labeled>
      <Labeled label="Alternate POC email">
        <input value={form.alternatePocEmail} onChange={(e) => set("alternatePocEmail", e.target.value)} />
      </Labeled>
      <Labeled label="Lead">
        <input value={form.lead} onChange={(e) => set("lead", e.target.value)} />
      </Labeled>
      <Labeled label="Lead number">
        <input value={form.leadPhone} onChange={(e) => set("leadPhone", e.target.value)} />
      </Labeled>
      <Labeled label="Lead email">
        <input value={form.leadEmail} onChange={(e) => set("leadEmail", e.target.value)} />
      </Labeled>
      <Labeled label="Alternate POC number">
        <input value={form.alternatePocPhone} onChange={(e) => set("alternatePocPhone", e.target.value)} />
      </Labeled>
      <Labeled label="POC in date">
        <input type="date" value={form.pocInDate} onChange={(e) => set("pocInDate", e.target.value)} />
      </Labeled>
      <Labeled label="POC out date">
        <input type="date" value={form.pocOutDate} onChange={(e) => set("pocOutDate", e.target.value)} />
      </Labeled>
    </div>
  );
}

function ContractorCard({ contractor, onChanged }: { contractor: Contractor; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company: contractor.company,
    poc: contractor.poc,
    pocPhone: contractor.pocPhone,
    pocEmail: contractor.pocEmail,
    lead: contractor.lead,
    leadPhone: contractor.leadPhone,
    leadEmail: contractor.leadEmail,
    alternatePoc: contractor.alternatePoc,
    alternatePocPhone: contractor.alternatePocPhone,
    alternatePocEmail: contractor.alternatePocEmail,
    pocInDate: contractor.pocInDate,
    pocOutDate: contractor.pocOutDate,
  });
  const [avg, setAvg] = useState(contractor.avgRating);
  const [count, setCount] = useState(contractor.ratingCount);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.updateContractor(contractor.id, form);
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function remove() {
    if (!confirm(`Remove ${contractor.company} from this contract?`)) return;
    await api.deleteContractor(contractor.id);
    onChanged();
  }

  return (
    <div className="card" style={{ padding: "1rem", marginBottom: "0.75rem" }}>
      {editing ? (
        <form onSubmit={save}>
          <ContractorFields form={form} set={set} />
          {error && <p className="error-banner" style={{ marginTop: "0.75rem" }}>{error}</p>}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>{contractor.company}</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn btn-outline" onClick={remove}>
                Remove
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
            <Detail label="POC" value={contractor.poc} />
            <Detail label="Lead" value={contractor.lead} />
            <Detail label="POC number" value={contractor.pocPhone} />
            <Detail label="Lead number" value={contractor.leadPhone} />
            <Detail label="POC email" value={contractor.pocEmail} />
            <Detail label="Lead email" value={contractor.leadEmail} />
            <Detail label="Alternate POC" value={contractor.alternatePoc} />
            <Detail label="Alt POC email" value={contractor.alternatePocEmail} />
            <Detail label="POC in date" value={contractor.pocInDate} />
            <Detail label="POC out date" value={contractor.pocOutDate} />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <StarRatingDisplay avg={avg} count={count} />
            <div className="meta" style={{ margin: "0.5rem 0 0.25rem" }}>
              Your rating:
            </div>
            <StarRatingInput
              initial={contractor.myRating?.stars ?? 0}
              onSubmit={async (stars) => {
                const res = await api.rateContractor(contractor.id, stars);
                setAvg(res.avgRating);
                setCount(res.ratingCount);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function AddContractorForm({ contractId, onAdded }: { contractId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_CONTRACTOR });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof EMPTY_CONTRACTOR, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createContractor(contractId, form);
      setForm({ ...EMPTY_CONTRACTOR });
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contractor");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Add Contractor
      </button>
    );
  }

  return (
    <div className="card" style={{ padding: "1rem" }}>
      <form onSubmit={onSubmit}>
        <ContractorFields form={form} set={set} />
        {error && <p className="error-banner" style={{ marginTop: "0.75rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add contractor"}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Page ---

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [editingContract, setEditingContract] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadContractors() {
    if (!id) return;
    api
      .listContractorsForContract(id)
      .then((res) => setContractors(res.items.sort((a, b) => a.company.localeCompare(b.company))))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    if (!id) return;
    api.getContract(id).then(setContract).catch((err) => setError(err.message));
    loadContractors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="error-banner">{error}</p>;
  if (!contract) return <p className="empty-state">Loading…</p>;

  return (
    <div>
      <p>
        <Link to="/contracts">&larr; Contracts</Link>
      </p>
      <h1>
        {contract.contractNumber} — {contract.title}
      </h1>

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Contract details</h2>
          <button className="btn btn-outline" onClick={() => setEditingContract((v) => !v)}>
            {editingContract ? "Cancel" : "Edit"}
          </button>
        </div>

        {editingContract ? (
          <ContractEditForm
            contract={contract}
            onSaved={(c) => {
              setContract(c);
              setEditingContract(false);
            }}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
            <Detail
              label="PWS"
              value={
                contract.pwsLink ? (
                  <a href={contract.pwsLink} target="_blank" rel="noreferrer">
                    {contract.pwsLink}
                  </a>
                ) : null
              }
            />
            <Detail label="Period" value={contract.contractStart || contract.contractEnd ? `${contract.contractStart || "—"} → ${contract.contractEnd || "—"}` : null} />
            <Detail label="30 day out" value={contract.milestone30} />
            <Detail label="60 day out" value={contract.milestone60} />
            <Detail label="90 day out" value={contract.milestone90} />
            <Detail label="120 day out" value={contract.milestone120} />
          </div>
        )}

        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--slate-200)" }}>
          <StarRatingDisplay avg={contract.avgRating} count={contract.ratingCount} />
          <div className="meta" style={{ margin: "0.5rem 0 0.25rem" }}>
            Your rating of this contract:
          </div>
          <StarRatingInput
            initial={contract.myRating?.stars ?? 0}
            onSubmit={async (stars) => {
              const res = await api.rateContract(id!, stars);
              setContract((c) => (c ? { ...c, avgRating: res.avgRating, ratingCount: res.ratingCount } : c));
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <UsersIcon style={{ width: "1.3rem", height: "1.3rem", color: "var(--olive-700)" }} />
        <h2 style={{ margin: 0 }}>Contractors on this contract</h2>
      </div>

      {contractors.length === 0 && <p className="empty-state">No contractors added yet.</p>}
      {contractors.map((c) => (
        <ContractorCard key={c.id} contractor={c} onChanged={loadContractors} />
      ))}

      <div style={{ marginTop: "0.5rem" }}>
        <AddContractorForm contractId={id!} onAdded={loadContractors} />
      </div>
    </div>
  );
}
