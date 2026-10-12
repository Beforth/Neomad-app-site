import * as React from 'react';
import { cn } from '@/lib/utils';

function parts(tz?: string) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date());
  const get = (t: string) => Number(f.find((p) => p.type === t)?.value);
  return { h: get('hour') % 24, m: get('minute'), s: get('second') };
}

/** SVG clock that shows the real time in any IANA time zone. The second hand ticks with a little bounce. */
export function AnalogClock({ timeZone, size = 160, className }: { timeZone?: string; size?: number; className?: string }) {
  const [t, setT] = React.useState(() => parts(timeZone));
  const secAngle = React.useRef(parts(timeZone).s * 6);
  const last = React.useRef(t.s);
  React.useEffect(() => {
    const id = setInterval(() => {
      const p = parts(timeZone);
      if (p.s !== last.current) {
        secAngle.current += ((p.s - last.current + 60) % 60) * 6;
        last.current = p.s;
      }
      setT(p);
    }, 250);
    return () => clearInterval(id);
  }, [timeZone]);
  const hand = (deg: number, len: number, w: number, extra?: React.CSSProperties) => (
    <line x1="50" y1="50" x2="50" y2={50 - len} strokeWidth={w} strokeLinecap="round" style={{ transformOrigin: '50px 50px', transform: `rotate(${deg}deg)`, ...extra }} />
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Clock: ${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`} className={cn('text-foreground', className)}>
      <circle cx="50" cy="50" r="48" className="fill-card stroke-border" strokeWidth="1.5" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="50" y1={i % 5 ? 4.5 : 3.5} x2="50" y2={i % 5 ? 5.8 : 8} strokeWidth={i % 5 ? 0.4 : 1} className={i % 5 ? 'stroke-muted-foreground/50' : 'stroke-foreground/70'} style={{ transformOrigin: '50px 50px', transform: `rotate(${i * 6}deg)` }} />
      ))}
      <g stroke="currentColor">
        {hand(((t.h % 12) + t.m / 60) * 30, 24, 2.6)}
        {hand((t.m + t.s / 60) * 6, 35, 1.8)}
      </g>
      <g className="stroke-primary">
        {hand(secAngle.current, 40, 0.9, { transition: 'transform 0.35s cubic-bezier(0.4, 2.3, 0.6, 1)' })}
      </g>
      <circle cx="50" cy="50" r="2.4" className="fill-primary" />
    </svg>
  );
}
