import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Contract } from "../api";
import { StarRatingDisplay } from "../components/StarRating";
import { DocumentIcon } from "../components/Icons";

export function Contracts() {
  const [items, setItems] = useState<Contract[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [contractNumber, setContractNumber] = useState("");
  const [title, setTitle] = useState("");
  const [pwsLink, setPwsLink] = useState("");
  const [creating, setCreating] = useState(false);

  function refresh() {
    api
      .listContracts()
      .then((res) => setItems(res.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createContract({ contractNumber, title, pwsLink });
      setContractNumber("");
      setTitle("");
      setPwsLink("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contract");
    } finally {
      setCreating(false);
    }
  }

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

      <form onSubmit={onCreate} className="form-row">
        <input
          placeholder="Contract number"
          value={contractNumber}
          onChange={(e) => setContractNumber(e.target.value)}
          required
        />
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input placeholder="PWS link (optional)" value={pwsLink} onChange={(e) => setPwsLink(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "Adding…" : "+ Add Contract"}
        </button>
      </form>
      <p className="meta">Add POCs, leads, milestones, and contractors after creating a contract — open it to fill in the rest.</p>

      {error && <p className="error-banner">{error}</p>}
      {!items && !error && <p className="empty-state">Loading…</p>}

      {items && items.length > 0 ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Title</th>
                <th>Period</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/contracts/${c.id}`} className="entity-name">
                      {c.contractNumber}
                    </Link>
                  </td>
                  <td>{c.title}</td>
                  <td>
                    {c.contractStart || c.contractEnd ? `${c.contractStart || "—"} → ${c.contractEnd || "—"}` : "—"}
                  </td>
                  <td>
                    <StarRatingDisplay avg={c.avgRating} count={c.ratingCount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        items && <p className="empty-state">No contracts yet.</p>
      )}
    </div>
  );
}
