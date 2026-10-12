import * as React from 'react';
import { cn } from '@/lib/utils';

/** Text with a light sweep passing over it. Good for "new" labels and loading copy. */
export function ShimmerText({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('animate-shimmer bg-[linear-gradient(110deg,var(--muted-foreground)_40%,var(--foreground)_50%,var(--muted-foreground)_60%)] bg-[length:200%_100%] bg-clip-text text-transparent', className)}
      {...props}
    />
  );
}
