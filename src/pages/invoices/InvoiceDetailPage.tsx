import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';
import {
  MapPin, FileImage, IndianRupee, FileText, AlertCircle, Trash2, List,
  Building, Hash, Banknote, Clock, UserPlus, XCircle, CheckCircle2,
} from 'lucide-react';
import { useInvoiceLoader } from './useInvoiceLoader';
import { fakeDuration, INVOICE_STATUS_COLORS, parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';

export default function InvoiceDetailPage() {
  const { invoiceId: idParam } = useParams<{ invoiceId: string }>();
  const id = parseInvoiceRouteId(idParam);
  const { token, user } = useAuth();
  const { invoice, loading, error } = useInvoiceLoader(token, id);
  const [deliveryUsers, setDeliveryUsers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'manager')) return;
    getUsers(token, { role_code: 'delivery' })
      .then((users) =>
        setDeliveryUsers(users.map((u) => ({ id: u.id, name: u.full_name || u.email.split('@')[0] || String(u.id) })))
      )
      .catch(() => setDeliveryUsers([]));
  }, [token, user?.role]);

  if (id == null) {
    return (
      <InvoiceSectionFrame context="Invalid link">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-red-700 bg-red-50/50`}>
          This invoice URL is not valid.
        </div>
      </InvoiceSectionFrame>
    );
  }

  if (loading && !invoice) {
    return (
      <InvoiceSectionFrame context="Loading…">
        <div className={`${invoiceInnerCardClassName()} px-4 py-12 text-center text-sm text-zinc-400 font-medium animate-pulse`}>
          Loading invoice…
        </div>
      </InvoiceSectionFrame>
    );
  }

  if (error || !invoice) {
    return (
      <InvoiceSectionFrame context="Could not load">
        <div className={`${invoiceInnerCardClassName()} p-6 text-sm text-red-700 bg-red-50/50`}>
          {error || 'Invoice not found.'}
        </div>
      </InvoiceSectionFrame>
    );
  }

  const assigneeName = useMemo(() => {
    if (!invoice) return '—';
    return (
      invoice.assignee_name ??
      deliveryUsers.find((b) => b.id === invoice.assigned_to)?.name ??
      '—'
    );
  }, [invoice, deliveryUsers]);
  const assigneeInitialChar = assigneeName !== '—' ? (assigneeName[0]?.toUpperCase() ?? '?') : '?';

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const showConfirmPayment =
    isManager &&
    invoice.status === 'delivered' &&
    ((invoice.cash_received ?? 0) > 0 || (invoice.cheque_received ?? 0) > 0);
  const showAssignAndVoid =
    (invoice.status === 'pending' || invoice.status === 'assigned') &&
    user?.role !== 'delivery_boy' &&
    isManager;

  return (
    <InvoiceSectionFrame
      context={`Invoice detail · ${invoice.invoice_number} · ${invoice.hospital_name}`}
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {showConfirmPayment ? (
            <Link
              to={`/invoices/${invoice.id}/confirm-payment`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-100"
            >
              <CheckCircle2 size={16} /> Confirm payment
            </Link>
          ) : null}
          {showAssignAndVoid ? (
            <>
              <Link
                to={`/invoices/${invoice.id}/assign`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50"
              >
                <UserPlus size={16} /> {invoice.status === 'assigned' ? 'Reassign' : 'Fulfill'}
              </Link>
              <Link
                to={`/invoices/${invoice.id}/void`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-red-700 hover:bg-red-50"
              >
                <XCircle size={16} /> Void
              </Link>
            </>
          ) : null}
          {isManager ? (
            <Link
              to={`/invoices/${invoice.id}/delete`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100"
            >
              <Trash2 size={16} /> Delete
            </Link>
          ) : null}
        </div>
      }
    >
      <div className={invoiceInnerCardClassName()}>
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3 flex-wrap bg-zinc-50/40">
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shrink-0">
            <FileText size={20} className="text-zinc-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Invoice record</p>
            <p className="text-sm font-bold text-zinc-900 truncate">{invoice.invoice_number}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <List size={12} /> Notes / Description
                </label>
                <div className="text-sm text-zinc-600 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50 leading-relaxed font-medium min-h-[80px]">
                  {invoice.description || 'No additional details for this invoice.'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={12} /> Delivery destination
                </label>
                <div className="flex items-start gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                  <Building size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold text-zinc-700">{invoice.hospital_name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee size={14} className="text-zinc-400" /> Gross amount
                </span>
                <span className="text-sm font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</span>
              </div>

              {fakeDuration(invoice) && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Travel</p>
                    <p className="text-sm font-bold text-zinc-900">{fakeDuration(invoice)!.travel}</p>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Wait</p>
                    <p className="text-sm font-bold text-zinc-900">{fakeDuration(invoice)!.waiting}</p>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Total</p>
                    <p className="text-sm font-bold text-emerald-700">{fakeDuration(invoice)!.total}</p>
                  </div>
                </div>
              )}

              {invoice.status === 'delivered' && invoice.signed_copy_url && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileImage size={12} /> Signed document
                    </label>
                    <Link
                      to={`/invoices/${invoice.id}/signed-preview`}
                      className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-wider"
                    >
                      Full view
                    </Link>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-100 max-h-48">
                    <img
                      src={invoice.signed_copy_url}
                      alt="Signed copy"
                      className="w-full h-full max-h-48 object-cover"
                    />
                  </div>
                </div>
              )}

              {invoice.status === 'delivered' && !invoice.signed_copy_url && (
                <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Document missing</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Signed copy not uploaded yet.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live status</label>
                <div
                  className={`w-fit flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs capitalize ${INVOICE_STATUS_COLORS[invoice.status]} border border-current/10`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {invoice.status}
                </div>
              </div>

              <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-50 bg-zinc-50/30">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-3">Assigned to</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 border border-zinc-200 shrink-0">
                      {assigneeInitialChar}
                    </div>
                    <span className="text-sm font-medium text-zinc-800">{assigneeName}</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                      <Clock size={12} /> Created
                    </span>
                    <span className="text-xs font-bold text-zinc-700">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                      <Hash size={12} /> Reference
                    </span>
                    <span className="text-xs font-bold text-zinc-700">{invoice.invoice_number}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Banknote size={12} /> Payment breakdown
                </label>
                <div className="bg-zinc-50/50 rounded-2xl p-4 border border-zinc-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 font-bold">Cash received</span>
                    <span className="text-sm font-bold text-zinc-900">₹{(invoice.cash_received || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 font-bold">Cheque</span>
                    <span className="text-sm font-bold text-zinc-900">₹{(invoice.cheque_received || 0).toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-zinc-200 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Grand total</span>
                    <span className="text-lg font-bold text-emerald-600">₹{invoice.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} /> Logistics timeline
                </label>
                <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                    <p className="text-xs font-bold text-zinc-900 uppercase">Order created</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(invoice.created_at).toLocaleString()}</p>
                  </div>
                  {invoice.accepted_at ? (
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white ring-1 ring-emerald-100 shadow-sm" />
                      <p className="text-xs font-bold text-zinc-900 uppercase">Accepted by logistics</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(invoice.accepted_at).toLocaleString()}</p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-lg border border-emerald-100">
                        {assigneeName}
                      </p>
                    </div>
                  ) : (
                    <div className="relative opacity-40">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-200 border-4 border-white ring-1 ring-zinc-100 shadow-sm" />
                      <p className="text-xs font-bold text-zinc-400 uppercase">Pending assignment</p>
                    </div>
                  )}
                  {invoice.delivered_at && (
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                      <p className="text-xs font-bold text-zinc-900 uppercase">Successfully delivered</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(invoice.delivered_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InvoiceSectionFrame>
  );
}
