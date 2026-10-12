import * as React from 'react';
import { CheckIcon } from './icons';
import { Badge } from './badge';
import { BorderBeam } from './border-beam';
import { Button } from './button';
import { NumberTicker } from './number-ticker';
import { cn } from '@/lib/utils';

/** Plan card. Change `price` and the number counts to the new value. `highlighted` adds the travelling border beam and a badge. */
export function PricingCard({
  name,
  price,
  currency = '₹',
  period = '/seat/month',
  description,
  features,
  cta = 'Get started',
  highlighted,
  badge = 'Most popular',
  onSelect,
  className,
}: {
  name: string;
  price: number;
  currency?: string;
  period?: string;
  description?: string;
  features: string[];
  cta?: string;
  highlighted?: boolean;
  badge?: string;
  onSelect?: () => void;
  className?: string;
}) {
  const body = (
    <div className="flex h-full flex-col gap-5 p-6">
      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{name}</h3>
          {highlighted && <Badge variant="primary">{badge}</Badge>}
        </div>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <p className="flex items-baseline gap-1">
        <NumberTicker value={price} prefix={currency} className="text-4xl font-semibold tracking-tight" duration={700} />
        <span className="text-sm text-muted-foreground">{period}</span>
      </p>
      <Button variant={highlighted ? 'primary' : 'outline'} onClick={onSelect}>{cta}</Button>
      <ul className="grid gap-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2"><CheckIcon className="mt-0.5 text-success" weight={2.25} /> {f}</li>
        ))}
      </ul>
    </div>
  );
  return highlighted ? (
    <BorderBeam className={cn('w-72', className)}>{body}</BorderBeam>
  ) : (
    <div className={cn('w-72 rounded-xl border bg-card', className)}>{body}</div>
  );
}
