import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUsers, updateInvoice, getInvoiceAuditLogs, uploadSignedCopy } from '../../lib/api';
import type { AuditLogEntry } from '../../lib/api';
import {
  MapPin, FileImage, IndianRupee, FileText, AlertCircle, Trash2, List,
  Building, Hash, Banknote, Clock, UserPlus, XCircle, CheckCircle2, RotateCcw, Pencil, Save, X, History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearInvoicesError, deleteInvoiceThunk } from '../../features/invoices/invoicesSlice';
import { useInvoiceLoader } from './useInvoiceLoader';
import { fakeDuration, INVOICE_STATUS_COLORS, parseInvoiceRouteId } from './invoiceShared';
import { InvoiceSectionFrame, invoiceInnerCardClassName } from '../../components/invoices/InvoiceSectionFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function InvoiceDetailPage() {
  const { invoiceId: idParam } = useParams<{ invoiceId: string }>();
  const id = parseInvoiceRouteId(idParam);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentPage = new URLSearchParams(location.search).get('page') || '1';
  const deleteError = useAppSelector((s) => s.invoices.error);
  const { invoice, loading, error } = useInvoiceLoader(token, id);
  const [deliveryUsers, setDeliveryUsers] = useState<{ id: number; name: string }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: number; name: string }[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pageNotice, setPageNotice] = useState('');
  const [statusAction, setStatusAction] = useState<'completed' | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [replaceMode, setReplaceMode] = useState(false);

  // ── Edit core fields ──
  const [editing, setEditing] = useState(false);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editHospitalName, setEditHospitalName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // ── Audit logs ──
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // ── Image preview popup ──
  const [previewImage, setPreviewImage] = useState<{ url: string; number: string } | null>(null);

  useEffect(() => {
    if (!invoice) return;
    if (user?.role !== 'admin' && user?.role !== 'manager') return;
    const s = location.state as { openInvoiceDeleteConfirm?: boolean } | undefined;
    if (!s?.openInvoiceDeleteConfirm) return;
    dispatch(clearInvoicesError());
    setShowDeleteModal(true);
    navigate(`/invoices/${invoice.id}?page=${currentPage}`, { replace: true, state: {} });
  }, [invoice, user?.role, location.state, navigate, dispatch, currentPage]);

  useEffect(() => {
    const s = location.state as { paymentConfirmed?: boolean } | undefined;
    if (!s?.paymentConfirmed) return;
    setPageNotice('Payment confirmed successfully.');
    navigate(`/invoices/${id}?page=${currentPage}`, { replace: true, state: {} });
    const t = setTimeout(() => setPageNotice(''), 2500);
    return () => clearTimeout(t);
  }, [location.state, navigate, id, currentPage]);

  useEffect(() => {
    if (!showDeleteModal || deleteBusy) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setShowDeleteModal(false);
      dispatch(clearInvoicesError());
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showDeleteModal, deleteBusy, dispatch]);

  useEffect(() => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'manager')) return;
    getUsers(token, { role_code: 'delivery' })
      .then((users) =>
        setDeliveryUsers(users.map((u) => ({ id: u.id, name: u.full_name || u.email.split('@')[0] || String(u.id) })))
      )
      .catch(() => setDeliveryUsers([]));
    getUsers(token)
      .then((users) =>
        setAllUsers(users.map((u) => ({ id: u.id, name: u.full_name || u.email.split('@')[0] || String(u.id) })))
      )
      .catch(() => setAllUsers([]));
  }, [token, user?.role]);

  const assigneeName = useMemo(() => {
    if (!invoice) return '—';
    return (
      invoice.assignee_name ??
      deliveryUsers.find((b) => b.id === invoice.assigned_to)?.name ??
      '—'
    );
  }, [invoice, deliveryUsers]);

  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of allUsers) map.set(u.id, u.name);
    return map;
  }, [allUsers]);

  const resolveUserId = useCallback((value: string | null | undefined): string => {
    if (!value) return '';
    const num = Number(value);
    if (!Number.isNaN(num) && userMap.has(num)) return userMap.get(num)!;
    return value;
  }, [userMap]);

  const startEditing = useMemo(() => () => {
    if (!invoice) return;
    setEditInvoiceNumber(invoice.invoice_number);
    setEditHospitalName(invoice.hospital_name);
    setEditAmount(String(invoice.amount));
    setEditError('');
    setEditing(true);
  }, [invoice]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditError('');
  }, []);

  const saveEditing = useCallback(async () => {
    if (!token || !invoice) return;
    setEditSaving(true);
    setEditError('');
    const patch: Record<string, unknown> = {};
    if (editInvoiceNumber !== invoice.invoice_number) patch.invoice_number = editInvoiceNumber;
    if (editHospitalName !== invoice.hospital_name) patch.hospital_name = editHospitalName;
    if (Number(editAmount) !== invoice.amount) patch.amount = Number(editAmount);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setEditSaving(false);
      return;
    }
    try {
      await updateInvoice(token, invoice.id, patch as any);
      setEditing(false);
      window.location.reload();
    } catch (e: any) {
      setEditError(e.message || 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  }, [token, invoice, editInvoiceNumber, editHospitalName, editAmount]);

  const loadAuditLogs = useCallback(async () => {
    if (!token || !invoice) return;
    setAuditLogsLoading(true);
    try {
      const r = await getInvoiceAuditLogs(token, invoice.id, { page_size: 50 });
      setAuditLogs(r.items);
    } catch {
      // ignore
    } finally {
      setAuditLogsLoading(false);
    }
  }, [token, invoice]);

  useEffect(() => {
    if (showAuditLogs && auditLogs.length === 0 && !auditLogsLoading) {
      loadAuditLogs();
    }
  }, [showAuditLogs, auditLogs.length, auditLogsLoading, loadAuditLogs]);

  if (id == null) {
    return (
      <InvoiceSectionFrame context="Invalid invoice link.">
        <div className={`p-8 ${invoiceInnerCardClassName()}`}>
          <p className="text-sm text-foreground/70">This invoice URL is not valid.</p>
          <Link to="/invoices" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Back to invoices
          </Link>
        </div>
      </InvoiceSectionFrame>
    );
  }

  if (loading && !invoice) {
    return (
      <InvoiceSectionFrame context="Loading…">
        <div className={`${invoiceInnerCardClassName()} px-4 py-12 text-center text-sm text-muted-foreground/70 font-medium animate-pulse`}>
          Loading invoice…
        </div>
      </InvoiceSectionFrame>
    );
  }

  if (error || !invoice) {
    return (
      <InvoiceSectionFrame context={error || 'Invoice not found.'}>
        <div className={`p-8 ${invoiceInnerCardClassName()}`}>
          <p className="text-sm text-destructive">{error || 'Invoice not found.'}</p>
          <Link to="/invoices" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Back to invoices
          </Link>
        </div>
      </InvoiceSectionFrame>
    );
  }

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
  const showRestore =
    invoice.status === 'cancelled' && user?.role !== 'delivery_boy' && isManager;
  const showMarkComplete = isManager && !['completed', 'cancelled'].includes(invoice.status);

  return (
    <InvoiceSectionFrame
      context={`Invoice detail · ${invoice.invoice_number} · ${invoice.hospital_name}`}
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {showConfirmPayment ? (
            <Link
              to={`/invoices/${invoice.id}/confirm-payment?page=${currentPage}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              <CheckCircle2 size={16} /> Confirm payment
            </Link>
          ) : null}
          {showAssignAndVoid ? (
            <>
              <Link
                to={`/invoices/${invoice.id}/assign?page=${currentPage}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
              >
                <UserPlus size={16} /> {invoice.status === 'assigned' ? 'Reassign' : 'Fulfill'}
              </Link>
              <Link
                to={`/invoices/${invoice.id}/void?page=${currentPage}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <XCircle size={16} /> Void
              </Link>
            </>
          ) : null}
          {showRestore ? (
            <Link
              to={`/invoices/${invoice.id}/restore?page=${currentPage}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 bg-accent text-xs font-semibold text-accent-foreground hover:bg-primary/15"
            >
              <RotateCcw size={16} /> Restore to pending
            </Link>
          ) : null}
          {showMarkComplete ? (
            <button
              type="button"
              onClick={() => { setStatusAction('completed'); setUploadFile(null); setUploadedUrl(''); setReplaceMode(false); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 bg-accent text-xs font-semibold text-accent-foreground hover:bg-primary/15"
            >
              <CheckCircle2 size={16} /> Mark Complete
            </button>
          ) : null}
          {isManager ? (
            <button
              type="button"
              onClick={() => {
                dispatch(clearInvoicesError());
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-destructive/20 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/15"
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : null}
        </div>
      }
    >
      {pageNotice ? (
        <div className="mb-3 bg-accent border border-primary/20 text-accent-foreground rounded-md px-4 py-3 text-sm">
          {pageNotice}
        </div>
      ) : null}
      {editError ? (
        <div className="mb-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-4 py-3 text-sm">
          {editError}
        </div>
      ) : null}
      <div className={invoiceInnerCardClassName()}>
        <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-wrap bg-muted/40">
          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center border border-border shrink-0">
            <FileText size={20} className="text-muted-foreground/70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Invoice record</p>
            {editing ? (
              <Input className="w-full max-w-xs"
                type="text"
                value={editInvoiceNumber}
                onChange={(e) => setEditInvoiceNumber(e.target.value)}
                
              />
            ) : (
              <p className="text-sm font-semibold text-foreground truncate">{invoice.invoice_number}</p>
            )}
          </div>
          {isManager && !editing && (
            <Button variant="outline" size="xs"
              type="button"
              onClick={startEditing}
              
            >
              <Pencil size={14} /> Edit
            </Button>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <Button size="xs"
                type="button"
                onClick={saveEditing}
                disabled={editSaving}
                
              >
                <Save size={14} /> {editSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" size="xs"
                type="button"
                onClick={cancelEditing}
                
              >
                <X size={14} /> Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                  <List size={12} /> Notes / Description
                </label>
                <div className="text-sm text-foreground/70 bg-muted/50 p-4 rounded-xl border border-border leading-relaxed font-medium min-h-[80px]">
                  {invoice.description || 'No additional details for this invoice.'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                  <Building size={12} /> Hospital / Entity
                </label>
                {editing ? (
                  <Input className="w-full"
                    type="text"
                    value={editHospitalName}
                    onChange={(e) => setEditHospitalName(e.target.value)}
                    
                  />
                ) : (
                  <div className="flex items-start gap-3 p-3.5 bg-muted/50 rounded-xl border border-border">
                    <Building size={16} className="text-muted-foreground/70 mt-0.5 shrink-0" />
                    <span className="text-sm font-semibold text-foreground/85">{invoice.hospital_name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-3.5 bg-muted/50 rounded-xl border border-border">
                <span className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                  <IndianRupee size={14} className="text-muted-foreground/70" /> Gross amount
                </span>
                {editing ? (
                  <Input className="w-32 text-right"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    
                  />
                ) : (
                  <span className="text-sm font-semibold text-foreground">₹{invoice.amount.toLocaleString()}</span>
                )}
              </div>
              {invoice.previous_amount != null && invoice.amount_updated_at && (
                <div className="flex items-center justify-between gap-3 p-3.5 bg-warning/10 rounded-xl border border-warning/25">
                  <span className="text-[11px] font-semibold text-warning flex items-center gap-1.5">
                    <Clock size={12} /> Amount updated
                  </span>
                  <span className="text-[11px] font-semibold text-warning text-right">
                    ₹{invoice.previous_amount.toLocaleString()} → ₹{invoice.amount.toLocaleString()}
                    <br />
                    <span className="text-[11px] text-warning font-medium">{new Date(invoice.amount_updated_at).toLocaleString()}</span>
                  </span>
                </div>
              )}

              {invoice.signed_copy_url && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                    <FileImage size={12} /> Invoice document
                  </label>
                  <Button variant="secondary" className="w-full cursor-pointer"
                    type="button"
                    onClick={() => setPreviewImage({ url: invoice.signed_copy_url, number: invoice.invoice_number })}
                    
                  >
                    <img
                      src={invoice.signed_copy_url}
                      alt="Invoice signed copy"
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover/img:scale-105"
                    />
                  </Button>
                </div>
              )}

              {fakeDuration(invoice) && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted p-3 rounded-xl border border-border">
                    <p className="text-xs font-medium text-muted-foreground/70 mb-0.5">Travel</p>
                    <p className="text-sm font-semibold text-foreground">{fakeDuration(invoice)!.travel}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-xl border border-border">
                    <p className="text-xs font-medium text-muted-foreground/70 mb-0.5">Wait</p>
                    <p className="text-sm font-semibold text-foreground">{fakeDuration(invoice)!.waiting}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-xl border border-border">
                    <p className="text-xs font-medium text-muted-foreground/70 mb-0.5">Total</p>
                    <p className="text-sm font-semibold text-accent-foreground">{fakeDuration(invoice)!.total}</p>
                  </div>
                </div>
              )}

              {invoice.status === 'delivered' && !invoice.signed_copy_url && (
                <div className="bg-warning/10 p-4 rounded-xl border border-warning/25 flex items-start gap-3">
                  <AlertCircle size={20} className="text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-warning">Document missing</p>
                    <p className="text-[11px] text-warning mt-0.5 font-medium">Signed copy not uploaded yet.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70">Live status</label>
                <div
                  className={`w-fit flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-xs capitalize ${INVOICE_STATUS_COLORS[invoice.status]} border border-current/10`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {invoice.status}
                </div>
              </div>

              <Card className="overflow-hidden" >
                <div className="p-4 border-b border-border bg-muted/30">
                  <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase mb-3">Assigned to</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground border border-border shrink-0">
                      {assigneeInitialChar}
                    </div>
                    <span className="text-sm font-medium text-foreground">{assigneeName}</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                      <Clock size={12} /> Created
                    </span>
                    <span className="text-xs font-semibold text-foreground/85">
                      {new Date(invoice.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                      <Hash size={12} /> Reference
                    </span>
                    <span className="text-xs font-semibold text-foreground/85">{invoice.invoice_number}</span>
                  </div>
                </div>
              </Card>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                  <Banknote size={12} /> Payment breakdown
                </label>
                <div className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-semibold">Cash received</span>
                    <span className="text-sm font-semibold text-foreground">₹{(invoice.cash_received || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-semibold">Cheque</span>
                    <span className="text-sm font-semibold text-foreground">₹{(invoice.cheque_received || 0).toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground/70">Grand total</span>
                    <span className="text-lg font-semibold text-primary">₹{invoice.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1.5">
                  <Clock size={12} /> Logistics timeline
                </label>
                <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-secondary">
                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-foreground border-4 border-card ring-1 ring-ring shadow-sm" />
                    <p className="text-xs font-semibold text-foreground uppercase">Order created</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{new Date(invoice.created_at).toLocaleString()}</p>
                  </div>
                  {invoice.accepted_at ? (
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-card ring-1 ring-ring/30 shadow-sm" />
                      <p className="text-xs font-semibold text-foreground uppercase">Accepted by logistics</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{new Date(invoice.accepted_at).toLocaleString()}</p>
                      <p className="text-[11px] text-primary font-semibold mt-1 bg-accent w-fit px-2 py-0.5 rounded-lg border border-primary/20">
                        {assigneeName}
                      </p>
                    </div>
                  ) : (
                    <div className="relative opacity-40">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-border border-4 border-card ring-1 ring-ring shadow-sm" />
                      <p className="text-xs font-semibold text-muted-foreground/70 uppercase">Pending assignment</p>
                    </div>
                  )}
                  {invoice.delivered_at && (
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-foreground border-4 border-card ring-1 ring-ring shadow-sm" />
                      <p className="text-xs font-semibold text-foreground uppercase">Successfully delivered</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{new Date(invoice.delivered_at).toLocaleString()}</p>
                    </div>
                  )}
                  {invoice.release_to_pool_at && (
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-warning border-4 border-card ring-1 ring-warning/30 shadow-sm" />
                      <p className="text-xs font-semibold text-foreground uppercase">Released back to available pool</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                        {new Date(invoice.release_to_pool_at).toLocaleString()}
                      </p>
                      {invoice.release_to_pool_by_name ? (
                        <p className="text-[11px] text-warning font-semibold mt-1 bg-warning/10 w-fit px-2 py-0.5 rounded-lg border border-warning/25">
                          By: {invoice.release_to_pool_by_name}
                        </p>
                      ) : null}
                      {invoice.release_to_pool_reason ? (
                        <p className="text-[11px] text-foreground/70 mt-1">
                          Reason: <span className="font-semibold">{invoice.release_to_pool_reason}</span>
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Audit log section ── */}
      <div className="mt-4">
        <Button variant="outline" size="sm"
          type="button"
          onClick={() => setShowAuditLogs((v) => !v)}
          
        >
          <History size={16} /> {showAuditLogs ? 'Hide' : 'Show'} change history
        </Button>
        {showAuditLogs && (
          <Card className="mt-3 overflow-hidden" >
            {auditLogsLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground/70 animate-pulse">Loading changes…</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground/70">No changes recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase">Time</TableHead>
                      <TableHead className="uppercase">Field</TableHead>
                      <TableHead className="uppercase">Old Value</TableHead>
                      <TableHead className="uppercase">New Value</TableHead>
                      <TableHead className="uppercase">By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((entry) => (
                      <TableRow key={entry.id} className="">
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className="capitalize" >
                            {(entry.field_name || '').replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[160px] truncate font-mono">
                          {entry.old_value ? resolveUserId(entry.old_value) : <span className="text-muted-foreground/50 italic">—</span>}
                        </TableCell>
                        <TableCell className="text-foreground max-w-[160px] truncate font-mono font-semibold">
                          {entry.new_value ? resolveUserId(entry.new_value) : <span className="text-muted-foreground/50 italic">—</span>}
                        </TableCell>
                        <TableCell className="text-foreground/70 whitespace-nowrap">
                          {entry.changed_by_name || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </div>

      <AnimatePresence>
        {showDeleteModal && invoice ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-delete-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-border relative">
                <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => { setShowDeleteModal(false); dispatch(clearInvoicesError()); }}  aria-label="Close">
                  <X size={18} />
                </Button>
                <h2 id="invoice-delete-title" className="text-lg font-semibold text-foreground">
                  Delete invoice?
                </h2>
                <p className="text-sm text-foreground/70 mt-2">
                  <span className="font-semibold text-foreground">{invoice.invoice_number}</span>
                  {' · '}
                  {invoice.hospital_name}
                </p>
                <p className="text-xs text-destructive font-medium mt-2">This action cannot be undone.</p>
                {deleteError ? <p className="text-sm text-destructive mt-3">{deleteError}</p> : null}
              </div>
              <div className="p-4 flex flex-wrap gap-2 justify-end bg-muted/80">
                <Button variant="outline" size="sm"
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => {
                    setShowDeleteModal(false);
                    dispatch(clearInvoicesError());
                  }}
                  
                >
                  Cancel
                </Button>
                <Button variant="outline" size="sm" className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15"
                  type="button"
                  disabled={deleteBusy || !token}
                  onClick={() => {
                    if (!token) return;
                    setDeleteBusy(true);
                    dispatch(clearInvoicesError());
                    dispatch(deleteInvoiceThunk({ token, id: invoice.id }))
                      .unwrap()
                      .then(() => {
                        setShowDeleteModal(false);
                        navigate('/invoices');
                      })
                      .catch(() => {})
                      .finally(() => setDeleteBusy(false));
                  }}
                  
                >
                  <Trash2 size={16} /> {deleteBusy ? 'Deleting…' : 'Delete invoice'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {statusAction && invoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <Card className="w-full max-w-sm overflow-hidden" >
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => { setStatusAction(null); setUploadFile(null); setUploadedUrl(''); setReplaceMode(false); }}  aria-label="Close">
                <X size={18} />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">Mark as Complete</h2>
              <p className="text-sm text-foreground/70 mt-2">
                <span className="font-semibold">{invoice.invoice_number}</span> &middot; {invoice.hospital_name}
              </p>
              <div className="mt-4 space-y-3">
                  {(() => {
                    const existingDoc = invoice.signed_copy_url;
                    if (existingDoc && !replaceMode && !uploadedUrl) {
                      return (
                        <div className="bg-accent border border-primary/20 rounded-md px-4 py-3 space-y-2">
                          <p className="text-xs font-semibold text-accent-foreground">Document already uploaded</p>
                          <button
                            type="button"
                            onClick={() => setReplaceMode(true)}
                            className="text-xs font-semibold text-warning hover:text-warning underline"
                          >
                            Replace with a different image
                          </button>
                        </div>
                      );
                    }
                    if (uploadedUrl) {
                      return (
                        <div className="bg-accent border border-primary/20 rounded-md px-4 py-3">
                          <p className="text-xs font-semibold text-accent-foreground">New document uploaded</p>
                          <p className="text-[11px] text-primary mt-1 break-all">{uploadedUrl}</p>
                        </div>
                      );
                    }
                    return (
                      <>
                        <label className="text-xs font-semibold text-muted-foreground block">Upload invoice document *</label>
                        <input
                          type="file" accept="image/*"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-accent"
                        />
                        <Button variant="dark" size="sm" className="w-full"
                          type="button"
                          disabled={statusBusy || !uploadFile || !token}
                          onClick={async () => {
                            if (!token || !uploadFile) return;
                            setStatusBusy(true);
                            try {
                              const result = await uploadSignedCopy(token, invoice.id, uploadFile);
                              setUploadedUrl(result.signed_copy_url);
                              setUploadFile(null);
                            } catch (e: any) {
                              setPageNotice(e.message || 'Upload failed');
                            } finally {
                              setStatusBusy(false);
                            }
                          }}
                          
                        >
                          {statusBusy ? 'Uploading…' : 'Upload Document'}
                        </Button>
                      </>
                    );
                  })()}
                </div>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm"
                type="button"
                disabled={statusBusy}
                onClick={() => { setStatusAction(null); setUploadFile(null); setUploadedUrl(''); setReplaceMode(false); }}
                
              >
                Cancel
              </Button>
              <Button variant="dark" size="sm"
                type="button"
                disabled={statusBusy || !token || (!uploadedUrl && !invoice.signed_copy_url)}
                onClick={async () => {
                  if (!token || !invoice) return;
                  setStatusBusy(true);
                  try {
                    const patch: Record<string, unknown> = { status: statusAction };
                    if (uploadedUrl) patch.signed_copy_url = uploadedUrl;
                    await updateInvoice(token, invoice.id, patch as any);
                    setStatusAction(null);
                    setUploadFile(null);
                    setUploadedUrl('');
                    setReplaceMode(false);
                    window.location.reload();
                  } catch (e: any) {
                    setPageNotice(e.message || 'Failed to update status');
                    setStatusAction(null);
                  } finally {
                    setStatusBusy(false);
                  }
                }}
                
              >
                {statusBusy ? 'Updating…' : 'Complete'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-3xl overflow-hidden"
            
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <span className="text-xs font-semibold text-foreground/70">Signed copy — {previewImage.number}</span>
              <Button variant="ghost" size="icon-sm"
                type="button"
                onClick={() => setPreviewImage(null)}
                
                aria-label="Close preview"
              >
                <X size={18} />
              </Button>
            </div>
            <div className="p-4 flex justify-center bg-muted/30 max-h-[80vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={`Signed copy — ${previewImage.number}`}
                className="max-w-full h-auto object-contain rounded-lg"
              />
            </div>
          </Card>
        </div>
      )}
    </InvoiceSectionFrame>
  );
}
