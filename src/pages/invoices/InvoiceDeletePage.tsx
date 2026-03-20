import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearInvoicesError, deleteInvoiceThunk } from '../../features/invoices/invoicesSlice';
import { useInvoiceLoader } from './useInvoiceLoader';
import { parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';

export default function InvoiceDeletePage() {
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
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-zinc-600`}>You don&apos;t have access to delete invoices.</div>
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

  async function onDelete() {
    if (!token) return;
    setBusy(true);
    dispatch(clearInvoicesError());
    try {
      await dispatch(deleteInvoiceThunk({ token, id: invoice.id })).unwrap();
      navigate('/invoices');
    } catch {
      /* slice */
    } finally {
      setBusy(false);
    }
  }

  return (
    <InvoiceSectionFrame context={`Delete invoice · ${invoice.invoice_number} · ${invoice.hospital_name}`}>
      <div className={invoiceInnerCardClassName()}>
        <div className="p-6 border-b border-zinc-100 space-y-2">
          <p className="text-sm font-bold text-zinc-900">Are you sure you want to delete this invoice?</p>
          <p className="text-xs text-red-600 font-medium">This action cannot be undone.</p>
          {sliceError ? <p className="text-sm text-red-600 pt-2">{sliceError}</p> : null}
        </div>
        <div className="p-6 bg-zinc-50 flex gap-3 justify-end flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 size={16} /> Delete invoice
          </button>
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
