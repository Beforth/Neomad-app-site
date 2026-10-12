import * as React from 'react';
import { cn } from '@/lib/utils';

/** Before/after image slider. Drag the handle, or focus it and use arrow keys. */
export function Compare({ before, after, className }: { before: string; after: string; className?: string }) {
  const [pos, setPos] = React.useState(50);
  const box = React.useRef<HTMLDivElement>(null);
  const move = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={box}
      className={cn('relative aspect-video select-none overflow-hidden rounded-xl border touch-none', className)}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
    >
      <img src={after} alt="After" draggable={false} className="absolute inset-0 size-full object-cover" />
      <img src={before} alt="Before" draggable={false} className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgb(0_0_0/0.4)]" style={{ left: `${pos}%` }}>
        <button
          type="button"
          role="slider"
          aria-label="Compare"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5)); if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5)); }}
          className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-white text-xs text-black shadow-lg outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
        >
          ⇆
        </button>
      </div>
    </div>
  );
}
