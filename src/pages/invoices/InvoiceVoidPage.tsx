import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { cancelInvoiceThunk, clearInvoicesError } from '../../features/invoices/invoicesSlice';
import { useInvoiceLoader } from './useInvoiceLoader';
import { parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';

export default function InvoiceVoidPage() {
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
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-zinc-600`}>You don&apos;t have access to void invoices.</div>
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

  const canVoid = invoice.status === 'pending' || invoice.status === 'assigned';

  async function onVoid() {
    if (!token || !canVoid) return;
    setBusy(true);
    dispatch(clearInvoicesError());
    try {
      await dispatch(cancelInvoiceThunk({ token, id: invoice.id })).unwrap();
      navigate(`/invoices/${invoice.id}`);
    } catch {
      /* slice */
    } finally {
      setBusy(false);
    }
  }

  return (
    <InvoiceSectionFrame
      context={`Void invoice · ${invoice.invoice_number} · ${invoice.hospital_name}`}
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Keep invoice
          </button>
          <button
            type="button"
            disabled={busy || !canVoid}
            onClick={() => void onVoid()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <XCircle size={16} /> Void invoice
          </button>
        </div>
      }
    >
      <div className={invoiceInnerCardClassName()}>
        <div className="p-6 space-y-2">
          <p className="text-sm font-bold text-zinc-900">Void this invoice?</p>
          <p className="text-xs text-zinc-500">
            The invoice will be marked as cancelled. You can still view it in the list with cancelled status.
          </p>
          {!canVoid ? <p className="text-sm text-amber-700 pt-1">Only pending or assigned invoices can be voided here.</p> : null}
          {sliceError ? <p className="text-sm text-red-600 pt-2">{sliceError}</p> : null}
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
