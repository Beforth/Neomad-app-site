import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger' | 'warning';
}

const tones = { default: 'bg-secondary text-foreground', primary: 'bg-primary text-primary-foreground', danger: 'bg-destructive text-white', warning: 'bg-warning text-white' };
const W = 76;

/**
 * List row you swipe left (touch or mouse drag) to reveal action buttons behind it. Release past half to keep it open.
 * Keyboard: focus the row and press Left arrow to open, Right or Escape to close. Put it around one row at a time.
 */
export function SwipeActions({ actions, children, className }: { actions: SwipeAction[]; children: React.ReactNode; className?: string }) {
  const max = actions.length * W;
  const [x, setX] = React.useState(0);
  const [drag, setDrag] = React.useState(false);
  const start = React.useRef<{ px: number; x0: number; moved: boolean } | null>(null);
  const clamp = (n: number) => Math.min(0, Math.max(-max, n));

  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-card', className)}>
      <div className="absolute inset-y-0 right-0 flex" style={{ width: max }} aria-hidden={x === 0}>
        {actions.map((a) => (
          <button key={a.label} type="button" tabIndex={x === 0 ? -1 : 0} onClick={() => { setX(0); a.onClick(); }} style={{ width: W }} className={cn('flex flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 [&_svg]:size-5', tones[a.tone ?? 'default'])}>
            {a.icon}{a.label}
          </button>
        ))}
      </div>
      <div
        tabIndex={0}
        onPointerDown={(e) => { start.current = { px: e.clientX, x0: x, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.px;
          if (!s.moved && Math.abs(dx) < 6) return;
          s.moved = true;
          setDrag(true);
          setX(clamp(s.x0 + dx));
        }}
        onPointerUp={() => { const moved = start.current?.moved; start.current = null; setDrag(false); if (moved) setX((v) => (v < -max / 2 ? -max : 0)); }}
        onPointerCancel={() => { start.current = null; setDrag(false); setX((v) => (v < -max / 2 ? -max : 0)); }}
        onClickCapture={(e) => { if (x !== 0 && !drag) { e.stopPropagation(); e.preventDefault(); setX(0); } }}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') setX(-max); else if (e.key === 'ArrowRight' || e.key === 'Escape') setX(0); }}
        style={{ transform: `translateX(${x}px)` }}
        className={cn('relative touch-pan-y select-none bg-card outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40', !drag && 'transition-transform duration-200')}
      >
        {children}
      </div>
    </div>
  );
}
