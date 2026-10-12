import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Banknote, Search, XCircle, Eye, X, Pen, Trash2, Inbox,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  IndianRupee, CheckCircle2, Zap, Users, Receipt, Repeat, MoreHorizontal } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/hrmsExpenses';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, fieldClass } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  PayrollRun, PayEntry, EntryStatus,
  getPayrollRun, calculatePayrollRun, approvePayrollRun, payPayrollRun,
  deletePayrollRun, regeneratePayrollRun, syncPayrollRun, updatePayrollEntry, payPayrollEntry,
  monthLabel, PAYMENT_MODE_OPTIONS, payModelLabel, ROLE_LABELS,
} from '../../lib/hrmsPayroll';

type SortKey = 'name' | 'net';

const PAGE_SIZE = 10;

const ENTRY_STATUS_BADGE: Record<EntryStatus, { base: string; label: string }> = {
  draft: { base: 'bg-secondary text-muted-foreground', label: 'Draft' },
  calculated: { base: 'bg-warning/10 text-warning', label: 'Calculated' },
  approved: { base: 'bg-info/10 text-info', label: 'Approved' },
  paid: { base: 'bg-accent text-primary', label: 'Paid' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const MODEL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Pay Models' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'shift', label: 'Shift' },
];

function num(s: string) { return Math.max(0, Number(s) || 0); }

function mergeEntry(prev: PayrollRun, entry: PayEntry): PayrollRun {
  return {
    ...prev,
    entries: prev.entries.map((e) => (e.id === entry.id ? entry : e)),
  };
}

export default function PayrollRunDetail() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const runId = Number(params.id);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const [editEntry, setEditEntry] = useState<PayEntry | null>(null);
  const [editForm, setEditForm] = useState<PayEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const loadRun = useCallback(async () => {
    if (!token || !runId) {
      setRun(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getPayrollRun(token, runId);
      setRun(data);
    } catch {
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [token, runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, modelFilter, searchDebounced]);

  const filtered = useMemo(() => {
    if (!run) return [];
    let list = [...run.entries];
    const q = searchDebounced.toLowerCase().trim();
    if (q) list = list.filter((e) => e.employeeName.toLowerCase().includes(q));
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    if (modelFilter !== 'all') list = list.filter((e) => e.payModel === modelFilter);
    list.sort((a, b) => {
      if (sortBy === 'net') return sortOrder === 'asc' ? a.netPay - b.netPay : b.netPay - a.netPay;
      const va = a.employeeName.toLowerCase();
      const vb = b.employeeName.toLowerCase();
      return sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [run, searchDebounced, statusFilter, modelFilter, sortBy, sortOrder]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  async function handleCalculate() {
    if (!token || !run) return;
    try {
      const wasDraft = run.status === 'draft';
      const updated = await calculatePayrollRun(token, run.id);
      setRun(updated);
      showToast(wasDraft
        ? 'Salaries calculated from attendance (days, late penalty, OT)'
        : 'Salaries recalculated from attendance');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to calculate');
    }
  }

  async function handleApprove() {
    if (!token || !run) return;
    try {
      const updated = await approvePayrollRun(token, run.id);
      setRun(updated);
      showToast('Run approved and locked');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to approve');
    }
  }

  async function handlePayAll() {
    if (!token || !run) return;
    try {
      const updated = await payPayrollRun(token, run.id);
      setRun(updated);
      showToast('All approved entries marked paid');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to pay run');
    }
  }

  async function handleDelete() {
    if (!token || !run) return;
    try {
      await deletePayrollRun(token, run.id);
      setConfirmDelete(false);
      navigate('/hrms/payroll');
    } catch (e) {
      setConfirmDelete(false);
      showToast(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  async function handleRegenerate() {
    if (!token || !run) return;
    try {
      const updated = await regeneratePayrollRun(token, run.id);
      setRun(updated);
      setConfirmRegenerate(false);
      showToast(`Regenerated with ${updated.entries.length} employee(s) — now draft`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to regenerate');
    }
  }

  async function handleSync() {
    if (!token || !run) return;
    try {
      const updated = await syncPayrollRun(token, run.id);
      setRun(updated);
      showToast(`Synced — ${updated.entries.length} employee(s) in this run`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to sync');
    }
  }

  function openEdit(e: PayEntry) {
    setEditEntry(e);
    setEditForm({ ...e });
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token || !run || !editEntry || !editForm) return;
    try {
      const updated = await updatePayrollEntry(token, run.id, editForm.id, {
        presentDays: editForm.presentDays,
        halfDays: editForm.halfDays,
        overtimeHours: editForm.overtimeHours,
        lopDays: editForm.lopDays,
        bonus: editForm.bonus,
        latePenalty: editForm.latePenalty,
        overtimeAmount: editForm.overtimeAmount,
        advanceDeduction: editForm.advanceDeduction,
        mediclaimDeduction: editForm.mediclaimDeduction,
        expenseReimbursement: editForm.expenseReimbursement,
        paymentMode: editForm.paymentMode,
        note: editForm.note,
      });
      setRun((prev) => (prev ? mergeEntry(prev, updated) : prev));
      setEditEntry(null);
      setEditForm(null);
      showToast('Entry updated and recalculated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update entry');
    }
  }

  async function payEntry(e: PayEntry) {
    if (!token || !run) return;
    try {
      await payPayrollEntry(token, run.id, e.id);
      const refreshed = await getPayrollRun(token, run.id);
      setRun(refreshed);
      showToast('Entry marked as paid');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to pay entry');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground/70 animate-pulse py-16 text-center">Loading payroll run...</p>
      </div>
    );
  }

  if (!run) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center text-center" >
        <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3">
          <Inbox size={24} className="text-muted-foreground/50" />
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Payroll run not found</h2>
        <p className="text-xs text-muted-foreground/70 max-w-xs mb-4">This run may have been deleted.</p>
        <Button variant="dark" size="sm" onClick={() => navigate('/hrms/payroll')} >
          <ChevronLeft size={14} />Back to Payroll
        </Button>
      </Card>
    );
  }

  const totals = run.entries.reduce(
    (acc, e) => ({ gross: acc.gross + e.gross, ded: acc.ded + e.totalDeductions, net: acc.net + e.netPay }),
    { gross: 0, ded: 0, net: 0 }
  );

  const statCards = [
    { label: 'Employees', value: run.entries.length, icon: Users, color: 'bg-info/10 text-info' },
    { label: 'Gross', value: formatINR(totals.gross), icon: Banknote, color: 'bg-purple-50 text-purple-600' },
    { label: 'Deductions', value: formatINR(totals.ded), icon: Receipt, color: 'bg-destructive/10 text-destructive' },
    { label: 'Net Pay', value: formatINR(totals.net), icon: IndianRupee, color: 'bg-accent text-primary' },
  ];

  const hasFilters = search || statusFilter !== 'all' || modelFilter !== 'all';
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
        >
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{monthLabel(run.month)}</h1>
          <p className="text-[13px] text-muted-foreground">
            Payroll run <Badge className={`${ENTRY_STATUS_BADGE[run.status].base}`}>{ENTRY_STATUS_BADGE[run.status].label}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(run.status === 'draft' || run.status === 'calculated') && (
            <>
              <Button variant="outline" size="sm" onClick={handleSync} >
                <Users size={14} />Sync employees
              </Button>
              <Button variant="outline" size="sm" onClick={handleCalculate} >
                <Zap size={14} />{run.status === 'draft' ? 'Calculate' : 'Recalculate'}
              </Button>
            </>
          )}
          {run.status === 'calculated' && (
            <Button variant="dark" size="sm" onClick={handleApprove} >
              <CheckCircle2 size={14} />Approve Run
            </Button>
          )}
          {run.status === 'approved' && (
            <Button variant="dark" size="sm" onClick={handlePayAll} >
              <Banknote size={14} />Pay All
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setConfirmRegenerate(true)} >
            <Repeat size={14} />Regenerate
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)} >
            <Trash2 size={14} />Delete
          </Button>
        </div>
      </motion.header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground leading-none truncate">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
          />
        </div>
        <div className="w-[150px]">
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
        </div>
        <div className="w-[150px]">
          <SearchableSelect value={modelFilter} onChange={setModelFilter} options={MODEL_FILTER_OPTIONS} placeholder="Pay Model" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setModelFilter('all'); }} className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors">
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        {paged.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No results found" description="Try adjusting your search or filters" className="border-0" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => toggleSort('name')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                      <span className="flex items-center gap-1">Employee{sortBy === 'name' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />) : <ArrowUpDown size={12} className="text-muted-foreground/50" />}</span>
                    </TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Type</TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Attendance</TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Gross</TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Deductions</TableHead>
                    <TableHead onClick={() => toggleSort('net')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                      <span className="flex items-center gap-1">Net{sortBy === 'net' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />) : <ArrowUpDown size={12} className="text-muted-foreground/50" />}</span>
                    </TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Status</TableHead>
                    <TableHead className="uppercase whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((e, i) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)}
                      className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                    >
                      <TableCell>
                        <p className="text-xs font-semibold text-foreground">{e.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground/70">{ROLE_LABELS[e.role] || e.role}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${e.payModel === 'monthly' ? 'bg-purple-50 text-purple-600' : 'bg-cyan-50 text-cyan-600'}`}>
                          {payModelLabel(e.payModel)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                          P {e.presentDays} · H {e.halfDays} · LOP {e.lopDays}
                          {(e.latePenalty > 0 || e.overtimeAmount > 0) && (
                            <span className="block mt-0.5">
                              {e.latePenalty > 0 && <span className="text-destructive">−₹{e.latePenalty} pen </span>}
                              {e.overtimeAmount > 0 && <span className="text-violet-600">+₹{e.overtimeAmount} OT</span>}
                            </span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{formatINR(e.gross)}</TableCell>
                      <TableCell className="text-destructive">{formatINR(e.totalDeductions)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatINR(e.netPay)}
                        {/* Without this the row reads as broken arithmetic: the
                            reimbursement is in Net but deliberately not in Gross. */}
                        {(e.expenseReimbursement || 0) > 0 && (
                          <span className="block mt-0.5 text-[11px] font-semibold text-muted-foreground/70 whitespace-nowrap">
                            incl. +{formatINR(e.expenseReimbursement || 0)} reimb.
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${ENTRY_STATUS_BADGE[e.status].base}`}>
                          {ENTRY_STATUS_BADGE[e.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)}><Eye /> Payslip</DropdownMenuItem>
                          {run.status === 'calculated' && (
                            <DropdownMenuItem onSelect={() => openEdit(e)}><Pen /> Edit</DropdownMenuItem>
                          )}
                          {e.status === 'approved' && (
                            <DropdownMenuItem onSelect={() => payEntry(e)}><Banknote /> Mark Paid</DropdownMenuItem>
                          )}
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {paged.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)}
                  className="p-4 space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{e.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground/70">{ROLE_LABELS[e.role] || e.role} · {payModelLabel(e.payModel)}</p>
                    </div>
                    <Badge className={`shrink-0 ${ENTRY_STATUS_BADGE[e.status].base}`}>
                      {ENTRY_STATUS_BADGE[e.status].label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>P {e.presentDays}</span><span>H {e.halfDays}</span><span>LOP {e.lopDays}</span>
                    {e.latePenalty > 0 && <span className="text-destructive">−₹{e.latePenalty}</span>}
                    {e.overtimeAmount > 0 && <span className="text-violet-600">+₹{e.overtimeAmount} OT</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-primary">{formatINR(e.netPay)}</p>
                    <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/hrms/payroll/run/${run.id}/payslip/${e.id}`)}  title="Payslip">
                        <Eye size={14} />
                      </Button>
                      {run.status === 'calculated' && (
                        <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => openEdit(e)}  title="Edit">
                          <Pen size={14} />
                        </Button>
                      )}
                      {e.status === 'approved' && (
                        <Button variant="ghost" size="icon-sm" className="hover:text-primary hover:bg-accent" onClick={() => payEntry(e)}  title="Mark Paid">
                          <Banknote size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startRow}</span>–
                  <span className="font-semibold text-foreground">{endRow}</span> of{' '}
                  <span className="font-semibold text-foreground">{filtered.length}</span> entries
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} >
                    <ChevronLeft size={16} className="text-foreground/70" />
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} >
                    <ChevronRight size={16} className="text-foreground/70" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {editEntry && editForm && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setEditEntry(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-lg overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Edit Entry — {editForm.employeeName}</h3>
              <button type="button" onClick={() => setEditEntry(null)} className="text-muted-foreground/70 hover:text-foreground/70 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Present Days">
                  <Input type="number"  value={editForm.presentDays} onChange={(e) => setEditForm({ ...editForm, presentDays: num(e.target.value) })} />
                </Field>
                <Field label="Half Days">
                  <Input type="number"  value={editForm.halfDays} onChange={(e) => setEditForm({ ...editForm, halfDays: num(e.target.value) })} />
                </Field>
                <Field label="Overtime Hours">
                  <Input type="number"  value={editForm.overtimeHours} onChange={(e) => setEditForm({ ...editForm, overtimeHours: num(e.target.value) })} />
                </Field>
                <Field label="LOP Days (Unpaid)">
                  <Input type="number"  value={editForm.lopDays} onChange={(e) => setEditForm({ ...editForm, lopDays: num(e.target.value) })} />
                </Field>
                <Field label="Bonus / Incentive">
                  <Input type="number"  value={editForm.bonus} onChange={(e) => setEditForm({ ...editForm, bonus: num(e.target.value) })} />
                </Field>
                <Field label="Late Penalty (₹)">
                  <Input type="number"  value={editForm.latePenalty} onChange={(e) => setEditForm({ ...editForm, latePenalty: num(e.target.value) })} />
                </Field>
                <Field label="Overtime Amount (₹)">
                  <Input type="number"  value={editForm.overtimeAmount} onChange={(e) => setEditForm({ ...editForm, overtimeAmount: num(e.target.value) })} />
                </Field>
                <Field label="Salary Advance Repayment (₹)">
                  <Input type="number"  value={editForm.advanceDeduction || 0} onChange={(e) => setEditForm({ ...editForm, advanceDeduction: num(e.target.value) })} />
                </Field>
                <Field label="Mediclaim Premium (₹)">
                  <Input type="number"  value={editForm.mediclaimDeduction || 0} onChange={(e) => setEditForm({ ...editForm, mediclaimDeduction: num(e.target.value) })} />
                </Field>
                <Field label="Expense Reimbursement (₹)">
                  <Input type="number"  value={editForm.expenseReimbursement || 0} onChange={(e) => setEditForm({ ...editForm, expenseReimbursement: num(e.target.value) })} />
                  <p className="mt-1 text-[11px] text-muted-foreground/70 leading-snug">
                    Filled from approved expense claims dated in this month. Added after deductions, so it is not taxed.
                  </p>
                </Field>
                <Field label="Payment Mode">
                  <SearchableSelect
                    value={editForm.paymentMode}
                    onChange={(v) => setEditForm({ ...editForm, paymentMode: v as PayEntry['paymentMode'] })}
                    options={PAYMENT_MODE_OPTIONS}
                    placeholder="Payment Mode"
                  />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Calculate pulls these from attendance. You can override here; saving recomputes the payslip.
              </p>
              <Button variant="dark" size="lg" className="w-full" type="submit" >
                <Pen size={16} />Save & Recalculate
              </Button>
            </form>
          </DialogContent>
</Dialog>
      )}

      {confirmDelete && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5">
              <h3 className="font-semibold text-foreground mb-1">Delete this run?</h3>
              <p className="text-xs text-muted-foreground">This permanently removes the {monthLabel(run.month)} run. You can Generate Run again for that month afterward.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)} >Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete} >Delete</Button>
            </div>
          </DialogContent>
</Dialog>
      )}

      {confirmRegenerate && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5">
              <h3 className="font-semibold text-foreground mb-1">Regenerate this run?</h3>
              <p className="text-xs text-muted-foreground">Rebuilds {monthLabel(run.month)} from all active salary structures, resets to draft, and replaces existing entries.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmRegenerate(false)} >Cancel</Button>
              <Button size="sm" className="flex-1 bg-violet-600 text-white hover:bg-violet-700 hover:text-white" onClick={handleRegenerate} >Regenerate</Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = fieldClass;
