import { useState, type FormEvent, type ReactNode } from "react";
import type { Contact } from "../api";

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.85rem" }}>
      <span className="meta">{label}</span>
      {children}
    </label>
  );
}

const EMPTY: Contact = { id: "", name: "", phone: "", email: "", inDate: "", outDate: "" };

function ContactFields({
  draft,
  set,
  showDates,
}: {
  draft: Contact;
  set: (key: keyof Contact, value: string) => void;
  showDates: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: showDates ? "repeat(5, 1fr)" : "1fr 1fr 1fr" }}>
      <Labeled label="Name *">
        <input value={draft.name} onChange={(e) => set("name", e.target.value)} required />
      </Labeled>
      <Labeled label="Number">
        <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
      </Labeled>
      <Labeled label="Email">
        <input value={draft.email} onChange={(e) => set("email", e.target.value)} />
      </Labeled>
      {showDates && (
        <>
          <Labeled label="In date">
            <input type="date" value={draft.inDate} onChange={(e) => set("inDate", e.target.value)} />
          </Labeled>
          <Labeled label="Out date">
            <input type="date" value={draft.outDate} onChange={(e) => set("outDate", e.target.value)} />
          </Labeled>
        </>
      )}
    </div>
  );
}

function ContactRow({
  contact,
  showDates,
  onSave,
  onRemove,
}: {
  contact: Contact;
  showDates: boolean;
  onSave: (next: Contact) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact);
  const [busy, setBusy] = useState(false);

  function set(key: keyof Contact, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} style={{ padding: "0.65rem 0", borderBottom: "1px solid var(--slate-200)" }}>
        <ContactFields draft={draft} set={set} showDates={showDates} />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Save
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setDraft(contact);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "1rem",
        padding: "0.55rem 0",
        borderBottom: "1px solid var(--slate-200)",
      }}
    >
      <div>
        <span style={{ fontWeight: 600 }}>{contact.name}</span>
        {contact.phone && <span className="meta"> · {contact.phone}</span>}
        {contact.email && <span className="meta"> · {contact.email}</span>}
        {showDates && (contact.inDate || contact.outDate) && (
          <span className="meta">
            {" "}
            · {contact.inDate || "—"} → {contact.outDate || "—"}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
        <button className="btn btn-outline" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="btn btn-outline" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}

export function ContactSection({
  title,
  addLabel,
  showDates = false,
  contacts,
  onChange,
}: {
  title: string;
  addLabel: string;
  showDates?: boolean;
  contacts: Contact[];
  onChange: (next: Contact[]) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Contact>({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof Contact, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function run(next: Contact[]) {
    setError(null);
    try {
      await onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      throw err;
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await run([...contacts, { ...draft, id: crypto.randomUUID() }]);
      setDraft({ ...EMPTY });
      setAdding(false);
    } catch {
      /* error already surfaced */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: "1.1rem", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
          {title} <span className="meta">({contacts.length})</span>
        </h2>
        {!adding && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            {addLabel}
          </button>
        )}
      </div>

      {contacts.length === 0 && !adding && <p className="empty-state" style={{ padding: "0.25rem 0" }}>None yet.</p>}

      {contacts.map((c) => (
        <ContactRow
          key={c.id}
          contact={c}
          showDates={showDates}
          onSave={(next) => run(contacts.map((x) => (x.id === c.id ? { ...next, id: c.id } : x)))}
          onRemove={() => run(contacts.filter((x) => x.id !== c.id))}
        />
      ))}

      {error && <p className="error-banner" style={{ marginTop: "0.75rem" }}>{error}</p>}

      {adding && (
        <form onSubmit={add} style={{ marginTop: "0.85rem" }}>
          <ContactFields draft={draft} set={set} showDates={showDates} />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setDraft({ ...EMPTY });
                setAdding(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
