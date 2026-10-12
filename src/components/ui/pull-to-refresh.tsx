import * as React from 'react';
import { RefreshIcon } from './icons';
import { cn } from '@/lib/utils';

/**
 * Scrolling area you pull down from the top to refresh (touch or mouse drag). `onRefresh` returns a promise; the spinner stays until it settles.
 * Give it a height, e.g. `className="h-80"`. Without a drag it behaves like a normal scroll box.
 */
export function PullToRefresh({ onRefresh, children, threshold = 64, className }: { onRefresh: () => Promise<unknown> | void; children: React.ReactNode; threshold?: number; className?: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  const [pull, setPull] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const live = React.useRef({ y0: 0, active: false, pull: 0, busy: false });

  const finish = React.useCallback(async () => {
    const L = live.current;
    L.active = false;
    if (L.pull >= threshold && !L.busy) {
      L.busy = true;
      setBusy(true);
      setPull(threshold * 0.7);
      try { await onRefresh(); } finally { L.busy = false; setBusy(false); }
    }
    L.pull = 0;
    setPull(0);
  }, [onRefresh, threshold]);

  React.useEffect(() => {
    const el = box.current!;
    const L = live.current;
    const begin = (y: number) => { if (el.scrollTop <= 0 && !L.busy) { L.y0 = y; L.active = true; } };
    const move = (y: number, e: Event) => {
      if (!L.active) return;
      const d = y - L.y0;
      if (d <= 0) { L.pull = 0; setPull(0); return; }
      if (e.cancelable) e.preventDefault();
      L.pull = Math.min(threshold * 1.6, d * 0.5);
      setPull(L.pull);
    };
    const ts = (e: TouchEvent) => begin(e.touches[0].clientY);
    const tm = (e: TouchEvent) => move(e.touches[0].clientY, e);
    const md = (e: MouseEvent) => begin(e.clientY);
    const mm = (e: MouseEvent) => move(e.clientY, e);
    const up = () => { if (L.active) void finish(); };
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('mousedown', md);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', up);
    return () => {
      el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', up);
      el.removeEventListener('mousedown', md); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', up);
    };
  }, [finish, threshold]);

  const ready = pull >= threshold;
  return (
    <div ref={box} className={cn('relative overflow-y-auto overscroll-contain', className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 grid place-items-center" style={{ height: pull }}>
        <span className={cn('grid size-8 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm transition-opacity', pull > 8 || busy ? 'opacity-100' : 'opacity-0', ready && 'text-primary')}>
          <RefreshIcon className={cn('size-4', busy && 'animate-spin')} style={busy ? undefined : { transform: `rotate(${Math.min(pull / threshold, 1) * 270}deg)` }} />
        </span>
      </div>
      <div className={cn(!live.current.active && 'transition-transform duration-200')} style={{ transform: `translateY(${pull}px)` }}>{children}</div>
    </div>
  );
}
