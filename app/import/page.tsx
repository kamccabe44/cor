"use client";

import { useState, useTransition } from "react";
import { importAwardAsContract } from "@/lib/actions";

interface SearchResult {
  awardId: string;
  piid: string | null;
  recipientName: string | null;
  startDate: string | null;
  endDate: string | null;
  awardAmount: number | null;
  awardingAgency: string | null;
  awardingSubAgency: string | null;
  awardType: string | null;
  description: string | null;
}

export default function ImportPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/usaspending/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function doImport(awardId: string) {
    setImportingId(awardId);
    startTransition(async () => {
      try {
        await importAwardAsContract(awardId);
      } finally {
        setImportingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import from USASpending.gov</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          Search publicly reported federal contract award data (no login or API key required) and import a
          match directly into your contract register. Search by PIID/contract number, vendor name, or
          keyword (e.g. a base name or requirement). Results are limited to contract-type awards
          (definitive contracts, purchase orders, BPA calls, and IDV delivery orders).
        </p>
      </div>

      <form onSubmit={runSearch} className="card flex gap-3 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. W91QF1, or vendor name, or 'dining facility CENTCOM'"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}. USASpending.gov may be temporarily unavailable, or outbound network access may be
          restricted in this environment — you can always enter contract data manually instead.
        </div>
      )}

      {results && results.length === 0 && (
        <div className="card p-6 text-center text-sm text-slate-500">No awards matched that search.</div>
      )}

      {results && results.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PIID</th>
                <th>Recipient</th>
                <th>Agency</th>
                <th>Period</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.awardId}>
                  <td>{r.piid ?? "—"}</td>
                  <td className="max-w-[16rem] truncate">{r.recipientName ?? "—"}</td>
                  <td className="max-w-[14rem] truncate">
                    {r.awardingAgency}
                    {r.awardingSubAgency && <div className="text-xs text-slate-500">{r.awardingSubAgency}</div>}
                  </td>
                  <td className="text-xs">
                    {r.startDate ?? "?"} &rarr; {r.endDate ?? "?"}
                  </td>
                  <td>{r.awardAmount != null ? `$${r.awardAmount.toLocaleString()}` : "—"}</td>
                  <td>
                    <button
                      onClick={() => doImport(r.awardId)}
                      disabled={(isPending && importingId === r.awardId) || !r.awardId}
                      className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      {isPending && importingId === r.awardId ? "Importing…" : "Import"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-500">
        Importing pulls the award&apos;s PIID, recipient, NAICS/PSC, period of performance, obligated and
        potential total value, place of performance, and awarding agency from USASpending.gov. It will
        <strong> not</strong> populate COR-specific fields (contracting officer, ACO office, your COR
        appointment info) — fill those in on the contract&apos;s edit page after import.
      </div>
    </div>
  );
}
