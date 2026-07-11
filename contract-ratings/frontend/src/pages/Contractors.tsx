import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Contractor } from "../api";
import { StarRatingDisplay } from "../components/StarRating";
import { UsersIcon, StarFilledIcon } from "../components/Icons";

export function Contractors() {
  const [items, setItems] = useState<Contractor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cageCode, setCageCode] = useState("");
  const [ueiSam, setUeiSam] = useState("");
  const [creating, setCreating] = useState(false);

  function refresh() {
    api
      .listContractors()
      .then((res) => setItems(res.items.sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createContractor({ name, cageCode, ueiSam });
      setName("");
      setCageCode("");
      setUeiSam("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contractor");
    } finally {
      setCreating(false);
    }
  }

  const rated = items?.filter((c) => c.ratingCount > 0) ?? [];
  const overallAvg = rated.length > 0 ? rated.reduce((s, c) => s + c.avgRating, 0) / rated.length : 0;

  return (
    <div>
      <h1>Contractors</h1>
      <p className="subtitle">Contractors on file and their aggregate ratings.</p>

      {items && (
        <div className="stat-row">
          <div className="card stat-card">
            <div className="stat-icon">
              <UsersIcon style={{ width: "1.4rem", height: "1.4rem" }} />
            </div>
            <div>
              <div className="stat-value">{items.length}</div>
              <div className="stat-label">Total Contractors</div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon">
              <StarFilledIcon style={{ width: "1.4rem", height: "1.4rem" }} />
            </div>
            <div>
              <div className="stat-value">{rated.length > 0 ? overallAvg.toFixed(1) : "—"}</div>
              <div className="stat-label">Overall Avg Rating</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onCreate} className="form-row">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="CAGE code" value={cageCode} onChange={(e) => setCageCode(e.target.value)} />
        <input placeholder="UEI (SAM.gov)" value={ueiSam} onChange={(e) => setUeiSam(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "Adding…" : "+ Add Contractor"}
        </button>
      </form>

      {error && <p className="error-banner">{error}</p>}
      {!items && !error && <p className="empty-state">Loading…</p>}

      <div className="card" style={{ padding: items && items.length > 0 ? "0.25rem 1rem" : "1.5rem" }}>
        {items && items.length === 0 && <p className="empty-state">No contractors yet.</p>}
        <ul className="entity-list">
          {items?.map((c) => (
            <li key={c.id}>
              <Link to={`/contractors/${c.id}`} className="entity-name">
                {c.name}
              </Link>
              {c.cageCode && <span className="meta"> · CAGE {c.cageCode}</span>}
              <div>
                <StarRatingDisplay avg={c.avgRating} count={c.ratingCount} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
