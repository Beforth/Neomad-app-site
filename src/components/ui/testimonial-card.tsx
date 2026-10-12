import * as React from 'react';
import { Avatar } from './avatar';
import { StarIcon } from './icons';
import { cn } from '@/lib/utils';

/** Customer quote with name, role and optional star rating. */
export function TestimonialCard({
  quote,
  name,
  role,
  src,
  rating,
  className,
}: {
  quote: string;
  name: string;
  role?: string;
  src?: string;
  /** 1 to 5 */
  rating?: number;
  className?: string;
}) {
  return (
    <figure className={cn('flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground', className)}>
      {rating != null && (
        <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} className={cn('size-4', n <= rating ? 'fill-warning text-warning' : 'text-border')} />)}
        </div>
      )}
      <blockquote className="flex-1 text-[14px] leading-relaxed">“{quote}”</blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar name={name} src={src} size="md" />
        <div className="text-[13px] leading-tight"><p className="font-semibold">{name}</p>{role && <p className="text-muted-foreground">{role}</p>}</div>
      </figcaption>
    </figure>
  );
}
