import { useParams } from 'react-router-dom';
import { FileImage } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInvoiceLoader } from './useInvoiceLoader';
import { parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';

export default function InvoiceSignedPreviewPage() {
  const { invoiceId: idParam } = useParams<{ invoiceId: string }>();
  const id = parseInvoiceRouteId(idParam);
  const { token } = useAuth();
  const { invoice, loading, error } = useInvoiceLoader(token, id);

  if (id == null) {
    return (
      <InvoiceSectionFrame context="Invalid link">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-red-700 bg-red-50/50`}>Invalid invoice in URL.</div>
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

  const url = invoice.signed_copy_url;

  if (!url) {
    return (
      <InvoiceSectionFrame context={`Signed copy · ${invoice.invoice_number}`}>
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-zinc-600`}>
          No signed document has been uploaded for this invoice.
        </div>
      </InvoiceSectionFrame>
    );
  }

  return (
    <InvoiceSectionFrame context={`Signed copy · ${invoice.invoice_number} · ${invoice.hospital_name}`}>
      <div className={invoiceInnerCardClassName()}>
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/40 flex flex-wrap items-center gap-2">
          <FileImage size={16} className="text-zinc-400 shrink-0" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Full-size preview</span>
        </div>
        <div className="p-4 sm:p-6 flex justify-center bg-zinc-50/30">
          <div className="bg-white p-2 rounded-xl border border-zinc-200 shadow-inner max-h-[min(75dvh,800px)] overflow-auto w-full flex justify-center">
            <img
              src={url}
              alt={`Signed — ${invoice.invoice_number}`}
              className="max-w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
