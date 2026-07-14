import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, uploadToS3, type Contact, type Contract, type Contractor } from "../api";
import { StarRatingDisplay } from "../components/StarRating";
import { ContactSection } from "../components/ContactSection";
import { DocumentIcon } from "../components/Icons";

type SortKey = "contractNumber" | "title" | "contractStart" | "contractEnd" | "avgRating";

// --- New Contract modal (contract fields + PWS upload + contact lists) ---

function NewContractModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    contractNumber: "",
    title: "",
    contractStart: "",
    contractEnd: "",
    milestone30: "",
    milestone60: "",
    milestone90: "",
    milestone120: "",
    notes: "",
  });
  const [leads, setLeads] = useState<Contact[]>([]);
  const [pocs, setPocs] = useState<Contact[]>([]);
  const [alternatePocs, setAlternatePocs] = useState<Contact[]>([]);
  const [pwsFile, setPwsFile] = useState<File | null>(null);
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
      const created = await api.createContract({ ...form, leads, pocs, alternatePocs });
      // PWS can only be uploaded once the contract exists (the key is
      // scoped to its id), so do it as a second step after create.
      if (pwsFile) {
        const { uploadUrl, key, filename } = await api.getPwsUploadUrl(created.id, pwsFile.name);
        await uploadToS3(uploadUrl, pwsFile);
        await api.recordPws(created.id, key, filename);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contract");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "2rem 1rem",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 680, padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>New contract</h2>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">Contract number *</div>
              <input
                value={form.contractNumber}
                onChange={(e) => set("contractNumber", e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">Title *</div>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} required style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">Contract start</div>
              <input type="date" value={form.contractStart} onChange={(e) => set("contractStart", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">Contract end</div>
              <input type="date" value={form.contractEnd} onChange={(e) => set("contractEnd", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">30 day out milestone</div>
              <textarea rows={2} value={form.milestone30} onChange={(e) => set("milestone30", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">60 day out milestone</div>
              <textarea rows={2} value={form.milestone60} onChange={(e) => set("milestone60", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">90 day out milestone</div>
              <textarea rows={2} value={form.milestone90} onChange={(e) => set("milestone90", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              <div className="meta">120 day out milestone</div>
              <textarea rows={2} value={form.milestone120} onChange={(e) => set("milestone120", e.target.value)} style={{ width: "100%" }} />
            </label>
          </div>

          <label style={{ fontSize: "0.85rem", display: "block", marginTop: "0.75rem" }}>
            <div className="meta">Notes</div>
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ width: "100%" }} />
          </label>

          <div style={{ marginTop: "0.85rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div className="meta">PWS document</div>
            <label className="btn btn-outline" style={{ cursor: "pointer" }}>
              {pwsFile ? "Change PWS" : "Add PWS"}
              <input
                type="file"
                style={{ display: "none" }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPwsFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {pwsFile && (
              <span className="meta">
                {pwsFile.name}{" "}
                <button type="button" className="btn btn-outline" onClick={() => setPwsFile(null)}>
                  Clear
                </button>
              </span>
            )}
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <ContactSection
              title="Leads"
              addLabel="+ Add Lead"
              contacts={leads}
              onChange={(next) => {
                setLeads(next);
                return Promise.resolve();
              }}
            />
            <ContactSection
              title="POCs"
              addLabel="+ Add POC"
              showDates
              contacts={pocs}
              onChange={(next) => {
                setPocs(next);
                return Promise.resolve();
              }}
            />
            <ContactSection
              title="Alternate POCs"
              addLabel="+ Add Alternate POC"
              contacts={alternatePocs}
              onChange={(next) => {
                setAlternatePocs(next);
                return Promise.resolve();
              }}
            />
          </div>

          {error && <p className="error-banner">{error}</p>}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create contract"}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
          <p className="meta" style={{ marginTop: "0.5rem" }}>
            Contractors are added and rated from the contract's own page after it's created.
          </p>
        </form>
      </div>
    </div>
  );
}

// --- Expandable table row ---

function contactLine(x: Contact, showDates: boolean) {
  const parts = [x.name, x.phone, x.email].filter(Boolean);
  let s = parts.join(" · ");
  if (showDates && (x.inDate || x.outDate)) s += ` · ${x.inDate || "—"} → ${x.outDate || "—"}`;
  return s || "—";
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontWeight: 700, color: "var(--olive-900)", marginBottom: "0.35rem" }}>{title}</div>
      {children}
    </div>
  );
}

function ContractRow({ c }: { c: Contract }) {
  const [open, setOpen] = useState(false);
  const [contractors, setContractors] = useState<Contractor[] | null>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && contractors === null) {
      api
        .listContractorsForContract(c.id)
        .then((r) => setContractors(r.items))
        .catch(() => setContractors([]));
    }
  }

  const leads = c.leads ?? [];
  const pocs = c.pocs ?? [];
  const alternatePocs = c.alternatePocs ?? [];
  const issues = c.issues ?? [];

  return (
    <>
      <tr>
        <td style={{ cursor: "pointer", width: "1.5rem", userSelect: "none" }} onClick={toggle}>
          {open ? "▼" : "▶"}
        </td>
        <td>
          <Link to={`/contracts/${c.id}`} className="entity-name">
            {c.contractNumber}
          </Link>
        </td>
        <td>{c.title}</td>
        <td>{c.contractStart || "—"}</td>
        <td>{c.contractEnd || "—"}</td>
        <td>
          <StarRatingDisplay avg={c.avgRating} count={c.ratingCount} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ background: "var(--slate-50)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", padding: "0.5rem 0.25rem" }}>
              <DetailBlock title="Contractors">
                {contractors === null ? (
                  <span className="meta">Loading…</span>
                ) : contractors.length === 0 ? (
                  <span className="meta">None</span>
                ) : (
                  contractors.map((co) => (
                    <div key={co.id} style={{ marginBottom: "0.3rem" }}>
                      <Link to={`/contracts/${c.id}`} className="entity-name">
                        {co.company}
                      </Link>{" "}
                      <StarRatingDisplay avg={co.avgRating} count={co.ratingCount} />
                    </div>
                  ))
                )}
              </DetailBlock>

              <DetailBlock title={`Leads (${leads.length})`}>
                {leads.length === 0 ? (
                  <span className="meta">None</span>
                ) : (
                  leads.map((x) => (
                    <div key={x.id} style={{ marginBottom: "0.2rem" }}>
                      {contactLine(x, false)}
                    </div>
                  ))
                )}
              </DetailBlock>

              <DetailBlock title={`POCs (${pocs.length})`}>
                {pocs.length === 0 ? (
                  <span className="meta">None</span>
                ) : (
                  pocs.map((x) => (
                    <div key={x.id} style={{ marginBottom: "0.2rem" }}>
                      {contactLine(x, true)}
                    </div>
                  ))
                )}
              </DetailBlock>

              <DetailBlock title={`Alternate POCs (${alternatePocs.length})`}>
                {alternatePocs.length === 0 ? (
                  <span className="meta">None</span>
                ) : (
                  alternatePocs.map((x) => (
                    <div key={x.id} style={{ marginBottom: "0.2rem" }}>
                      {contactLine(x, false)}
                    </div>
                  ))
                )}
              </DetailBlock>

              <DetailBlock title={`Issues (${issues.length})`}>
                {issues.length === 0 ? (
                  <span className="meta">None</span>
                ) : (
                  issues.map((x) => (
                    <div key={x.id} style={{ marginBottom: "0.2rem" }}>
                      {x.text || "—"}
                      {x.assignee && <span className="meta"> · {x.assignee}</span>}
                      <span className="meta"> · {x.status}</span>
                    </div>
                  ))
                )}
              </DetailBlock>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// --- Page ---

export function Contracts() {
  const [items, setItems] = useState<Contract[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("contractStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [startFilter, setStartFilter] = useState("");
  const [endFilter, setEndFilter] = useState("");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function refresh() {
    api
      .listContracts()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  function compare(a: Contract, b: Contract) {
    if (sortKey === "avgRating") {
      return sortDir === "asc" ? a.avgRating - b.avgRating : b.avgRating - a.avgRating;
    }
    const av = String(a[sortKey] ?? "");
    const bv = String(b[sortKey] ?? "");
    // Empty values always sort to the bottom regardless of direction so
    // undated contracts don't crowd the top of the date columns.
    if (av === "" && bv !== "") return 1;
    if (bv === "" && av !== "") return -1;
    const r = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
    return sortDir === "asc" ? r : -r;
  }

  const rows = (items ?? [])
    .filter(
      (c) =>
        (c.contractStart || "").toLowerCase().includes(startFilter.toLowerCase()) &&
        (c.contractEnd || "").toLowerCase().includes(endFilter.toLowerCase())
    )
    .sort(compare);

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");
  const sortableThStyle = { cursor: "pointer", userSelect: "none" as const };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <h1>Contracts</h1>
          <p className="subtitle">Contracts on file and their aggregate ratings.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Contract
        </button>
      </div>

      {items && (
        <div className="stat-row">
          <div className="card stat-card">
            <div className="stat-icon">
              <DocumentIcon style={{ width: "1.4rem", height: "1.4rem" }} />
            </div>
            <div>
              <div className="stat-value">{items.length}</div>
              <div className="stat-label">Total Contracts</div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error-banner">{error}</p>}
      {!items && !error && <p className="empty-state">Loading…</p>}

      {items && items.length > 0 ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th />
                <th style={sortableThStyle} onClick={() => toggleSort("contractNumber")}>
                  Contract #{arrow("contractNumber")}
                </th>
                <th style={sortableThStyle} onClick={() => toggleSort("title")}>
                  Title{arrow("title")}
                </th>
                <th style={sortableThStyle} onClick={() => toggleSort("contractStart")}>
                  Start{arrow("contractStart")}
                </th>
                <th style={sortableThStyle} onClick={() => toggleSort("contractEnd")}>
                  End{arrow("contractEnd")}
                </th>
                <th style={sortableThStyle} onClick={() => toggleSort("avgRating")}>
                  Rating{arrow("avgRating")}
                </th>
              </tr>
              <tr>
                <th />
                <th />
                <th />
                <th>
                  <input
                    value={startFilter}
                    onChange={(e) => setStartFilter(e.target.value)}
                    placeholder="Filter start…"
                    style={{ width: "110px", padding: "0.25rem 0.4rem", fontWeight: 400 }}
                  />
                </th>
                <th>
                  <input
                    value={endFilter}
                    onChange={(e) => setEndFilter(e.target.value)}
                    placeholder="Filter end…"
                    style={{ width: "110px", padding: "0.25rem 0.4rem", fontWeight: 400 }}
                  />
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <ContractRow key={c.id} c={c} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state" style={{ padding: "1rem" }}>
                    No contracts match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        items && <p className="empty-state">No contracts yet. Use “+ New Contract” to add one.</p>
      )}

      {showModal && <NewContractModal onClose={() => setShowModal(false)} onCreated={refresh} />}
    </div>
  );
}
