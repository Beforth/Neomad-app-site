import { memo, useCallback } from 'react';
import {
  Eye,
  Download,
  ClipboardCheck,
  UserPlus,
  XCircle,
  Trash2,
  Banknote,
} from 'lucide-react';
import type { ApiInvoice } from '../../lib/api';

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
  actionBusy: boolean;
  onOpenDetail: (inv: ApiInvoice) => void;
  onPreviewSigned: (url: string, title: string) => void;
  onConfirmPayment: (inv: ApiInvoice) => void;
  onAssign: (id: number) => void;
  onCancel: (id: number) => void;
  onRequestDelete: (inv: ApiInvoice) => void;
}

function InvoiceDesktopRowInner({
  invoice,
  assigneeLabel,
  travel,
  waiting,
  userRole,
  actionBusy,
  onOpenDetail,
  onPreviewSigned,
  onConfirmPayment,
  onAssign,
  onCancel,
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
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {invoice.signed_copy_url ? (
            <button
              type="button"
              className="relative group w-10 h-10 rounded-lg overflow-hidden border border-emerald-100 shadow-sm cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewSigned(invoice.signed_copy_url!, `Signed Copy — ${invoice.invoice_number}`);
              }}
            >
              <img src={invoice.signed_copy_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye size={12} className="text-white" />
              </div>
            </button>
          ) : (
            <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-300">
              <ClipboardCheck size={16} />
            </div>
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
      <td className="px-4 py-3" onClick={stop}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenDetail(invoice)}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Download Invoice"
          >
            <Download size={14} />
          </button>
          {invoice.status === 'delivered' &&
            userRole === 'admin' &&
            ((invoice.cash_received ?? 0) > 0 || (invoice.cheque_received ?? 0) > 0) && (
              <button
                type="button"
                onClick={() => onConfirmPayment(invoice)}
                disabled={actionBusy}
                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                title="Confirm Payment"
              >
                <Banknote size={14} />
              </button>
            )}
          {invoice.status !== 'delivered' && invoice.status !== 'cancelled' && (
            <button
              type="button"
              onClick={() => onAssign(invoice.id)}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Assign"
            >
              <UserPlus size={14} />
            </button>
          )}
          {(invoice.status === 'pending' || invoice.status === 'assigned') && (
            <button
              type="button"
              onClick={() => onCancel(invoice.id)}
              disabled={actionBusy}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Cancel"
            >
              <XCircle size={14} />
            </button>
          )}
          {(userRole === 'admin' || userRole === 'manager') && (
            <button
              type="button"
              onClick={() => onRequestDelete(invoice)}
              disabled={actionBusy}
              className="p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
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
    prev.actionBusy === next.actionBusy &&
    prev.onOpenDetail === next.onOpenDetail &&
    prev.onPreviewSigned === next.onPreviewSigned &&
    prev.onConfirmPayment === next.onConfirmPayment &&
    prev.onAssign === next.onAssign &&
    prev.onCancel === next.onCancel &&
    prev.onRequestDelete === next.onRequestDelete
  );
}

export const InvoiceDesktopRow = memo(InvoiceDesktopRowInner, propsEqual);
