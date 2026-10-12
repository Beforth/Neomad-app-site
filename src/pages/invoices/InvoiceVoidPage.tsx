import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-foreground/70`}>You don&apos;t have access to void invoices.</div>
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

  const canVoid = invoice.status === 'pending' || invoice.status === 'assigned';

  async function onVoid() {
    if (!token || !canVoid) return;
    setBusy(true);
    dispatch(clearInvoicesError());
    try {
      await dispatch(cancelInvoiceThunk({ token, id: invoice.id })).unwrap();
      navigate(`/invoices/${invoice.id}?page=${currentPage}`);
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
            onClick={() => navigate(`/invoices/${invoice.id}?page=${currentPage}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Keep invoice
          </button>
          <button
            type="button"
            disabled={busy || !canVoid}
            onClick={() => void onVoid()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-destructive/20 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/15 disabled:opacity-50"
          >
            <XCircle size={16} /> Void invoice
          </button>
        </div>
      }
    >
      <div className={invoiceInnerCardClassName()}>
        <div className="p-6 space-y-2">
          <p className="text-sm font-semibold text-foreground">Void this invoice?</p>
          <p className="text-xs text-muted-foreground">
            The invoice will be marked as cancelled. You can restore it to pending later from the invoice detail page
            or the invoices list.
          </p>
          {!canVoid ? <p className="text-sm text-warning pt-1">Only pending or assigned invoices can be voided here.</p> : null}
          {sliceError ? <p className="text-sm text-destructive pt-2">{sliceError}</p> : null}
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
