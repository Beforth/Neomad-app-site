import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface KpiItem {
  label: string;
  value: ReactNode;
  /** Highlights the number (for things that need attention). */
  tone?: 'default' | 'warning' | 'danger';
  [extra: string]: unknown;
}

/** One compact row of headline numbers. Replaces a grid of separate stat cards. */
export default function KpiStrip({ items, className }: { items: KpiItem[]; className?: string }) {
  const cols = items.length >= 6 ? 'md:grid-cols-6' : items.length === 5 ? 'md:grid-cols-5' : items.length === 4 ? 'md:grid-cols-4' : items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn('grid grid-cols-2 divide-x divide-y md:divide-y-0', cols)}>
        {items.map((it) => (
          <div key={it.label} className="px-4 py-3">
            <span className="block text-xs text-muted-foreground">{it.label}</span>
            <span className={cn('mt-0.5 block text-xl font-semibold tabular-nums tracking-tight',
              it.tone === 'warning' && 'text-warning', it.tone === 'danger' && 'text-destructive')}>
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
