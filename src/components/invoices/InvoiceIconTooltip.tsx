import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * Hover tooltip for invoice table action icons. Placed below the trigger to reduce clipping in overflow-x tables.
 */
export function InvoiceIconTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative inline-flex group/inv-tip">
      {children}
      <Badge className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1.5 -translate-x-1/2 opacity-0 whitespace-nowrap whitespace-nowrap"
        role="tooltip"
        
      >
        {label}
      </Badge>
    </span>
  );
}
