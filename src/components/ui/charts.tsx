import * as React from 'react';
import { cn } from '@/lib/utils';

/** Dependency-free SVG charts. They read `currentColor`, so color them with a text-* class. */

export function Sparkline({
  data,
  className,
  fill = true,
}: {
  data: number[];
  className?: string;
  fill?: boolean;
}) {
  const id = React.useId();
  const w = 100;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - 2 - ((d - min) / span) * (h - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('size-full overflow-visible text-primary', className)}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function BarChart({
  data,
  height = 160,
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const [active, setActive] = React.useState<number | null>(null);
  return (
    <div className={cn('flex gap-2 text-primary', className)} style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div
            key={d.label}
            className="flex flex-1 flex-col gap-1.5"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="relative min-h-0 flex-1">
              <span
                className={cn('absolute inset-x-0 text-center text-[11px] font-medium tabular-nums text-foreground transition-opacity', active === i ? 'opacity-100' : 'opacity-0')}
                style={{ bottom: `calc(${pct}% + 4px)` }}
              >
                {d.value}
              </span>
              <div
                className={cn('absolute inset-x-0 bottom-0 rounded-t-md bg-current transition-opacity', active === null || active === i ? 'opacity-90' : 'opacity-30')}
                style={{ height: `${pct}%`, minHeight: 2 }}
              />
            </div>
            <span className="text-center text-[11px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];

export function DonutChart({
  data,
  size = 140,
  thickness = 14,
  centerLabel,
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: React.ReactNode;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color ?? palette[i % palette.length]}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(len - 2, 0)} ${c - Math.max(len - 2, 0)}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {centerLabel && <div className="absolute inset-0 grid place-items-center text-center">{centerLabel}</div>}
      </div>
      <ul className="grid gap-2 text-[13px]">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: d.color ?? palette[i % palette.length] }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
