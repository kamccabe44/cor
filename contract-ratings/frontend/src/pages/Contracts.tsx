import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Contract, type Contractor } from "../api";
import { StarRatingDisplay } from "../components/StarRating";

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

      <form onSubmit={onCreate} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
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
        <button type="submit" disabled={creating || contractors.length === 0}>
          {creating ? "Adding…" : "Add contract"}
        </button>
      </form>
      {contractors.length === 0 && <p style={{ color: "#666" }}>Add a contractor first before adding a contract.</p>}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!items && !error && <p>Loading…</p>}
      {items && items.length === 0 && <p>No contracts yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items?.map((c) => (
          <li key={c.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #eee" }}>
            <Link to={`/contracts/${c.id}`} style={{ fontWeight: 600 }}>
              {c.contractNumber} — {c.title}
            </Link>
            {c.agency && <span style={{ color: "#666" }}> · {c.agency}</span>}
            <div>
              <StarRatingDisplay avg={c.avgRating} count={c.ratingCount} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
