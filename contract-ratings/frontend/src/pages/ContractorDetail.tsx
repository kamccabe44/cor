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

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!contractor) return <p>Loading…</p>;

  return (
    <div>
      <p>
        <Link to="/contractors">&larr; Contractors</Link>
      </p>
      <h1>{contractor.name}</h1>
      {contractor.cageCode && <p>CAGE code: {contractor.cageCode}</p>}
      {contractor.ueiSam && <p>UEI: {contractor.ueiSam}</p>}
      {contractor.notes && <p>{contractor.notes}</p>}

      <div style={{ margin: "1rem 0" }}>
        <StarRatingDisplay avg={contractor.avgRating} count={contractor.ratingCount} />
      </div>

      <div style={{ margin: "1rem 0" }}>
        <p>Your rating:</p>
        <StarRatingInput
          initial={contractor.myRating?.stars ?? 0}
          onSubmit={async (stars) => {
            const res = await api.rateContractor(id!, stars);
            setContractor((c) => (c ? { ...c, avgRating: res.avgRating, ratingCount: res.ratingCount } : c));
          }}
        />
      </div>

      <h2>Contracts with this contractor</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {contracts.map((c) => (
          <li key={c.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
            <Link to={`/contracts/${c.id}`}>
              {c.contractNumber} — {c.title}
            </Link>
            <div>
              <StarRatingDisplay avg={c.avgRating} count={c.ratingCount} />
            </div>
          </li>
        ))}
        {contracts.length === 0 && <p>No contracts recorded for this contractor yet.</p>}
      </ul>
    </div>
  );
}
