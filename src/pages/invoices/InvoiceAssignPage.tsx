import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { assignInvoiceThunk, clearInvoicesError } from '../../features/invoices/invoicesSlice';
import { useInvoiceLoader } from './useInvoiceLoader';
import { parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';

export default function InvoiceAssignPage() {
  const { invoiceId: idParam } = useParams<{ invoiceId: string }>();
  const id = parseInvoiceRouteId(idParam);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sliceError = useAppSelector((s) => s.invoices.error);
  const { invoice, loading, error } = useInvoiceLoader(token, id);
  const [assignTarget, setAssignTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'manager')) return;
    getUsers(token, { role_code: 'delivery' })
      .then((users) =>
        setAssignees(users.map((u) => ({ id: u.id, name: u.full_name || u.email.split('@')[0] || String(u.id) })))
      )
      .catch(() => setAssignees([]));
  }, [token, user?.role]);

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
          You don&apos;t have access to assign invoices.
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

  const canAssign = invoice.status !== 'delivered' && invoice.status !== 'cancelled';

  async function onAssign() {
    if (!token || !assignTarget || !canAssign) return;
    setBusy(true);
    dispatch(clearInvoicesError());
    try {
      await dispatch(assignInvoiceThunk({ token, id: invoice.id, assignedTo: Number(assignTarget) })).unwrap();
      navigate(`/invoices/${invoice.id}`);
    } catch {
      /* slice */
    } finally {
      setBusy(false);
    }
  }

  return (
    <InvoiceSectionFrame context={`Assign / Reassign · ${invoice.invoice_number} · ${invoice.hospital_name}`}>
      {sliceError ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">{sliceError}</div>
      ) : null}

      <div className={`${invoiceInnerCardClassName()} p-6 space-y-5`}>
        {!canAssign ? (
          <p className="text-sm text-zinc-600">This invoice can no longer be assigned.</p>
        ) : (
          <select
            value={assignTarget}
            onChange={(e) => setAssignTarget(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select assignee...</option>
            {assignees.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => void onAssign()}
            disabled={!assignTarget || busy || !canAssign}
            className="flex-1 min-w-[120px] py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-40"
          >
            Confirm assign
          </button>
          <button
            type="button"
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
