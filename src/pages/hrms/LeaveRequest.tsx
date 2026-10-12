import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, XCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  Plus, ChevronUp, ChevronDown, Inbox, Eye, CheckCircle2, X, Loader2, Check, ShieldAlert, Trash2, MoreHorizontal } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { listLeaveRequests, approveLeaveRequest, rejectLeaveRequest, withdrawLeaveRequest, listLeaveTypes } from '../../lib/hrmsLeave';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'Medical Leave', label: 'Medical Leave' },
  { value: 'Privilege Leave', label: 'Privilege Leave' },
  { value: 'Casual Leave', label: 'Casual Leave' },
  { value: 'Leave Without Pay', label: 'Leave Without Pay' },
];

type SortKey = 'employee' | 'startDate' | 'days';

interface LeaveRequest {
  id: number;
  employee: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  isInformed: boolean;
  isEmergency: boolean;
  paidDays: number;
  lwpDays: number;
  plannedDays: number;
  unplannedDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
}

const PAGE_SIZE = 10;

function formatDate(d: string) {
  const parts = d.split('T')[0].split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return d;
  const [y, m, day] = parts;
  return new Date(y, m - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status: string) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize';
  if (status === 'approved') return <span className={`${base} bg-accent text-primary`}>Approved</span>;
  if (status === 'rejected') return <span className={`${base} bg-destructive/10 text-destructive`}>Rejected</span>;
  return <span className={`${base} bg-warning/10 text-warning`}>Pending</span>;
}

export default function LeaveRequest() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string }[]>([]);
  const [actionTarget, setActionTarget] = useState<{ id: number; action: 'approved' | 'rejected'; comment: string; isEmergencyOverride: boolean } | null>(null);
  const [viewTarget, setViewTarget] = useState<LeaveRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const types = await listLeaveTypes(token);
        setLeaveTypes(types);
      } catch (e) {
        console.error('Failed to load leave types:', e);
      }
    })();
  }, [token]);

  const typeOptions = useMemo(() => [
    { value: 'all', label: 'All Types' },
    ...leaveTypes.map((t) => ({ value: t.name, label: t.name })),
  ], [leaveTypes]);

  const reloadRequests = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listLeaveRequests(token);
      setRequests(
        data.map((r) => ({
          id: r.id,
          employee: r.employee_name || r.employee_email || `User #${r.user_id}`,
          department: 'Staff',
          leaveType: r.leave_type_name || `Type #${r.leave_type_id}`,
          startDate: r.start_date,
          endDate: r.end_date,
          days: r.days,
          isInformed: r.is_informed ?? true,
          isEmergency: r.is_emergency ?? false,
          paidDays: r.paid_days ?? 0,
          lwpDays: r.lwp_days ?? 0,
          plannedDays: r.planned_days ?? 0,
          unplannedDays: r.unplanned_days ?? 0,
          reason: r.reason || '',
          status: (r.status as any) || 'pending',
          appliedOn: r.applied_on ? r.applied_on.split('T')[0] : r.start_date,
        }))
      );
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reloadRequests(); }, [reloadRequests]);

  function handleAction(id: number, newStatus: 'approved' | 'rejected') {
    const r = requests.find((req) => req.id === id);
    setActionTarget({ id, action: newStatus, comment: '', isEmergencyOverride: r?.isEmergency || false });
  }

  async function confirmAction() {
    if (!actionTarget || !token) return;
    const comment = actionTarget.comment.trim() || undefined;
    try {
      if (actionTarget.action === 'approved') {
        await approveLeaveRequest(token, actionTarget.id, comment, actionTarget.isEmergencyOverride);
        showToast('Leave request approved');
      } else {
        await rejectLeaveRequest(token, actionTarget.id, comment);
        showToast('Leave request rejected');
      }
      await reloadRequests();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to resolve leave request');
    } finally {
      setActionTarget(null);
    }
  }

  async function confirmDeleteRequest() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await withdrawLeaveRequest(token, deleteTarget.id);
      showToast('Leave request deleted successfully');
      setDeleteTarget(null);
      await reloadRequests();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete leave request');
    } finally {
      setDeleting(false);
    }
  }

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, typeFilter, searchDebounced, fromDate, toDate]);

  const filtered = useMemo(() => {
    let data = [...requests];
    const q = searchDebounced.toLowerCase().trim();
    if (q) {
      data = data.filter(
        (r) => r.employee.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.department.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') data = data.filter((r) => r.status === statusFilter);
    if (typeFilter !== 'all') data = data.filter((r) => r.leaveType === typeFilter);

    if (fromDate) {
      data = data.filter((r) => r.startDate >= fromDate || r.endDate >= fromDate);
    }
    if (toDate) {
      data = data.filter((r) => r.startDate <= toDate || r.endDate <= toDate);
    }

    data.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'employee') cmp = a.employee.localeCompare(b.employee);
      else if (sortBy === 'startDate') cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      else if (sortBy === 'days') cmp = a.days - b.days;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [requests, searchDebounced, statusFilter, typeFilter, fromDate, toDate, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || fromDate || toDate;

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}
      <PageHeader title="Leave Requests" description="View and manage leave requests from your team" actions={<>
<Link
          to="/hrms/leave/apply/new"
          className="self-start sm:self-auto flex items-center gap-2 bg-foreground text-white border border-foreground px-4 py-2 rounded-md text-xs font-semibold hover:bg-foreground transition-colors shadow-sm"
        >
          <Plus size={14} />Apply for Leave
        </Link>
</>} />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search employee, reason, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
          />
        </div>
        <div className="w-[140px]">
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            className="w-full"
          />
        </div>
        <div className="w-[140px]">
          <SearchableSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
            className="w-full"
          />
        </div>

        {/* Date Pickers (From Date & To Date) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[11px] text-muted-foreground/70 font-semibold uppercase">From</span>
            <Input className="cursor-pointer w-auto"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              
            />
          </div>
          <div className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[11px] text-muted-foreground/70 font-semibold uppercase">To</span>
            <Input className="cursor-pointer w-auto"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setFromDate(''); setToDate(''); }}
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        {loadError && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
              <XCircle size={16} className="text-destructive shrink-0" />
              {loadError}
            </div>
            <Button variant="destructive" size="xs" className="shrink-0"
              onClick={reloadRequests}
              
            >
              Retry
            </Button>
          </div>
        )}
        {filtered.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No leave requests found" description="Try adjusting your search or filters" className="border-0" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: 'employee' as SortKey, label: 'Employee' },
                      { key: null, label: 'Leave Type' },
                      { key: 'startDate' as SortKey, label: 'Dates' },
                      { key: 'days' as SortKey, label: 'Duration' },
                      { key: null, label: 'Reason' },
                      { key: null, label: 'Status' },
                      { key: null, label: 'Applied On' },
                      { key: null, label: 'Actions' },
                    ].map((col) => (
                      <TableHead
                        key={col.label}
                        onClick={col.key ? () => toggleSort(col.key) : undefined}
                        className={`uppercase whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-foreground/70 select-none' : ''}`}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.key && <SortIcon col={col.key} />}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/70"
                    >
                      <TableCell>
                        <span className="text-xs font-semibold text-foreground block">{r.employee}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground/85">{r.leaveType}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary text-xs font-semibold text-foreground">
                            {r.days} d
                          </span>
                          {(r.paidDays > 0 || r.lwpDays > 0) && (
                            <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                              {r.paidDays > 0 ? `${r.paidDays} Paid` : ''}
                              {r.paidDays > 0 && r.lwpDays > 0 ? ' · ' : ''}
                              {r.lwpDays > 0 ? `${r.lwpDays} LWP` : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">{r.reason}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-muted-foreground/70 whitespace-nowrap">{formatDate(r.appliedOn)}</TableCell>
                      <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => setViewTarget(r)}><Eye /> View Details</DropdownMenuItem>
                          {(r.status === 'pending' || r.status === 'rejected') && (
                            <DropdownMenuItem onSelect={() => handleAction(r.id, 'approved')}><CheckCircle2 /> Approve Request</DropdownMenuItem>
                          )}
                          {(r.status === 'pending' || r.status === 'approved') && (
                            <DropdownMenuItem onSelect={() => handleAction(r.id, 'rejected')}><XCircle /> Reject Request</DropdownMenuItem>
                          )}
                          <DropdownMenuItem destructive onSelect={() => setDeleteTarget(r)}><Trash2 /> Delete Leave Request</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {paged.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{r.employee}</p>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge>
                      {r.leaveType}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground/70">
                      {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''} · {r.days}d
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{r.reason}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={() => setViewTarget(r)}  title="View">
                      <Eye size={18} />
                    </Button>
                    {(r.status === 'pending' || r.status === 'rejected') && (
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer text-primary hover:bg-accent"
                        onClick={() => handleAction(r.id, 'approved')}
                        
                        title="Approve"
                      >
                        <CheckCircle2 size={18} />
                      </Button>
                    )}
                    {(r.status === 'pending' || r.status === 'approved') && (
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer text-warning hover:bg-warning/10"
                        onClick={() => handleAction(r.id, 'rejected')}
                        
                        title="Reject"
                      >
                        <XCircle size={18} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" className="cursor-pointer text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(r)}
                      
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startRow}</span>–
                <span className="font-semibold text-foreground">{endRow}</span> of{' '}
                <span className="font-semibold text-foreground">{filtered.length}</span> requests
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  
                >
                  <ChevronLeft size={16} className="text-foreground/70" />
                </Button>
                <Button variant="outline" size="icon-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  
                >
                  <ChevronRight size={16} className="text-foreground/70" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* View Request Details Modal */}
      {viewTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setViewTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-5 right-5" type="button" onClick={() => setViewTarget(null)}
                >
                <X size={18} />
              </Button>
              <h3 className="text-base font-semibold text-foreground">Leave Request Details</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{viewTarget.employee} · {viewTarget.leaveType}</p>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted p-3 rounded-xl border border-border">
                <div>
                  <span className="text-[11px] text-muted-foreground/70 font-semibold uppercase block mb-0.5">Dates</span>
                  <span className="font-semibold text-foreground">{formatDate(viewTarget.startDate)} {viewTarget.startDate !== viewTarget.endDate ? `– ${formatDate(viewTarget.endDate)}` : ''}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground/70 font-semibold uppercase block mb-0.5">Total Duration</span>
                  <span className="font-semibold text-foreground">{viewTarget.days} Day(s)</span>
                </div>
              </div>

              {/* Notice & Application Timing */}
              <div className="bg-muted border border-border rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Application Timing:</span>
                  {viewTarget.startDate < viewTarget.appliedOn ? (
                    <Badge variant="warning" >
                      ⚠️ Late Application (Applied after taking leave)
                    </Badge>
                  ) : (
                    <Badge variant="success" >
                      ✓ On-Time Application (Informed in advance)
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Calculated Breakdown:</span>
                  <span className="font-semibold text-foreground">
                    {viewTarget.paidDays > 0 ? `${viewTarget.paidDays} Paid` : ''}
                    {viewTarget.paidDays > 0 && viewTarget.lwpDays > 0 ? ' + ' : ''}
                    {viewTarget.lwpDays > 0 ? `${viewTarget.lwpDays} LWP` : ''}
                    {viewTarget.paidDays === 0 && viewTarget.lwpDays === 0 ? `${viewTarget.days}d` : ''}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground/70 font-semibold uppercase block mb-1">Reason</span>
                <p className="text-foreground/85 bg-muted p-2.5 rounded-lg border border-border leading-relaxed">{viewTarget.reason || 'No reason provided'}</p>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground font-semibold">Status:</span>
                {statusBadge(viewTarget.status)}
              </div>
            </div>
            <div className="px-5 py-3 flex justify-end bg-muted/80">
              <Button variant="dark" size="sm" type="button" onClick={() => setViewTarget(null)}
                >
                Close
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}

      {/* Approve / Reject Action Modal */}
      {actionTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setActionTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => setActionTarget(null)}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">
                {actionTarget.action === 'approved' ? 'Approve' : 'Reject'} leave request?
              </h3>
              <p className="text-sm text-foreground/70 mt-1">
                <span className="font-semibold text-foreground">
                  {requests.find((r) => r.id === actionTarget.id)?.employee}
                </span>
                {' · '}
                {requests.find((r) => r.id === actionTarget.id)?.leaveType}
              </p>

              {/* Request Notice & Breakdown Summary */}
              {(() => {
                const req = requests.find((r) => r.id === actionTarget.id);
                if (!req) return null;
                const isLate = req.startDate < req.appliedOn;
                return (
                  <div className="mt-3 bg-muted border border-border rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Application Timing:</span>
                      {isLate ? (
                        <Badge variant="warning" >
                          ⚠️ Late Application
                        </Badge>
                      ) : (
                        <Badge variant="success" >
                          ✓ On-Time Application
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Calculated Breakdown:</span>
                      <span className="font-semibold text-foreground">
                        {req.paidDays > 0 ? `${req.paidDays} Paid` : ''}
                        {req.paidDays > 0 && req.lwpDays > 0 ? ' + ' : ''}
                        {req.lwpDays > 0 ? `${req.lwpDays} LWP` : ''}
                        {req.paidDays === 0 && req.lwpDays === 0 ? `${req.days}d` : ''}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <p className="text-xs text-destructive font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              {actionTarget.action === 'approved' && (
                <div
                  onClick={() => setActionTarget({ ...actionTarget, isEmergencyOverride: !actionTarget.isEmergencyOverride })}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${actionTarget.isEmergencyOverride ? 'bg-purple-100/80 border-purple-400 shadow-sm' : 'bg-purple-50/50 border-purple-200'}`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${actionTarget.isEmergencyOverride ? 'bg-purple-700 border-purple-700 text-white' : 'bg-card border-purple-300'}`}>
                    {actionTarget.isEmergencyOverride && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-purple-700" />
                      Emergency Exception Override
                    </span>
                    <span className="text-[11px] text-purple-800/80 block leading-tight mt-0.5">
                      Waive the 2 paid days/month limit for this request and convert LWP days to Paid using the employee's yearly balance.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground/85 mb-1.5">
                  Reason / Notes (optional)
                </label>
                <Textarea className="w-full"
                  value={actionTarget.comment}
                  onChange={(e) => setActionTarget({ ...actionTarget, comment: e.target.value })}
                  placeholder={
                    actionTarget.action === 'rejected'
                      ? 'Add an optional reason for rejection...'
                      : 'Add an optional note...'
                  }
                  rows={3}
                  
                />
              </div>
            </div>
            <div className="px-6 py-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" type="button" onClick={() => setActionTarget(null)}
                >
                Cancel
              </Button>
              <button type="button" onClick={confirmAction}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${actionTarget.action === 'approved' ? 'border-primary/20 bg-accent text-accent-foreground hover:bg-primary/15' : 'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15'}`}>
                {actionTarget.action === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {actionTarget.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </DialogContent>
</Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm">
<DialogTitle className="sr-only">Dialog</DialogTitle>
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-foreground">Delete Leave Request?</h3>
                <p className="text-xs text-muted-foreground">
                  Are you sure you want to delete the leave request for <strong className="text-foreground">{deleteTarget.employee}</strong> ({deleteTarget.leaveType}, {deleteTarget.days}d)? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" size="sm" className="flex-1 cursor-pointer"
                  onClick={() => setDeleteTarget(null)}
                  
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className="flex-1 cursor-pointer"
                  onClick={confirmDeleteRequest}
                  disabled={deleting}
                  
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
              </div>
            </DialogContent>
</Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
