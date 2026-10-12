import * as React from 'react';
import { PauseIcon, PlayIcon, RefreshIcon } from './icons';
import { Button } from './button';
import { cn } from '@/lib/utils';

const mmss = (s: number) => {
  const t = Math.ceil(s);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** Countdown with a ring that drains smoothly. Pick a preset, start, pause. Calls onDone at zero. */
export function Timer({
  presets = [1, 5, 10, 25],
  defaultMinutes = 5,
  onDone,
  className,
}: {
  /** Preset lengths in minutes. */
  presets?: number[];
  defaultMinutes?: number;
  onDone?: () => void;
  className?: string;
}) {
  const [total, setTotal] = React.useState(defaultMinutes * 60);
  const [left, setLeft] = React.useState(defaultMinutes * 60);
  const [running, setRunning] = React.useState(false);
  const rest = React.useRef(left);
  const done = React.useRef(onDone);
  done.current = onDone;
  React.useEffect(() => {
    if (!running) return;
    const end = performance.now() + rest.current * 1000;
    let raf = 0;
    const tick = () => {
      const l = Math.max(0, (end - performance.now()) / 1000);
      rest.current = l;
      setLeft(l);
      if (l <= 0) { setRunning(false); done.current?.(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  const choose = (min: number) => { setRunning(false); setTotal(min * 60); setLeft(min * 60); rest.current = min * 60; };
  const r = 54;
  const c = 2 * Math.PI * r;
  const finished = left <= 0;
  return (
    <div className={cn('grid justify-items-center gap-4', className)}>
      <div className="relative grid size-36 place-items-center" role="timer" aria-label={mmss(left)}>
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="7" className="stroke-secondary" />
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} className={cn('transition-colors', finished ? 'stroke-success' : 'stroke-primary')} />
        </svg>
        <span className="font-mono text-3xl font-semibold tabular-nums">{finished ? 'Done' : mmss(left)}</span>
      </div>
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => choose(p)} aria-pressed={total === p * 60} className="h-7 rounded-full border px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground">{p} min</button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => (finished ? choose(total / 60) : setRunning(!running))}>{running ? <><PauseIcon /> Pause</> : <><PlayIcon /> {finished ? 'Again' : left < total ? 'Resume' : 'Start'}</>}</Button>
        <Button variant="ghost" size="icon" aria-label="Reset" onClick={() => choose(total / 60)}><RefreshIcon /></Button>
      </div>
    </div>
  );
}
