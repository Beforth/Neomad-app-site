import * as React from 'react';
import { PauseIcon, PlayIcon, RefreshIcon } from './icons';
import { Button } from './button';
import { cn } from '@/lib/utils';

const fmt = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor(ms / 1000) % 60;
  const c = Math.floor(ms / 10) % 100;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
};

/** Start, pause, lap and reset. Keeps counting from where it paused. */
export function Stopwatch({ className }: { className?: string }) {
  const [ms, setMs] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [laps, setLaps] = React.useState<number[]>([]);
  const base = React.useRef(0);
  React.useEffect(() => {
    if (!running) return;
    const t0 = performance.now() - base.current;
    let raf = 0;
    const tick = () => {
      base.current = performance.now() - t0;
      setMs(base.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  const reset = () => { setRunning(false); setMs(0); base.current = 0; setLaps([]); };
  return (
    <div className={cn('grid w-64 gap-4', className)}>
      <p className="text-center font-mono text-4xl font-semibold tabular-nums tracking-tight" role="timer" aria-live="off">{fmt(ms)}</p>
      <div className="flex justify-center gap-2">
        <Button variant={running ? 'outline' : 'primary'} onClick={() => setRunning(!running)}>{running ? <><PauseIcon /> Pause</> : <><PlayIcon /> {ms ? 'Resume' : 'Start'}</>}</Button>
        <Button variant="outline" disabled={!running} onClick={() => setLaps((l) => [ms, ...l])}>Lap</Button>
        <Button variant="ghost" size="icon" aria-label="Reset" disabled={!ms} onClick={reset}><RefreshIcon /></Button>
      </div>
      {laps.length > 0 && (
        <ol className="max-h-32 divide-y overflow-auto rounded-lg border text-sm">
          {laps.map((l, i) => (
            <li key={laps.length - i} className="flex animate-pop justify-between px-3 py-1.5 tabular-nums">
              <span className="text-muted-foreground">Lap {laps.length - i}</span>
              <span className="font-mono">{fmt(l)}{i < laps.length - 1 && <span className="ml-2 text-xs text-muted-foreground">+{fmt(l - laps[i + 1])}</span>}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
