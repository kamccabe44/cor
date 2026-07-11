import type { CSSProperties } from "react";

type IconProps = { className?: string; style?: CSSProperties };

export function ShieldIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} style={style}>
      <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} style={style}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.7 14.3c2.3.3 4.3 2 4.3 4.7" strokeLinecap="round" />
    </svg>
  );
}

export function DocumentIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} style={style}>
      <path d="M7 3h7l4 4v14H7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12h5M9.5 15.5h5M9.5 8.5h2" strokeLinecap="round" />
    </svg>
  );
}

export function StarFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.6l-5.9 3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}
