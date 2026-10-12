import { Link, useParams } from 'react-router-dom';
import { FileImage } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInvoiceLoader } from './useInvoiceLoader';
import { parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';
import { Card } from '@/components/ui/card';

export default function InvoiceSignedPreviewPage() {
  const { invoiceId: idParam } = useParams<{ invoiceId: string }>();
  const id = parseInvoiceRouteId(idParam);
  const { token } = useAuth();
  const { invoice, loading, error } = useInvoiceLoader(token, id);

  if (id == null) {
    return (
      <InvoiceSectionFrame context="Invalid link">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-destructive bg-destructive/10`}>Invalid invoice in URL.</div>
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

  const url = invoice.signed_copy_url;

  if (!url) {
    return (
      <InvoiceSectionFrame
        context={`Signed copy · ${invoice.invoice_number}`}
        right={
          <Link
            to={`/invoices/${invoice.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
          >
            View invoice
          </Link>
        }
      >
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-foreground/70`}>
          No signed document has been uploaded for this invoice.
        </div>
      </InvoiceSectionFrame>
    );
  }

  return (
    <InvoiceSectionFrame
      context={`Signed copy · ${invoice.invoice_number} · ${invoice.hospital_name}`}
      right={
        <Link
          to={`/invoices/${invoice.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
        >
          View invoice
        </Link>
      }
    >
      <div className={invoiceInnerCardClassName()}>
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex flex-wrap items-center gap-2">
          <FileImage size={16} className="text-muted-foreground/70 shrink-0" />
          <span className="text-xs font-medium text-muted-foreground/70">Full-size preview</span>
        </div>
        <div className="p-4 sm:p-6 flex justify-center bg-muted/30">
          <Card className="p-2 max-h-[min(75dvh,800px)] overflow-auto w-full flex justify-center" >
            <img
              src={url}
              alt={`Signed — ${invoice.invoice_number}`}
              className="max-w-full h-auto object-contain"
            />
          </Card>
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
