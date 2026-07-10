import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Contractor } from "../api";
import { StarRatingDisplay } from "../components/StarRating";

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

  return (
    <div>
      <h1>Contractors</h1>

      <form onSubmit={onCreate} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="CAGE code" value={cageCode} onChange={(e) => setCageCode(e.target.value)} />
        <input placeholder="UEI (SAM.gov)" value={ueiSam} onChange={(e) => setUeiSam(e.target.value)} />
        <button type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add contractor"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!items && !error && <p>Loading…</p>}
      {items && items.length === 0 && <p>No contractors yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items?.map((c) => (
          <li key={c.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #eee" }}>
            <Link to={`/contractors/${c.id}`} style={{ fontWeight: 600 }}>
              {c.name}
            </Link>
            {c.cageCode && <span style={{ color: "#666" }}> · CAGE {c.cageCode}</span>}
            <div>
              <StarRatingDisplay avg={c.avgRating} count={c.ratingCount} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
