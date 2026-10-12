import * as React from 'react';
import { StarIcon } from './icons';
import { cn } from '@/lib/utils';

/** Star rating. Interactive when onValueChange is given, otherwise read-only. */
export function Rating({
  value,
  onValueChange,
  max = 5,
  className,
}: {
  value: number;
  onValueChange?: (v: number) => void;
  max?: number;
  className?: string;
}) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;
  return (
    <div className={cn('inline-flex gap-0.5', className)} role={onValueChange ? 'radiogroup' : 'img'} aria-label={`${value} of ${max} stars`} onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const star = <StarIcon className={cn('size-5 transition-all duration-150', n <= shown ? 'fill-warning text-warning' : 'text-border', onValueChange && n === hover && 'scale-125')} />;
        return onValueChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? 's' : ''}`} onMouseEnter={() => setHover(n)} onClick={() => onValueChange(n === value ? 0 : n)} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}
