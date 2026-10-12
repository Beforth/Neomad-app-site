import * as React from 'react';
import { cn } from '@/lib/utils';

/** Card that tilts toward the cursor in 3D with a moving sheen. */
export function TiltCard({ className, children, max = 10, ...props }: React.HTMLAttributes<HTMLDivElement> & { max?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(700px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) scale(1.02)`;
    el.style.setProperty('--sx', `${px * 100}%`);
    el.style.setProperty('--sy', `${py * 100}%`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={() => { ref.current!.style.transform = ''; }}
      className={cn('group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-transform duration-200 ease-out will-change-transform', className)}
      {...props}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(400px circle at var(--sx,50%) var(--sy,50%), rgb(255 255 255 / 0.18), transparent 60%)' }} />
      <div className="relative">{children}</div>
    </div>
  );
}
