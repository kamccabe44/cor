import type { ReactNode } from "react";

const TONE_ICON_BOX: Record<string, string> = {
  default: "bg-olive-100 text-olive-800",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  good: "bg-emerald-100 text-emerald-700",
};

const TONE_VALUE: Record<string, string> = {
  default: "text-slate-900",
  warn: "text-amber-700",
  danger: "text-red-700",
  good: "text-emerald-700",
};

export default function StatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger" | "good";
  icon?: ReactNode;
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      {icon && (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${TONE_ICON_BOX[tone]}`}>
          <span className="h-6 w-6">{icon}</span>
        </div>
      )}
      <div>
        <div className={`text-2xl font-bold leading-tight ${TONE_VALUE[tone]}`}>{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}
