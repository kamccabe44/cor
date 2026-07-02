import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import { contracts as contractsRepo } from "@/lib/data";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import { fmtCurrency, fmtDate, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const data = getDashboardData();
  const totalContracts = contractsRepo.list().length;
  const utilizationPct =
    data.totalObligated > 0 ? Math.round((data.totalInvoiced / data.totalObligated) * 1000) / 10 : 0;

  if (totalContracts === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome to your COR Contract Tracker</h1>
        <p className="mt-3 text-slate-600">
          You have no contracts on file yet. Add one manually, or pull publicly available award data
          straight from USASpending.gov to get started.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/contracts/new" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Add a contract
          </Link>
          <Link href="/import" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Import from USASpending.gov
          </Link>
        </div>
        <div className="mt-8">
          <Link href="/profile" className="text-sm text-blue-700 hover:underline">
            Set up your COR profile first &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Surveillance and funding snapshot as of {fmtDate(data.today)}.</p>
      </div>

      {data.corCertExpiringSoon && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your COR certification is expiring within 60 days.{" "}
          <Link href="/profile" className="font-semibold underline">
            Review your COR profile
          </Link>{" "}
          and coordinate re-certification with your Contracting Officer.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active / Option Contracts" value={String(data.activeContractCount)} />
        <StatCard label="Total Obligated" value={fmtCurrency(data.totalObligated)} />
        <StatCard label="Total Invoiced" value={fmtCurrency(data.totalInvoiced)} />
        <StatCard
          label="Funds Utilized"
          value={`${utilizationPct}%`}
          tone={utilizationPct >= 90 ? "danger" : utilizationPct >= 75 ? "warn" : "good"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Overdue Deliverables" count={data.overdueDeliverables.length} tone="danger">
          {data.overdueDeliverables.length === 0 ? (
            <Empty text="Nothing overdue." />
          ) : (
            data.overdueDeliverables.map((d) => (
              <RowLink key={d.id} href={`/contracts/${d.contract_id}#deliverables`}>
                <div className="font-medium text-slate-900">{d.title}</div>
                <div className="text-xs text-slate-500">
                  {d.contract_number} &middot; due {fmtDate(d.due_date)}
                </div>
              </RowLink>
            ))
          )}
        </Panel>

        <Panel title="Due in Next 30 Days" count={data.upcomingDeliverables.length} tone="warn">
          {data.upcomingDeliverables.length === 0 ? (
            <Empty text="No deliverables due soon." />
          ) : (
            data.upcomingDeliverables.map((d) => (
              <RowLink key={d.id} href={`/contracts/${d.contract_id}#deliverables`}>
                <div className="font-medium text-slate-900">{d.title}</div>
                <div className="text-xs text-slate-500">
                  {d.contract_number} &middot; due {fmtDate(d.due_date)} ({daysUntil(d.due_date)}d)
                </div>
              </RowLink>
            ))
          )}
        </Panel>

        <Panel title="Period of Performance Expiring (60 days)" count={data.expiringContracts.length} tone="warn">
          {data.expiringContracts.length === 0 ? (
            <Empty text="No contracts expiring soon." />
          ) : (
            data.expiringContracts.map((c) => (
              <RowLink key={c.id} href={`/contracts/${c.id}`}>
                <div className="font-medium text-slate-900">{c.title}</div>
                <div className="text-xs text-slate-500">
                  {c.contract_number} &middot; PoP ends {fmtDate(c.pop_end)} ({daysUntil(c.pop_end)}d)
                </div>
              </RowLink>
            ))
          )}
        </Panel>

        <Panel title="Invoices Pending Review" count={data.pendingInvoices.length} tone="warn">
          {data.pendingInvoices.length === 0 ? (
            <Empty text="No invoices awaiting review." />
          ) : (
            data.pendingInvoices.map((i) => (
              <RowLink key={i.id} href={`/contracts/${i.contract_id}#invoices`}>
                <div className="font-medium text-slate-900">
                  {i.invoice_number ?? "Invoice"} &middot; {fmtCurrency(i.amount)}
                </div>
                <div className="text-xs text-slate-500">
                  {i.contract_number} &middot; received {fmtDate(i.date_received)}
                </div>
              </RowLink>
            ))
          )}
        </Panel>

        <Panel title="Open Corrective Actions" count={data.openCorrectiveActions.length} tone="danger">
          {data.openCorrectiveActions.length === 0 ? (
            <Empty text="No open corrective actions." />
          ) : (
            data.openCorrectiveActions.map((s) => (
              <RowLink key={s.id} href={`/contracts/${s.contract_id}#surveillance`}>
                <div className="font-medium text-slate-900">{s.contract_number}</div>
                <div className="text-xs text-slate-500">
                  Findings on {fmtDate(s.event_date)} &middot; due {fmtDate(s.corrective_action_due_date)}
                </div>
              </RowLink>
            ))
          )}
        </Panel>

        <Panel title="Funding Utilization Risk (&ge;85%)" count={data.fundingRisk.length} tone="danger">
          {data.fundingRisk.length === 0 ? (
            <Empty text="No contracts near their funding ceiling." />
          ) : (
            data.fundingRisk.map(({ contract, utilizationPct }) => (
              <RowLink key={contract.id} href={`/contracts/${contract.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">{contract.title}</div>
                  <Badge value={utilizationPct >= 100 ? "UNSATISFACTORY" : "PENDING_REVIEW"} />
                </div>
                <div className="text-xs text-slate-500">
                  {contract.contract_number} &middot; {utilizationPct}% of {fmtCurrency(contract.obligated_amount)} invoiced
                </div>
              </RowLink>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "warn" | "danger";
  children: React.ReactNode;
}) {
  const toneClass = count === 0 ? "text-slate-400" : tone === "danger" ? "text-red-700" : "text-amber-700";
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className={`text-sm font-semibold ${toneClass}`}>{count}</span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-md px-2 py-1.5 hover:bg-slate-50">
      {children}
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-2 py-1.5 text-sm text-slate-400">{text}</div>;
}
