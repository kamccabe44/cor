export default function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneClasses: Record<string, string> = {
    default: "text-slate-900",
    warn: "text-amber-700",
    danger: "text-red-700",
    good: "text-emerald-700",
  };
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</div>
    </div>
  );
}
