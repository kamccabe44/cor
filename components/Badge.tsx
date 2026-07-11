const COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-700 text-white",
  OPTION_PENDING: "bg-amber-600 text-white",
  CLOSEOUT: "bg-slate-600 text-white",
  EXPIRED: "bg-red-700 text-white",
  TERMINATED: "bg-red-700 text-white",
  PENDING: "bg-slate-600 text-white",
  SUBMITTED: "bg-sky-700 text-white",
  UNDER_REVIEW: "bg-amber-600 text-white",
  ACCEPTED: "bg-emerald-700 text-white",
  REJECTED: "bg-red-700 text-white",
  SATISFACTORY: "bg-emerald-700 text-white",
  UNSATISFACTORY: "bg-red-700 text-white",
  PENDING_REVIEW: "bg-amber-600 text-white",
  APPROVED: "bg-emerald-700 text-white",
  DISPUTED: "bg-red-700 text-white",
  PAID: "bg-sky-700 text-white",
  SERVICEABLE: "bg-emerald-700 text-white",
  UNSERVICEABLE: "bg-red-700 text-white",
};

export default function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const cls = COLORS[value] ?? "bg-slate-600 text-white";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${cls}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
