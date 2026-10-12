import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  const location = useLocation();
  const currentPage = new URLSearchParams(location.search).get('page') || '1';
  const dispatch = useAppDispatch();
  const sliceError = useAppSelector((s) => s.invoices.error);
  const { invoice, loading, error } = useInvoiceLoader(token, id);
  const [busy, setBusy] = useState(false);

  if (id == null) {
    return (
      <InvoiceSectionFrame context="Invalid link">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-destructive bg-destructive/10`}>Invalid invoice in URL.</div>
      </InvoiceSectionFrame>
    );
  }

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <InvoiceSectionFrame context="Access denied">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-foreground/70`}>You don&apos;t have access to restore invoices.</div>
      </InvoiceSectionFrame>
    );
  }

  if (loading && !invoice) {
    return (
      <InvoiceSectionFrame context="Loading…">
        <div className={`${invoiceInnerCardClassName()} px-4 py-12 text-center text-sm text-muted-foreground/70 animate-pulse`}>Loading…</div>
      </InvoiceSectionFrame>
    );
  }

  if (error || !invoice) {
    return (
      <InvoiceSectionFrame context="Error">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-destructive bg-destructive/10`}>{error || 'Not found'}</div>
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
      navigate(`/invoices/${invoice.id}?page=${currentPage}`);
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
            onClick={() => navigate(`/invoices/${invoice.id}?page=${currentPage}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Keep cancelled
          </button>
          <button
            type="button"
            disabled={busy || !canRestore}
            onClick={() => void onRestore()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 bg-accent text-xs font-semibold text-accent-foreground hover:bg-primary/15 disabled:opacity-50"
          >
            <RotateCcw size={16} /> Restore to pending
          </button>
        </div>
      }
    >
      <div className={invoiceInnerCardClassName()}>
        <div className="p-6 space-y-2">
          <p className="text-sm font-semibold text-foreground">Restore this invoice to pending?</p>
          <p className="text-xs text-muted-foreground">
            The invoice returns to the open pool (unassigned) so delivery staff can accept it again.
            The previous cancel reason is kept for audit.
          </p>
          {invoice.cancel_reason ? (
            <p className="text-xs text-foreground/70 bg-muted border border-border rounded-xl p-3">
              <span className="font-medium text-muted-foreground text-xs">Cancel reason</span>
              <br />
              {invoice.cancel_reason}
            </p>
          ) : null}
          {!canRestore ? <p className="text-sm text-warning pt-1">Only cancelled invoices can be restored here.</p> : null}
          {sliceError ? <p className="text-sm text-destructive pt-2">{sliceError}</p> : null}
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
