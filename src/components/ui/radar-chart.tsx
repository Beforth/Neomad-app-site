import * as React from 'react';
import { cn } from '@/lib/utils';

export interface RadarSeries {
  name: string;
  values: number[];
  color?: string;
}

const palette = ['text-primary', 'text-warning', 'text-success', 'text-info'];

/** Spider chart in plain SVG. `axes` names the spokes; each series has one value per axis, 0 to `max`. Hover a series name to highlight it. */
export function RadarChart({ axes, series, max = 100, rings = 4, size = 280, className }: { axes: string[]; series: RadarSeries[]; max?: number; rings?: number; size?: number; className?: string }) {
  const [focus, setFocus] = React.useState<number | null>(null);
  const c = size / 2;
  const r = size / 2 - 38;
  const n = axes.length;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * (v / max), c + Math.sin(a) * r * (v / max)] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((p) => p.toFixed(1)).join(',')).join(' ');
  return (
    <figure className={cn('grid justify-items-center gap-3', className)}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size }} className="max-w-full overflow-visible" role="img" aria-label={`Radar chart: ${axes.join(', ')}`}>
        {Array.from({ length: rings }, (_, k) => <polygon key={k} points={poly(axes.map(() => (max * (k + 1)) / rings))} fill="none" className="stroke-border" />)}
        {axes.map((a, i) => {
          const [x, y] = pt(i, max);
          const [lx, ly] = pt(i, max * 1.2);
          return (
            <g key={a}>
              <line x1={c} y1={c} x2={x} y2={y} className="stroke-border" />
              <text x={lx} y={ly} textAnchor={Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end'} dominantBaseline="middle" className="fill-muted-foreground text-[10px]">{a}</text>
            </g>
          );
        })}
        {series.map((s, si) => (
          <g key={s.name} className={cn(s.color ?? palette[si % palette.length], 'transition-opacity', focus !== null && focus !== si && 'opacity-20')}>
            <polygon points={poly(s.values)} fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            {s.values.map((v, i) => <circle key={i} cx={pt(i, v)[0]} cy={pt(i, v)[1]} r="3" fill="currentColor"><title>{`${s.name} · ${axes[i]}: ${v}`}</title></circle>)}
          </g>
        ))}
      </svg>
      {series.length > 0 && (
        <figcaption className="flex flex-wrap justify-center gap-x-4 text-xs text-muted-foreground">
          {series.map((s, si) => (
            <button key={s.name} type="button" onMouseEnter={() => setFocus(si)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(si)} onBlur={() => setFocus(null)} className="flex items-center gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <span className={cn('size-2 rounded-full bg-current', s.color ?? palette[si % palette.length])} />{s.name}
            </button>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
