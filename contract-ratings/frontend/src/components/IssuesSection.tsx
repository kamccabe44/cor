import { useState, type FormEvent } from "react";
import { ISSUE_STATUSES, type Issue, type IssueStatus } from "../api";

const STATUS_COLOR: Record<IssueStatus, string> = {
  "To-Do": "#64748b",
  "In Progress": "#2563eb",
  Blocked: "#b91c1c",
  Resolved: "#15803d",
};

function IssueRow({
  issue,
  onSave,
  onRemove,
}: {
  issue: Issue;
  onSave: (next: Issue) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [text, setText] = useState(issue.text);
  const [busy, setBusy] = useState(false);

  async function persist(next: Issue) {
    setBusy(true);
    try {
      await onSave(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        padding: "0.5rem 0",
        borderBottom: "1px solid var(--slate-200)",
      }}
    >
      <span
        title={issue.status}
        style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLOR[issue.status], flexShrink: 0 }}
      />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() !== issue.text) persist({ ...issue, text: text.trim() });
        }}
        disabled={busy}
        style={{ flex: 1, minWidth: 0 }}
      />
      <select
        value={issue.status}
        onChange={(e) => persist({ ...issue, status: e.target.value as IssueStatus })}
        disabled={busy}
      >
        {ISSUE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-outline" onClick={onRemove} disabled={busy}>
        Remove
      </button>
    </div>
  );
}

export function IssuesSection({
  issues,
  onChange,
}: {
  issues: Issue[];
  onChange: (next: Issue[]) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<IssueStatus>("To-Do");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(next: Issue[]) {
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
    if (!text.trim()) return;
    setBusy(true);
    try {
      await run([...issues, { id: crypto.randomUUID(), text: text.trim(), status }]);
      setText("");
      setStatus("To-Do");
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
          Issues <span className="meta">({issues.length})</span>
        </h2>
        {!adding && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + Add Issue
          </button>
        )}
      </div>

      {issues.length === 0 && !adding && <p className="empty-state" style={{ padding: "0.25rem 0" }}>None yet.</p>}

      {issues.map((i) => (
        <IssueRow
          key={i.id}
          issue={i}
          onSave={(next) => run(issues.map((x) => (x.id === i.id ? { ...next, id: i.id } : x)))}
          onRemove={() => run(issues.filter((x) => x.id !== i.id))}
        />
      ))}

      {error && <p className="error-banner" style={{ marginTop: "0.75rem" }}>{error}</p>}

      {adding && (
        <form onSubmit={add} style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe the issue…"
            autoFocus
            style={{ flex: 1, minWidth: 220 }}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)}>
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setText("");
              setStatus("To-Do");
              setAdding(false);
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
