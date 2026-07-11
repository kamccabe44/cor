import Link from "next/link";
import { contracts as contractsRepo } from "@/lib/data";
import Badge from "@/components/Badge";
import { fmtCurrency, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ContractsPage() {
  const list = contractsRepo.list("pop_end ASC");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contracts</h1>
          <p className="text-sm text-slate-500">All contracts and task orders you are the COR for.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Import from USASpending
          </Link>
          <Link href="/contracts/new" className="rounded-md bg-olive-700 px-4 py-2 text-sm font-semibold text-white hover:bg-olive-800">
            Add Contract
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          No contracts yet. <Link href="/contracts/new" className="text-olive-700 hover:underline">Add your first one</Link>.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Title</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>PoP End</th>
                <th>Obligated</th>
                <th>Invoiced</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/contracts/${c.id}`} className="font-medium text-olive-700 hover:underline">
                      {c.contract_number}
                    </Link>
                    {c.task_order_number && <div className="text-xs text-slate-500">TO {c.task_order_number}</div>}
                  </td>
                  <td className="max-w-xs truncate">{c.title}</td>
                  <td>{c.vendor_name ?? "—"}</td>
                  <td>
                    <Badge value={c.status} />
                  </td>
                  <td>{fmtDate(c.pop_end)}</td>
                  <td>{fmtCurrency(c.obligated_amount)}</td>
                  <td>{fmtCurrency(c.invoiced_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
