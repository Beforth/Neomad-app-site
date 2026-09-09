import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, XCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  Plus, ChevronUp, ChevronDown, Inbox, Eye, CheckCircle2, X, Loader2, Check, ShieldAlert, Trash2,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { listLeaveRequests, approveLeaveRequest, rejectLeaveRequest, withdrawLeaveRequest, listLeaveTypes } from '../../lib/hrmsLeave';

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
  if (status === 'approved') return <span className={`${base} bg-emerald-50 text-emerald-600`}>Approved</span>;
  if (status === 'rejected') return <span className={`${base} bg-rose-50 text-rose-600`}>Rejected</span>;
  return <span className={`${base} bg-amber-50 text-amber-600`}>Pending</span>;
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
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </motion.div>
      )}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave Requests</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">View and manage leave requests from your team</p>
        </div>
        <Link
          to="/hrms/leave/apply/new"
          className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus size={14} />Apply for Leave
        </Link>
      </motion.header>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center"
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search employee, reason, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
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
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent outline-none text-xs text-zinc-700 font-medium cursor-pointer [color-scheme:light]"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent outline-none text-xs text-zinc-700 font-medium cursor-pointer [color-scheme:light]"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setFromDate(''); setToDate(''); }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden"
      >
        {loadError && (
          <div className="p-4 bg-rose-50/80 border-b border-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-900">
              <XCircle size={16} className="text-rose-600 shrink-0" />
              {loadError}
            </div>
            <button
              onClick={reloadRequests}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <Inbox size={24} className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No leave requests found</h3>
            <p className="text-xs text-zinc-400 max-w-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
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
                      <th
                        key={col.label}
                        onClick={col.key ? () => toggleSort(col.key) : undefined}
                        className={`px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-zinc-600 select-none' : ''}`}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.key && <SortIcon col={col.key} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {paged.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-zinc-900 block">{r.employee}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-700">{r.leaveType}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-800">
                          {r.days} d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[180px] truncate">{r.reason}</td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3 text-[10px] text-zinc-400 whitespace-nowrap">{formatDate(r.appliedOn)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewTarget(r)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer" title="View Details">
                            <Eye size={16} />
                          </button>
                          {(r.status === 'pending' || r.status === 'rejected') && (
                            <button
                              onClick={() => handleAction(r.id, 'approved')}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Approve Request"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          {(r.status === 'pending' || r.status === 'approved') && (
                            <button
                              onClick={() => handleAction(r.id, 'rejected')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Reject Request"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Leave Request"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-zinc-100">
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
                      <p className="text-xs font-bold text-zinc-900">{r.employee}</p>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600">
                      {r.leaveType}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''} · {r.days}d
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-1">{r.reason}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button onClick={() => setViewTarget(r)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer" title="View">
                      <Eye size={18} />
                    </button>
                    {(r.status === 'pending' || r.status === 'rejected') && (
                      <button
                        onClick={() => handleAction(r.id, 'approved')}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Approve"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    {(r.status === 'pending' || r.status === 'approved') && (
                      <button
                        onClick={() => handleAction(r.id, 'rejected')}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Reject"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
              <p className="text-xs text-zinc-500">
                Showing <span className="font-bold text-zinc-900">{startRow}</span>–
                <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
                <span className="font-bold text-zinc-900">{filtered.length}</span> requests
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-zinc-600" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-zinc-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* View Request Details Modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setViewTarget(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-100 relative">
              <button type="button" onClick={() => setViewTarget(null)}
                className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-base font-bold text-zinc-900">Leave Request Details</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{viewTarget.employee} · {viewTarget.leaveType}</p>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-0.5">Dates</span>
                  <span className="font-bold text-zinc-800">{formatDate(viewTarget.startDate)} {viewTarget.startDate !== viewTarget.endDate ? `– ${formatDate(viewTarget.endDate)}` : ''}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-0.5">Total Duration</span>
                  <span className="font-bold text-zinc-800">{viewTarget.days} Day(s)</span>
                </div>
              </div>

              {/* Notice & Application Timing */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-semibold">Application Timing:</span>
                  {viewTarget.startDate < viewTarget.appliedOn ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      ⚠️ Late Application (Applied after taking leave)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ On-Time Application (Informed in advance)
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-semibold">Calculated Breakdown:</span>
                  <span className="font-bold text-zinc-900">
                    {viewTarget.paidDays > 0 ? `${viewTarget.paidDays} Paid` : ''}
                    {viewTarget.paidDays > 0 && viewTarget.lwpDays > 0 ? ' + ' : ''}
                    {viewTarget.lwpDays > 0 ? `${viewTarget.lwpDays} LWP` : ''}
                    {viewTarget.paidDays === 0 && viewTarget.lwpDays === 0 ? `${viewTarget.days}d` : ''}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Reason</span>
                <p className="text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 leading-relaxed">{viewTarget.reason || 'No reason provided'}</p>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-zinc-500 font-semibold">Status:</span>
                {statusBadge(viewTarget.status)}
              </div>
            </div>
            <div className="px-5 py-3 flex justify-end bg-zinc-50/80">
              <button type="button" onClick={() => setViewTarget(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Approve / Reject Action Modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setActionTarget(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => setActionTarget(null)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">
                {actionTarget.action === 'approved' ? 'Approve' : 'Reject'} leave request?
              </h3>
              <p className="text-sm text-zinc-600 mt-1">
                <span className="font-semibold text-zinc-800">
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
                  <div className="mt-3 bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-semibold">Application Timing:</span>
                      {isLate ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          ⚠️ Late Application
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ On-Time Application
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-semibold">Calculated Breakdown:</span>
                      <span className="font-bold text-zinc-900">
                        {req.paidDays > 0 ? `${req.paidDays} Paid` : ''}
                        {req.paidDays > 0 && req.lwpDays > 0 ? ' + ' : ''}
                        {req.lwpDays > 0 ? `${req.lwpDays} LWP` : ''}
                        {req.paidDays === 0 && req.lwpDays === 0 ? `${req.days}d` : ''}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <p className="text-xs text-red-600 font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              {actionTarget.action === 'approved' && (
                <div
                  onClick={() => setActionTarget({ ...actionTarget, isEmergencyOverride: !actionTarget.isEmergencyOverride })}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${actionTarget.isEmergencyOverride ? 'bg-purple-100/80 border-purple-400 shadow-sm' : 'bg-purple-50/50 border-purple-200'}`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${actionTarget.isEmergencyOverride ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-purple-300'}`}>
                    {actionTarget.isEmergencyOverride && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
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
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Reason / Notes (optional)
                </label>
                <textarea
                  value={actionTarget.comment}
                  onChange={(e) => setActionTarget({ ...actionTarget, comment: e.target.value })}
                  placeholder={
                    actionTarget.action === 'rejected'
                      ? 'Add an optional reason for rejection...'
                      : 'Add an optional note...'
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => setActionTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={confirmAction}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${actionTarget.action === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                {actionTarget.action === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {actionTarget.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-zinc-900">Delete Leave Request?</h3>
                <p className="text-xs text-zinc-500">
                  Are you sure you want to delete the leave request for <strong className="text-zinc-800">{deleteTarget.employee}</strong> ({deleteTarget.leaveType}, {deleteTarget.days}d)? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRequest}
                  disabled={deleting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
