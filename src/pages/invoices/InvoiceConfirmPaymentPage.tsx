import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  const location = useLocation();
  const currentPage = new URLSearchParams(location.search).get('page') || '1';
  const dispatch = useAppDispatch();
  const sliceError = useAppSelector((s) => s.invoices.error);
  const { invoice, loading, error } = useInvoiceLoader(token, id);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-foreground/70`}>
          You don&apos;t have access to confirm payments.
        </div>
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

  const canConfirm =
    invoice.status === 'delivered' && ((invoice.cash_received ?? 0) > 0 || (invoice.cheque_received ?? 0) > 0);

  async function onConfirm() {
    if (!token || !canConfirm) return;
    setBusy(true);
    dispatch(clearInvoicesError());
    try {
      await dispatch(confirmPaymentThunk({ token, invoice })).unwrap();
      setSuccessMsg('Payment confirmed successfully.');
      setTimeout(() => {
        navigate(`/invoices/${invoice.id}?page=${currentPage}`, { state: { paymentConfirmed: true } });
      }, 700);
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
            onClick={() => navigate(`/invoices/${invoice.id}?page=${currentPage}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy || !canConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm shadow-primary/20 disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> Confirm
          </button>
        </div>
      }
    >
      {sliceError ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-4 py-3 text-sm">{sliceError}</div>
      ) : null}
      {successMsg ? (
        <div className="bg-accent border border-primary/20 text-accent-foreground rounded-md px-4 py-3 text-sm">
          {successMsg}
        </div>
      ) : null}

      <div className={invoiceInnerCardClassName()}>
        <div className="px-6 py-4 border-b border-border bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground/70">Installment schedule &amp; status</p>
        </div>

        {!canConfirm ? (
          <div className="p-6 text-sm text-foreground/70">
            This invoice cannot be confirmed from this screen (must be delivered with cash or cheque).
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-secondary text-xs font-medium text-muted-foreground">
                <span>Installment</span>
                <span className="text-right">Amount</span>
                <span className="text-right min-w-[7rem]">Status</span>
              </div>
              <ul className="divide-y divide-border">
                {getInstallmentRows(invoice).map((row) => (
                  <li key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-3 items-center bg-card">
                    <span className="text-sm font-semibold text-foreground leading-tight">{row.label}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums text-right">₹{row.amount.toLocaleString()}</span>
                    <span className="flex justify-end">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${INSTALLMENT_STATUS_STYLE[row.status]}`}
                      >
                        {INSTALLMENT_STATUS_LABEL[row.status]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Invoice total</span>
              <span className="text-xl font-semibold text-primary tabular-nums">₹{invoice.amount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </InvoiceSectionFrame>
  );
}
