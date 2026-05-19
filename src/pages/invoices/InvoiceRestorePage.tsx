import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearInvoicesError, restoreInvoiceToPendingThunk } from '../../features/invoices/invoicesSlice';
import { useInvoiceLoader } from './useInvoiceLoader';
import { parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';

export default function InvoiceRestorePage() {
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
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-zinc-600`}>You don&apos;t have access to restore invoices.</div>
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

  const canRestore = invoice.status === 'cancelled';

  async function onRestore() {
    if (!token || !canRestore) return;
    setBusy(true);
    dispatch(clearInvoicesError());
    try {
      await dispatch(restoreInvoiceToPendingThunk({ token, id: invoice.id })).unwrap();
      navigate(`/invoices/${invoice.id}`);
    } catch {
      /* slice */
    } finally {
      setBusy(false);
    }
  }

  return (
    <InvoiceSectionFrame
      context={`Restore invoice · ${invoice.invoice_number} · ${invoice.hospital_name}`}
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Keep cancelled
          </button>
          <button
            type="button"
            disabled={busy || !canRestore}
            onClick={() => void onRestore()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            <RotateCcw size={16} /> Restore to pending
          </button>
        </div>
      }
    >
      <div className={invoiceInnerCardClassName()}>
        <div className="p-6 space-y-2">
          <p className="text-sm font-bold text-zinc-900">Restore this invoice to pending?</p>
          <p className="text-xs text-zinc-500">
            The invoice returns to the open pool (unassigned) so delivery staff can accept it again.
            The previous cancel reason is kept for audit.
          </p>
          {invoice.cancel_reason ? (
            <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
              <span className="font-bold text-zinc-500 uppercase tracking-wide text-[10px]">Cancel reason</span>
              <br />
              {invoice.cancel_reason}
            </p>
          ) : null}
          {!canRestore ? <p className="text-sm text-amber-700 pt-1">Only cancelled invoices can be restored here.</p> : null}
          {sliceError ? <p className="text-sm text-red-600 pt-2">{sliceError}</p> : null}
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
