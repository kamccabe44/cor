import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Contract } from "../api";
import { StarRatingDisplay } from "../components/StarRating";
import { DocumentIcon } from "../components/Icons";

type SortKey = "contractNumber" | "title" | "contractStart" | "contractEnd" | "avgRating";

export function Contracts() {
  const [items, setItems] = useState<Contract[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [contractNumber, setContractNumber] = useState("");
  const [title, setTitle] = useState("");
  const [pwsLink, setPwsLink] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createContract({ contractNumber, title, pwsLink, notes });
      setContractNumber("");
      setTitle("");
      setPwsLink("");
      setNotes("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contract");
    } finally {
      setCreating(false);
    }
  }

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
      <h1>Contracts</h1>
      <p className="subtitle">Contracts on file and their aggregate ratings.</p>

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

      <form onSubmit={onCreate} style={{ marginBottom: "1.5rem" }}>
        <div className="form-row" style={{ marginBottom: "0.6rem" }}>
          <input
            placeholder="Contract number"
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            required
          />
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input placeholder="PWS link (optional)" value={pwsLink} onChange={(e) => setPwsLink(e.target.value)} />
        </div>
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ width: "100%", marginBottom: "0.6rem" }}
        />
        <div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Adding…" : "+ Add Contract"}
          </button>
        </div>
      </form>
      <p className="meta">Add leads, POCs, alternate POCs, milestones, and contractors after creating a contract — open it to fill in the rest.</p>

      {error && <p className="error-banner">{error}</p>}
      {!items && !error && <p className="empty-state">Loading…</p>}

      {items && items.length > 0 ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
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
                <tr key={c.id}>
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
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state" style={{ padding: "1rem" }}>
                    No contracts match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        items && <p className="empty-state">No contracts yet.</p>
      )}
    </div>
  );
}
