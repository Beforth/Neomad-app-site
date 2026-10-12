import * as React from 'react';
import { cn } from '@/lib/utils';

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [['Days', Math.floor(s / 86400)], ['Hours', Math.floor(s / 3600) % 24], ['Min', Math.floor(s / 60) % 60], ['Sec', s % 60]] as const;
};

/** Live countdown to a date. Each digit group flips up when it changes. */
export function Countdown({ to, onDone, className }: { to: Date | number; onDone?: () => void; className?: string }) {
  const end = typeof to === 'number' ? to : to.getTime();
  const [left, setLeft] = React.useState(() => end - Date.now());
  React.useEffect(() => {
    const t = setInterval(() => {
      const l = end - Date.now();
      setLeft(l);
      if (l <= 0) { clearInterval(t); onDone?.(); }
    }, 1000);
    return () => clearInterval(t);
  }, [end, onDone]);
  return (
    <div className={cn('flex gap-3', className)} role="timer">
      {parts(left).map(([label, n]) => (
        <div key={label} className="grid w-16 justify-items-center gap-1 rounded-lg border bg-card py-3">
          <span key={n} className="animate-flip text-2xl font-semibold tabular-nums leading-none">{String(n).padStart(2, '0')}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
