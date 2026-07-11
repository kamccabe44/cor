import { useState } from "react";

export function StarRatingDisplay({ avg, count }: { avg: number; count: number }) {
  return (
    <span title={`${avg.toFixed(1)} average over ${count} rating${count === 1 ? "" : "s"}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(avg) ? "var(--amber-500)" : "var(--slate-300)" }}>
          ★
        </span>
      ))}{" "}
      <span className="meta">{count > 0 ? `${avg.toFixed(1)} (${count})` : "No ratings yet"}</span>
    </span>
  );
}

export function StarRatingInput({
  initial,
  onSubmit,
}: {
  initial: number;
  onSubmit: (stars: number) => Promise<void>;
}) {
  const [hover, setHover] = useState(0);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function pick(n: number) {
    setValue(n);
    setSaving(true);
    try {
      await onSubmit(n);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span aria-label="Rate this" style={{ cursor: saving ? "wait" : "pointer" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => !saving && pick(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{ color: n <= (hover || value) ? "var(--amber-500)" : "var(--slate-300)", fontSize: "1.4em" }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
