import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Two panels with a draggable divider. Drag it, or focus it and use the arrow keys (Home and End jump to the limits).
 * Sizes are percentages of the container. Give the container a height, e.g. `className="h-80"`.
 */
export function SplitPane({
  children,
  direction = 'horizontal',
  defaultSize = 40,
  min = 15,
  max = 85,
  className,
}: {
  children: [React.ReactNode, React.ReactNode];
  /** horizontal = side by side, vertical = stacked. */
  direction?: 'horizontal' | 'vertical';
  /** First panel size in percent. */
  defaultSize?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [size, setSize] = React.useState(defaultSize);
  const box = React.useRef<HTMLDivElement>(null);
  const row = direction === 'horizontal';
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = box.current!.getBoundingClientRect();
    setSize(clamp(row ? ((e.clientX - r.left) / r.width) * 100 : ((e.clientY - r.top) / r.height) * 100));
  };
  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const back = row ? 'ArrowLeft' : 'ArrowUp';
    const fwd = row ? 'ArrowRight' : 'ArrowDown';
    if (e.key === back) setSize((s) => clamp(s - step));
    else if (e.key === fwd) setSize((s) => clamp(s + step));
    else if (e.key === 'Home') setSize(min);
    else if (e.key === 'End') setSize(max);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={box} className={cn('flex overflow-hidden rounded-xl border bg-card', row ? 'flex-row' : 'flex-col', className)}>
      <div className="min-h-0 min-w-0 overflow-auto" style={{ flexBasis: `${size}%` }}>{children[0]}</div>
      <div
        role="separator"
        aria-orientation={row ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(size)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && drag(e)}
        onKeyDown={key}
        className={cn('group relative shrink-0 touch-none bg-border outline-none transition-colors hover:bg-primary/60 focus-visible:bg-primary data-[dragging]:bg-primary', row ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize')}
      >
        <span className={cn('absolute', row ? '-inset-x-1.5 inset-y-0' : '-inset-y-1.5 inset-x-0')} />
        <span className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border ring-4 ring-card transition-colors group-hover:bg-primary group-focus-visible:bg-primary', row ? 'h-8 w-1' : 'h-1 w-8')} />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children[1]}</div>
    </div>
  );
}
