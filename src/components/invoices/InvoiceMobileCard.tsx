import { memo } from 'react';
import { Users, ClipboardCheck } from 'lucide-react';
import type { ApiInvoice } from '../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export interface InvoiceMobileCardProps {
  invoice: ApiInvoice;
  assigneeLabel: string;
  onOpenDetail: (inv: ApiInvoice) => void;
}

function InvoiceMobileCardInner({ invoice, assigneeLabel, onOpenDetail }: InvoiceMobileCardProps) {
  return (
    <div
      className="p-4 space-y-2 active:bg-zinc-50 border-b border-zinc-100 cursor-pointer"
      onClick={() => onOpenDetail(invoice)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(invoice);
        }
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-zinc-400">{invoice.invoice_number}</p>
          <p className="font-bold text-zinc-900">{invoice.hospital_name}</p>
          {assigneeLabel !== '—' && (
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <Users size={12} /> {assigneeLabel}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status] || 'bg-zinc-100 text-zinc-700'}`}
          >
            {invoice.status}
          </span>
          {invoice.signed_copy_url && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
              <ClipboardCheck size={10} /> Signed
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between items-end">
        <p className="text-sm font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p>
        <p className="text-[10px] text-zinc-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function mobilePropsEqual(a: InvoiceMobileCardProps, b: InvoiceMobileCardProps) {
  return a.invoice === b.invoice && a.assigneeLabel === b.assigneeLabel && a.onOpenDetail === b.onOpenDetail;
}

export const InvoiceMobileCard = memo(InvoiceMobileCardInner, mobilePropsEqual);
