import * as React from 'react';
import { cn } from '@/lib/utils';

/** Renders only the rows in view, so 100,000 items scroll as smoothly as 100. Rows must share one fixed `rowHeight`. */
export function VirtualList<T>({
  items,
  rowHeight,
  height = 360,
  overscan = 6,
  renderRow,
  getKey,
  className,
  ...props
}: {
  items: T[];
  rowHeight: number;
  height?: number;
  /** Extra rows drawn above and below the view, so fast scrolling does not flash blank. */
  overscan?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  getKey?: (item: T, index: number) => React.Key;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>) {
  const [top, setTop] = React.useState(0);
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((top + height) / rowHeight) + overscan);
  return (
    <div
      role="list"
      tabIndex={0}
      {...props}
      onScroll={(e) => setTop(e.currentTarget.scrollTop)}
      style={{ height }}
      className={cn('relative overflow-auto rounded-lg border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/40', className)}
    >
      <div style={{ height: items.length * rowHeight }}>
        {items.slice(start, end).map((item, i) => (
          <div
            key={getKey ? getKey(item, start + i) : start + i}
            role="listitem"
            aria-posinset={start + i + 1}
            aria-setsize={items.length}
            style={{ position: 'absolute', insetInline: 0, top: (start + i) * rowHeight, height: rowHeight }}
          >
            {renderRow(item, start + i)}
          </div>
        ))}
      </div>
    </div>
  );
}
