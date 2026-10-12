import * as React from 'react';
import { cn } from '@/lib/utils';

/** Card with a soft glow and border highlight that follow the cursor. */
export function SpotlightCard({ className, children, onMouseMove, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
    onMouseMove?.(e);
  };
  return (
    <div
      onMouseMove={move}
      className={cn('group relative overflow-hidden rounded-xl border bg-card p-5 transition-transform duration-300 hover:-translate-y-0.5', className)}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(260px circle at var(--x,50%) var(--y,50%), color-mix(in srgb, var(--primary) 14%, transparent), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          padding: 1,
          background: 'radial-gradient(180px circle at var(--x,50%) var(--y,50%), var(--primary), transparent 70%)',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
