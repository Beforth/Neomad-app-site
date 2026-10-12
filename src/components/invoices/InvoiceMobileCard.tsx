import { memo } from 'react';
import { Users, ClipboardCheck } from 'lucide-react';
import type { ApiInvoice } from '../../lib/api';
import { formatDateTimeIST } from '../../lib/timeUtils';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  assigned: 'bg-info/15 text-info',
  delivered: 'bg-primary/15 text-accent-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
};

const TYPE_LABELS: Record<string, string> = {
  challan: 'Challan',
  price_difference: 'Price Diff',
  sale_bill: 'Sale Bill',
  sale_return_credit_note: 'Sale Return',
};

const TYPE_COLORS: Record<string, string> = {
  challan: 'bg-warning/10 text-warning',
  price_difference: 'bg-info/10 text-info',
  sale_bill: 'bg-accent text-primary',
  sale_return_credit_note: 'bg-purple-50 text-purple-600',
};

const typeLabel = (t: string | null | undefined) => TYPE_LABELS[t ?? ''] || t || 'Sale Bill';
const typeColor = (t: string | null | undefined) => TYPE_COLORS[t ?? ''] || (t ? 'bg-muted text-muted-foreground' : 'bg-accent text-primary');

export interface InvoiceMobileCardProps {
  invoice: ApiInvoice;
  assigneeLabel: string;
  onOpenDetail: (inv: ApiInvoice) => void;
}

function InvoiceMobileCardInner({ invoice, assigneeLabel, onOpenDetail }: InvoiceMobileCardProps) {
  return (
    <div
      className="p-4 space-y-2 active:bg-muted border-b border-border cursor-pointer"
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
          <p className="text-xs font-semibold text-muted-foreground/70">{invoice.invoice_number}</p>
          <p className="font-semibold text-foreground">{invoice.hospital_name}</p>
          <div className="mt-1">
            {invoice.invoice_type ? (
              <Badge className={`${typeColor(invoice.invoice_type)}`}>
                {typeLabel(invoice.invoice_type)}
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground/50">—</span>
            )}
          </div>
          {assigneeLabel !== '—' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={12} /> {assigneeLabel}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge
            className={`capitalize ${STATUS_COLORS[invoice.status] || 'bg-secondary text-foreground/85'}`}
          >
            {invoice.status}
          </Badge>
          {invoice.signed_copy_url && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-accent px-1.5 py-0.5 rounded-lg border border-primary/20">
              <ClipboardCheck size={10} /> Signed
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between items-end">
        <p className="text-sm font-semibold text-foreground">₹{invoice.amount.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground">{formatDateTimeIST(invoice.created_at)}</p>
      </div>
    </div>
  );
}

function mobilePropsEqual(a: InvoiceMobileCardProps, b: InvoiceMobileCardProps) {
  return a.invoice === b.invoice && a.assigneeLabel === b.assigneeLabel && a.onOpenDetail === b.onOpenDetail;
}

export const InvoiceMobileCard = memo(InvoiceMobileCardInner, mobilePropsEqual);
