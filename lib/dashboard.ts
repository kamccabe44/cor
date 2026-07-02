import { db } from "./db";
import type { Contract, Deliverable, Invoice, SurveillanceEvent } from "./types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface DashboardData {
  today: string;
  upcomingDeliverables: (Deliverable & { contract_title: string; contract_number: string })[];
  overdueDeliverables: (Deliverable & { contract_title: string; contract_number: string })[];
  expiringContracts: Contract[];
  pendingInvoices: (Invoice & { contract_title: string; contract_number: string })[];
  openCorrectiveActions: (SurveillanceEvent & { contract_title: string; contract_number: string })[];
  fundingRisk: { contract: Contract; utilizationPct: number }[];
  activeContractCount: number;
  totalObligated: number;
  totalInvoiced: number;
  corCertExpiringSoon: boolean;
}

export function getDashboardData(): DashboardData {
  const today = todayIso();
  const in30 = addDaysIso(30);
  const in60 = addDaysIso(60);

  const upcomingDeliverables = db
    .prepare(
      `SELECT d.*, c.title as contract_title, c.contract_number as contract_number
       FROM deliverables d JOIN contracts c ON c.id = d.contract_id
       WHERE d.due_date IS NOT NULL AND d.due_date BETWEEN $today AND $in30
         AND d.status NOT IN ('ACCEPTED', 'REJECTED')
       ORDER BY d.due_date ASC`
    )
    .all({ $today: today, $in30: in30 }) as unknown as (Deliverable & { contract_title: string; contract_number: string })[];

  const overdueDeliverables = db
    .prepare(
      `SELECT d.*, c.title as contract_title, c.contract_number as contract_number
       FROM deliverables d JOIN contracts c ON c.id = d.contract_id
       WHERE d.due_date IS NOT NULL AND d.due_date < $today
         AND d.status NOT IN ('ACCEPTED', 'REJECTED')
       ORDER BY d.due_date ASC`
    )
    .all({ $today: today }) as unknown as (Deliverable & { contract_title: string; contract_number: string })[];

  const expiringContracts = db
    .prepare(
      `SELECT * FROM contracts
       WHERE pop_end IS NOT NULL AND pop_end BETWEEN $today AND $in60
         AND status IN ('ACTIVE', 'OPTION_PENDING')
       ORDER BY pop_end ASC`
    )
    .all({ $today: today, $in60: in60 }) as unknown as Contract[];

  const pendingInvoices = db
    .prepare(
      `SELECT i.*, c.title as contract_title, c.contract_number as contract_number
       FROM invoices i JOIN contracts c ON c.id = i.contract_id
       WHERE i.status = 'PENDING_REVIEW'
       ORDER BY i.date_received ASC`
    )
    .all() as unknown as (Invoice & { contract_title: string; contract_number: string })[];

  const openCorrectiveActions = db
    .prepare(
      `SELECT s.*, c.title as contract_title, c.contract_number as contract_number
       FROM surveillance_events s JOIN contracts c ON c.id = s.contract_id
       WHERE s.corrective_action_required = 1
         AND (s.follow_up_status IS NULL OR s.follow_up_status != 'CLOSED')
       ORDER BY s.corrective_action_due_date ASC`
    )
    .all() as unknown as (SurveillanceEvent & { contract_title: string; contract_number: string })[];

  const activeContracts = db
    .prepare(`SELECT * FROM contracts WHERE status IN ('ACTIVE', 'OPTION_PENDING')`)
    .all() as unknown as Contract[];

  const fundingRisk = activeContracts
    .map((contract) => {
      const utilizationPct =
        contract.obligated_amount > 0
          ? Math.round((contract.invoiced_amount / contract.obligated_amount) * 1000) / 10
          : 0;
      return { contract, utilizationPct };
    })
    .filter((r) => r.utilizationPct >= 85)
    .sort((a, b) => b.utilizationPct - a.utilizationPct);

  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(obligated_amount),0) as obligated, COALESCE(SUM(invoiced_amount),0) as invoiced
       FROM contracts WHERE status IN ('ACTIVE', 'OPTION_PENDING')`
    )
    .get() as unknown as { obligated: number; invoiced: number };

  const profile = db.prepare("SELECT cert_expiration_date FROM cor_profile WHERE id = 'singleton'").get() as
    | unknown as { cert_expiration_date: string | null } | undefined;
  const corCertExpiringSoon = Boolean(
    profile?.cert_expiration_date && profile.cert_expiration_date <= in60
  );

  return {
    today,
    upcomingDeliverables,
    overdueDeliverables,
    expiringContracts,
    pendingInvoices,
    openCorrectiveActions,
    fundingRisk,
    activeContractCount: activeContracts.length,
    totalObligated: totals.obligated,
    totalInvoiced: totals.invoiced,
    corCertExpiringSoon,
  };
}
