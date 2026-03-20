import type { ReactNode } from 'react';

/**
 * Hover tooltip for invoice table action icons. Placed below the trigger to reduce clipping in overflow-x tables.
 */
export function InvoiceIconTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative inline-flex group/inv-tip">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1.5 -translate-x-1/2 rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/inv-tip:opacity-100 whitespace-nowrap"
      >
        {label}
      </span>
    </span>
  );
}
