import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Contractor, type Contract } from "../api";
import { StarRatingDisplay, StarRatingInput } from "../components/StarRating";

export function ContractorDetail() {
  const { id } = useParams<{ id: string }>();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    if (!id) return;
    api.getContractor(id).then(setContractor).catch((err) => setError(err.message));
    api.listContracts(id).then((res) => setContracts(res.items)).catch((err) => setError(err.message));
  }

  useEffect(refresh, [id]);

  if (error) return <p className="error-banner">{error}</p>;
  if (!contractor) return <p className="empty-state">Loading…</p>;

  return (
    <div>
      <p>
        <Link to="/contractors">&larr; Contractors</Link>
      </p>
      <h1>{contractor.name}</h1>
      <p className="subtitle">
        {contractor.cageCode && <>CAGE {contractor.cageCode}</>}
        {contractor.cageCode && contractor.ueiSam && " · "}
        {contractor.ueiSam && <>UEI {contractor.ueiSam}</>}
      </p>
      {contractor.notes && <p>{contractor.notes}</p>}

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <StarRatingDisplay avg={contractor.avgRating} count={contractor.ratingCount} />
        </div>
        <div className="meta" style={{ marginBottom: "0.35rem" }}>
          Your rating:
        </div>
        <StarRatingInput
          initial={contractor.myRating?.stars ?? 0}
          onSubmit={async (stars) => {
            const res = await api.rateContractor(id!, stars);
            setContractor((c) => (c ? { ...c, avgRating: res.avgRating, ratingCount: res.ratingCount } : c));
          }}
        />
      </div>

      <h2>Contracts with this contractor</h2>
      <div className="card" style={{ padding: contracts.length > 0 ? "0.25rem 1rem" : "1.5rem" }}>
        {contracts.length === 0 && <p className="empty-state">No contracts recorded for this contractor yet.</p>}
        <ul className="entity-list">
          {contracts.map((c) => (
            <li key={c.id}>
              <Link to={`/contracts/${c.id}`} className="entity-name">
                {c.contractNumber} — {c.title}
              </Link>
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
