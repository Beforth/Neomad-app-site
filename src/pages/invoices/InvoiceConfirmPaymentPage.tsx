import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearInvoicesError, confirmPaymentThunk } from '../../features/invoices/invoicesSlice';
import { useInvoiceLoader } from './useInvoiceLoader';
import {
  getInstallmentRows,
  INSTALLMENT_STATUS_LABEL,
  INSTALLMENT_STATUS_STYLE,
  parseInvoiceRouteId,
} from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';

export default function InvoiceConfirmPaymentPage() {
  const { invoiceId: idParam } = useParams<{ invoiceId: string }>();
  const id = parseInvoiceRouteId(idParam);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sliceError = useAppSelector((s) => s.invoices.error);
  const { invoice, loading, error } = useInvoiceLoader(token, id);
  const [busy, setBusy] = useState(false);

  if (id == null) {
    return (
      <InvoiceSectionFrame context="Invalid link">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-red-700 bg-red-50/50`}>Invalid invoice in URL.</div>
      </InvoiceSectionFrame>
    );
  }

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <InvoiceSectionFrame context="Access denied">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-zinc-600`}>
          You don&apos;t have access to confirm payments.
        </div>
      </InvoiceSectionFrame>
    );
  }

  if (loading && !invoice) {
    return (
      <InvoiceSectionFrame context="Loading…">
        <div className={`${invoiceInnerCardClassName()} px-4 py-12 text-center text-sm text-zinc-400 animate-pulse`}>Loading…</div>
      </InvoiceSectionFrame>
    );
  }

  if (error || !invoice) {
    return (
      <InvoiceSectionFrame context="Error">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-red-700 bg-red-50/50`}>{error || 'Not found'}</div>
      </InvoiceSectionFrame>
    );
  }

  const canConfirm =
    invoice.status === 'delivered' && ((invoice.cash_received ?? 0) > 0 || (invoice.cheque_received ?? 0) > 0);

  async function onConfirm() {
    if (!token || !canConfirm) return;
    setBusy(true);
    dispatch(clearInvoicesError());
    try {
      await dispatch(confirmPaymentThunk({ token, invoice })).unwrap();
      navigate(`/invoices/${invoice.id}`);
    } catch {
      /* slice */
    } finally {
      setBusy(false);
    }
  }

  return (
    <InvoiceSectionFrame
      context={`Confirm payment · ${invoice.invoice_number} · ${invoice.hospital_name}`}
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy || !canConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 shadow-sm shadow-emerald-100 disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> Confirm
          </button>
        </div>
      }
    >
      {sliceError ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">{sliceError}</div>
      ) : null}

      <div className={invoiceInnerCardClassName()}>
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Installment schedule &amp; status</p>
        </div>

        {!canConfirm ? (
          <div className="p-6 text-sm text-zinc-600">
            This invoice cannot be confirmed from this screen (must be delivered with cash or cheque).
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <span>Installment</span>
                <span className="text-right">Amount</span>
                <span className="text-right min-w-[7rem]">Status</span>
              </div>
              <ul className="divide-y divide-zinc-100">
                {getInstallmentRows(invoice).map((row) => (
                  <li key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-3 items-center bg-white">
                    <span className="text-sm font-bold text-zinc-800 leading-tight">{row.label}</span>
                    <span className="text-sm font-black text-zinc-900 tabular-nums text-right">₹{row.amount.toLocaleString()}</span>
                    <span className="flex justify-end">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${INSTALLMENT_STATUS_STYLE[row.status]}`}
                      >
                        {INSTALLMENT_STATUS_LABEL[row.status]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Invoice total</span>
              <span className="text-xl font-black text-emerald-600 tabular-nums">₹{invoice.amount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </InvoiceSectionFrame>
  );
}
