import * as React from 'react';
import { cn } from '@/lib/utils';

/** Wrapper with a light beam that travels around the border. Great for a featured card or primary CTA. */
export function BorderBeam({
  className,
  children,
  duration = 4,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { duration?: number }) {
  return (
    <div className={cn('relative rounded-xl bg-card', className)} {...props}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] animate-beam motion-reduce:hidden"
        style={{
          padding: 1.5,
          animationDuration: `${duration}s`,
          background: 'conic-gradient(from var(--beam-angle), transparent 0 70%, var(--primary) 90%, transparent)',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
        }}
      />
      <div className="relative h-full rounded-[inherit] border">{children}</div>
    </div>
  );
}
