import * as React from 'react';
import { cn } from '@/lib/utils';

/** Endless horizontal scroll with soft edge fade. Pauses on hover. */
export function Marquee({
  children,
  speed = 30,
  reverse = false,
  className,
}: {
  children: React.ReactNode;
  /** Seconds per loop. */
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn('group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]', className)}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden={i === 1}
          className="flex min-w-full shrink-0 animate-marquee items-center justify-around gap-8 pr-8 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
