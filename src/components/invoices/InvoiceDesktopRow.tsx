import { memo, useCallback } from 'react';
import {
  Download,
  ClipboardCheck,
  UserPlus,
  XCircle,
  RotateCcw,
  Trash2,
  Banknote,
} from 'lucide-react';
import type { ApiInvoice } from '../../lib/api';
import { InvoiceIconTooltip } from './InvoiceIconTooltip';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export interface InvoiceDesktopRowProps {
  invoice: ApiInvoice;
  assigneeLabel: string;
  travel: string;
  waiting: string;
  userRole: string | undefined;
  onOpenDetail: (inv: ApiInvoice) => void;
  /** Open full-page signed document preview */
  onOpenSignedPreview: (invoiceId: number) => void;
  onDownloadInvoice: (inv: ApiInvoice) => void;
  onConfirmPayment: (inv: ApiInvoice) => void;
  onAssign: (id: number) => void;
  onRequestCancel: (inv: ApiInvoice) => void;
  onRequestRestore: (inv: ApiInvoice) => void;
  onRequestDelete: (inv: ApiInvoice) => void;
}

function InvoiceDesktopRowInner({
  invoice,
  assigneeLabel,
  travel,
  waiting,
  userRole,
  onOpenDetail,
  onOpenSignedPreview,
  onDownloadInvoice,
  onConfirmPayment,
  onAssign,
  onRequestCancel,
  onRequestRestore,
  onRequestDelete,
}: InvoiceDesktopRowProps) {
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <tr
      className="hover:bg-zinc-50/50 transition-colors cursor-pointer border-b border-zinc-50"
      onClick={() => onOpenDetail(invoice)}
    >
      <td className="px-4 py-3">
        <span className="text-xs font-bold text-zinc-900">{invoice.invoice_number}</span>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-zinc-900">{invoice.hospital_name}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status] || 'bg-zinc-100 text-zinc-700'}`}
        >
          {invoice.status}
        </span>
      </td>
      <td className="px-4 py-3 overflow-visible">
        <div className="flex items-center gap-1.5">
          {invoice.signed_copy_url ? (
            <InvoiceIconTooltip label="View signed copy">
              <button
                type="button"
                className="relative group/thumb w-10 h-10 rounded-lg overflow-hidden border border-emerald-100 shadow-sm cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSignedPreview(invoice.id);
                }}
                aria-label="View signed copy"
              >
                <img src={invoice.signed_copy_url} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" alt="" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                  <ClipboardCheck size={12} className="text-white" />
                </div>
              </button>
            </InvoiceIconTooltip>
          ) : (
            <InvoiceIconTooltip label="No signed copy yet">
              <div
                className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-300"
                aria-hidden
              >
                <ClipboardCheck size={16} />
              </div>
            </InvoiceIconTooltip>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-zinc-600">{assigneeLabel}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-zinc-500">{travel}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-amber-600">{waiting}</p>
      </td>
      <td className="px-4 py-3 text-[10px] font-medium text-zinc-400">
        {new Date(invoice.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 overflow-visible" onClick={stop}>
        <div className="flex items-center gap-1">
          <InvoiceIconTooltip label="Download invoice">
            <button
              type="button"
              onClick={() => onDownloadInvoice(invoice)}
              disabled={!invoice.signed_copy_url}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Download invoice"
            >
              <Download size={14} />
            </button>
          </InvoiceIconTooltip>
          {invoice.status === 'delivered' &&
            (userRole === 'admin' || userRole === 'manager') &&
            ((invoice.cash_received ?? 0) > 0 || (invoice.cheque_received ?? 0) > 0) && (
              <InvoiceIconTooltip label="Confirm payment">
                <button
                  type="button"
                  onClick={() => onConfirmPayment(invoice)}
                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                  aria-label="Confirm payment"
                >
                  <Banknote size={14} />
                </button>
              </InvoiceIconTooltip>
            )}
          {invoice.status !== 'delivered' && invoice.status !== 'cancelled' && (
            <InvoiceIconTooltip label="Assign delivery">
              <button
                type="button"
                onClick={() => onAssign(invoice.id)}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Assign delivery"
              >
                <UserPlus size={14} />
              </button>
            </InvoiceIconTooltip>
          )}
          {(invoice.status === 'pending' || invoice.status === 'assigned') && (
            <InvoiceIconTooltip label="Void invoice">
              <button
                type="button"
                onClick={() => onRequestCancel(invoice)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Void invoice"
              >
                <XCircle size={14} />
              </button>
            </InvoiceIconTooltip>
          )}
          {invoice.status === 'cancelled' && (userRole === 'admin' || userRole === 'manager') && (
            <InvoiceIconTooltip label="Restore to pending">
              <button
                type="button"
                onClick={() => onRequestRestore(invoice)}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                aria-label="Restore to pending"
              >
                <RotateCcw size={14} />
              </button>
            </InvoiceIconTooltip>
          )}
          {(userRole === 'admin' || userRole === 'manager') && (
            <InvoiceIconTooltip label="Delete invoice">
              <button
                type="button"
                onClick={() => onRequestDelete(invoice)}
                className="p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                aria-label="Delete invoice"
              >
                <Trash2 size={14} />
              </button>
            </InvoiceIconTooltip>
          )}
        </div>
      </td>
    </tr>
  );
}

function propsEqual(prev: InvoiceDesktopRowProps, next: InvoiceDesktopRowProps) {
  return (
    prev.invoice === next.invoice &&
    prev.assigneeLabel === next.assigneeLabel &&
    prev.travel === next.travel &&
    prev.waiting === next.waiting &&
    prev.userRole === next.userRole &&
    prev.onOpenDetail === next.onOpenDetail &&
    prev.onOpenSignedPreview === next.onOpenSignedPreview &&
    prev.onDownloadInvoice === next.onDownloadInvoice &&
    prev.onConfirmPayment === next.onConfirmPayment &&
    prev.onAssign === next.onAssign &&
    prev.onRequestCancel === next.onRequestCancel &&
    prev.onRequestRestore === next.onRequestRestore &&
    prev.onRequestDelete === next.onRequestDelete
  );
}

export const InvoiceDesktopRow = memo(InvoiceDesktopRowInner, propsEqual);
