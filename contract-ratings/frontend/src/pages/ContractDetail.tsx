import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Contract, type Contractor } from "../api";
import { StarRatingDisplay, StarRatingInput } from "../components/StarRating";

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getContract(id)
      .then((c) => {
        setContract(c);
        return api.getContractor(c.contractorId);
      })
      .then(setContractor)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="error-banner">{error}</p>;
  if (!contract) return <p className="empty-state">Loading…</p>;

  return (
    <div>
      <p>
        <Link to="/contracts">&larr; Contracts</Link>
      </p>
      <h1>
        {contract.contractNumber} — {contract.title}
      </h1>
      <p className="subtitle">
        {contractor && (
          <>
            Contractor: <Link to={`/contractors/${contractor.id}`}>{contractor.name}</Link>
          </>
        )}
        {contract.agency && <> · Agency: {contract.agency}</>}
        {contract.awardDate && <> · Award date: {contract.awardDate}</>}
      </p>
      {contract.contractValue != null && <p>Value: ${contract.contractValue.toLocaleString()}</p>}
      {contract.description && <p>{contract.description}</p>}

      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <StarRatingDisplay avg={contract.avgRating} count={contract.ratingCount} />
        </div>
        <div className="meta" style={{ marginBottom: "0.35rem" }}>
          Your rating:
        </div>
        <StarRatingInput
          initial={contract.myRating?.stars ?? 0}
          onSubmit={async (stars) => {
            const res = await api.rateContract(id!, stars);
            setContract((c) => (c ? { ...c, avgRating: res.avgRating, ratingCount: res.ratingCount } : c));
          }}
        />
      </div>
    </div>
  );
}
