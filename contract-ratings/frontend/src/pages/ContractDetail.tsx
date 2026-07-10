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

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!contract) return <p>Loading…</p>;

  return (
    <div>
      <p>
        <Link to="/contracts">&larr; Contracts</Link>
      </p>
      <h1>
        {contract.contractNumber} — {contract.title}
      </h1>
      {contractor && (
        <p>
          Contractor: <Link to={`/contractors/${contractor.id}`}>{contractor.name}</Link>
        </p>
      )}
      {contract.agency && <p>Agency: {contract.agency}</p>}
      {contract.awardDate && <p>Award date: {contract.awardDate}</p>}
      {contract.contractValue != null && <p>Value: ${contract.contractValue.toLocaleString()}</p>}
      {contract.description && <p>{contract.description}</p>}

      <div style={{ margin: "1rem 0" }}>
        <StarRatingDisplay avg={contract.avgRating} count={contract.ratingCount} />
      </div>

      <div style={{ margin: "1rem 0" }}>
        <p>Your rating:</p>
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
