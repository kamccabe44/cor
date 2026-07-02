const COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  OPTION_PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  CLOSEOUT: "bg-slate-100 text-slate-700 border-slate-300",
  EXPIRED: "bg-red-100 text-red-800 border-red-300",
  TERMINATED: "bg-red-100 text-red-800 border-red-300",
  PENDING: "bg-slate-100 text-slate-700 border-slate-300",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-300",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 border-amber-300",
  ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
  SATISFACTORY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  UNSATISFACTORY: "bg-red-100 text-red-800 border-red-300",
  PENDING_REVIEW: "bg-amber-100 text-amber-800 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  DISPUTED: "bg-red-100 text-red-800 border-red-300",
  PAID: "bg-blue-100 text-blue-800 border-blue-300",
  SERVICEABLE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  UNSERVICEABLE: "bg-red-100 text-red-800 border-red-300",
};

export default function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const cls = COLORS[value] ?? "bg-slate-100 text-slate-700 border-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
