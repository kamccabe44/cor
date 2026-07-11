import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Contract, type Contractor } from "../api";
import { StarRatingDisplay } from "../components/StarRating";
import { DocumentIcon } from "../components/Icons";

export function Contracts() {
  const [items, setItems] = useState<Contract[] | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [contractNumber, setContractNumber] = useState("");
  const [title, setTitle] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [agency, setAgency] = useState("");
  const [creating, setCreating] = useState(false);

  function refresh() {
    api
      .listContracts()
      .then((res) => setItems(res.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch((err) => setError(err.message));
    api.listContractors().then((res) => setContractors(res.items));
  }

  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createContract({ contractNumber, title, contractorId, agency });
      setContractNumber("");
      setTitle("");
      setContractorId("");
      setAgency("");
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
        <select value={contractorId} onChange={(e) => setContractorId(e.target.value)} required>
          <option value="" disabled>
            Contractor…
          </option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input placeholder="Agency" value={agency} onChange={(e) => setAgency(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={creating || contractors.length === 0}>
          {creating ? "Adding…" : "+ Add Contract"}
        </button>
      </form>
      {contractors.length === 0 && <p className="meta">Add a contractor first before adding a contract.</p>}

      {error && <p className="error-banner">{error}</p>}
      {!items && !error && <p className="empty-state">Loading…</p>}

      {items && items.length > 0 ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Title</th>
                <th>Agency</th>
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
                  <td>{c.agency || "—"}</td>
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
