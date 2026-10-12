import * as React from 'react';
import { cn } from '@/lib/utils';

/** Half-circle meter with a needle that swings to the value. Tone follows the value unless you pass one. */
export function Gauge({
  value,
  max = 100,
  label,
  size = 200,
  tone,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const pct = Math.min(1, Math.max(0, value / max));
  const t = tone ?? (pct < 0.34 ? 'danger' : pct < 0.67 ? 'warning' : 'success');
  const color = { primary: 'text-primary', success: 'text-success', warning: 'text-warning', danger: 'text-destructive' }[t];
  const r = 80;
  const arc = Math.PI * r;
  return (
    <div className={cn('relative inline-block', color, className)} style={{ width: size }} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <svg viewBox="0 0 200 112" className="w-full overflow-visible">
        <path d="M20 100a80 80 0 0 1 160 0" fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-secondary" />
        <path d="M20 100a80 80 0 0 1 160 0" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeDasharray={arc} strokeDashoffset={arc * (1 - pct)} className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]" />
        <g className="origin-[100px_100px] transition-transform duration-1000 ease-[cubic-bezier(0.34,1.3,0.64,1)]" style={{ transform: `rotate(${pct * 180 - 90}deg)` }}>
          <path d="M100 100V34" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="var(--foreground)" />
      </svg>
      <div className="-mt-1 text-center">
        <span className="text-2xl font-semibold tabular-nums text-foreground">{Math.round(value)}</span>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
