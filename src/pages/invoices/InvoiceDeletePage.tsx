import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { parseInvoiceRouteId } from './invoiceShared';

/** Legacy URL: redirects to invoice detail and opens the delete confirmation modal. */
export default function InvoiceDeletePage() {
  const { invoiceId: idParam } = useParams<{ invoiceId: string }>();
  const id = parseInvoiceRouteId(idParam);
  const { user } = useAuth();

  if (id == null) {
    return <Navigate to="/invoices" replace />;
  }

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  return (
    <Navigate
      to={`/invoices/${id}`}
      replace
      state={isManager ? { openInvoiceDeleteConfirm: true } : undefined}
    />
  );
}
