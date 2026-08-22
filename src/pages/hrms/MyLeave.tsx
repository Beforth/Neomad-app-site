import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search, XCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  Plus, ChevronUp, ChevronDown, Inbox, Eye, CheckCircle2, X, Trash2,
  CalendarOff, Clock,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { listMyLeaveRequests, getMyLeaveBalances, withdrawLeaveRequest, getMyPolicy, LeaveRequestOut, LeaveBalanceOut, MyPolicyOut } from '../../lib/hrmsLeave';

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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

type SortKey = 'startDate' | 'days';

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
  if (status === 'cancelled') return <span className={`${base} bg-zinc-100 text-zinc-600`}>Cancelled</span>;
  return <span className={`${base} bg-amber-50 text-amber-600`}>Pending</span>;
}

export default function MyLeave() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [myPolicy, setMyPolicy] = useState<MyPolicyOut | null>(null);

  const reloadData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [reqData, balData, polData] = await Promise.all([
        listMyLeaveRequests(token),
        getMyLeaveBalances(token),
        getMyPolicy(token).catch(() => null),
      ]);
      setRequests(
        reqData.map((r) => ({
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
      setBalances(balData);
      if (polData) setMyPolicy(polData);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load your leave data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reloadData(); }, [reloadData]);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [detailTarget, setDetailTarget] = useState<LeaveRequest | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, typeFilter, searchDebounced]);

  const statCards = [
    { label: 'Total Requests', value: requests.length, icon: CalendarOff, color: 'bg-blue-50 text-blue-600' },
    { label: 'Approved', value: requests.filter((r) => r.status === 'approved').length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending', value: requests.filter((r) => r.status === 'pending').length, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Rejected', value: requests.filter((r) => r.status === 'rejected').length, icon: XCircle, color: 'bg-rose-50 text-rose-600' },
  ];

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all';

  const filtered = useMemo(() => {
    let data = [...requests];
    const q = searchDebounced.toLowerCase().trim();
    if (q) data = data.filter((r) => r.reason.toLowerCase().includes(q) || r.leaveType.toLowerCase().includes(q));
    if (statusFilter !== 'all') data = data.filter((r) => r.status === statusFilter);
    if (typeFilter !== 'all') data = data.filter((r) => r.leaveType === typeFilter);
    data.sort((a, b) => {
      const cmp = sortBy === 'days' ? a.days - b.days : a.startDate.localeCompare(b.startDate);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [requests, searchDebounced, statusFilter, typeFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  async function handleWithdraw() {
    if (!withdrawTarget || !token) return;
    try {
      await withdrawLeaveRequest(token, withdrawTarget.id);
      setWithdrawTarget(null);
      setToast('Leave request withdrawn');
      setTimeout(() => setToast(''), 2500);
      await reloadData();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to withdraw');
      setTimeout(() => setToast(''), 2500);
    }
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
          <p className="text-xs text-zinc-500 font-medium mt-0.5">View and manage your leave requests</p>
        </div>
        <Link
          to="/hrms/leave/apply/new"
          className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus size={14} />Apply for Leave
        </Link>
      </motion.header>

      <div className="space-y-6">
        {/* Assigned Policy Header */}
        {myPolicy && myPolicy.has_policy ? (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-2.5"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                  POL
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    Assigned Policy: {myPolicy.policy_name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    {myPolicy.period_label ? `Period: ${myPolicy.period_label}` : 'Active Company Policy'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                  Monthly Paid Limit: {myPolicy.max_paid_leaves ? `${myPolicy.max_paid_leaves} Days/mo` : 'Unlimited'}
                </span>
                <span className="px-3 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700">
                  Monthly Unpaid Limit: {myPolicy.max_unpaid_leaves ? `${myPolicy.max_unpaid_leaves} Days/mo` : 'Unlimited'}
                </span>
              </div>
            </div>

            {myPolicy.entitlements && myPolicy.entitlements.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
                {myPolicy.entitlements.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                    <span className="font-bold text-zinc-900">{e.leave_type_name || `Type ${e.leave_type_id}`}</span>
                    <span className="font-semibold text-emerald-700">{e.days} Days/yr</span>
                    {e.carry_forward && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Carry Forward</span>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : null}

        {/* Leave Balance Breakdown Cards */}
        {balances.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <CalendarOff size={16} className="text-emerald-600" />
                Your Leave Balances
              </h3>
              <span className="text-[11px] font-medium text-zinc-400">Calculated real-time</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {balances.map((b) => (
                <div key={b.leave_type_id} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{b.leave_type_name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{b.used} used of {b.total}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-emerald-600 leading-none block">{b.remaining}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">left</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{card.value}</p>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{card.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

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
                placeholder="Search reason, leave type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
            </div>
            <div className="w-[150px]">
              <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
            </div>
            <div className="w-[150px]">
              <SearchableSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  ...balances.map((b) => ({ value: b.leave_type_name, label: b.leave_type_name })),
                ]}
                placeholder="Leave Type"
              />
            </div>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }}
                className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
              >
                <XCircle size={12} />Clear
              </button>
            )}
          </motion.div>

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
                  onClick={reloadData}
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
                          { key: null, label: 'Leave Type' },
                          { key: 'startDate' as SortKey, label: 'Dates' },
                          { key: 'days' as SortKey, label: 'Breakdown' },
                          { key: null, label: 'Classification' },
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
                          <td className="px-4 py-3 text-xs font-medium text-zinc-700">{r.leaveType}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                            {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-zinc-800">
                                {r.days}d Total
                              </span>
                              <span className="text-[10px] text-zinc-500 font-semibold">
                                {r.paidDays > 0 ? `${r.paidDays} Paid` : ''}
                                {r.paidDays > 0 && r.lwpDays > 0 ? ' + ' : ''}
                                {r.lwpDays > 0 ? `${r.lwpDays} LWP` : ''}
                                {r.paidDays === 0 && r.lwpDays === 0 ? `${r.days}d` : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {r.unplannedDays > 0 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Unplanned ({r.unplannedDays}d)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Planned ({r.plannedDays}d)
                                </span>
                              )}
                              {r.isEmergency && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  Emergency
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 max-w-[160px] truncate">{r.reason}</td>
                          <td className="px-4 py-3">{statusBadge(r.status)}</td>
                          <td className="px-4 py-3 text-[10px] text-zinc-400 whitespace-nowrap">{formatDate(r.appliedOn)}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDetailTarget(r)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                                <Eye size={14} />
                              </button>
                              {r.status === 'pending' && (
                                <button
                                  onClick={() => setWithdrawTarget(r)}
                                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Withdraw"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
                          <p className="text-xs font-bold text-zinc-900">{r.leaveType}</p>
                        </div>
                        {statusBadge(r.status)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-zinc-400">
                          {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''} · {r.days}d
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{r.reason}</p>
                      <div className="flex items-center gap-1 pt-1">
                        <button onClick={() => setDetailTarget(r)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        {r.status === 'pending' && (
                          <button
                            onClick={() => setWithdrawTarget(r)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Withdraw"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

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
      </div>

      {detailTarget && (        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setDetailTarget(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => setDetailTarget(null)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">{detailTarget.leaveType}</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {formatDate(detailTarget.startDate)}{detailTarget.startDate !== detailTarget.endDate ? ` – ${formatDate(detailTarget.endDate)}` : ''} · {detailTarget.days} day{detailTarget.days !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="ml-auto">{statusBadge(detailTarget.status)}</div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Reason</p>
                <p className="text-sm text-zinc-700">{detailTarget.reason}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Applied On</p>
                <p className="text-sm text-zinc-700">{formatDate(detailTarget.appliedOn)}</p>
              </div>
              <div className="flex justify-end pt-1">
                <button type="button" onClick={() => setDetailTarget(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {withdrawTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setWithdrawTarget(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => setWithdrawTarget(null)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">Withdraw leave request?</h3>
              <p className="text-sm text-zinc-600 mt-2">
                <span className="font-semibold text-zinc-800">{withdrawTarget.leaveType}</span>
                {' · '}
                {formatDate(withdrawTarget.startDate)}{withdrawTarget.startDate !== withdrawTarget.endDate ? ` – ${formatDate(withdrawTarget.endDate)}` : ''}
              </p>
              <p className="text-xs text-red-600 font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => setWithdrawTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleWithdraw}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors">
                <Trash2 size={16} /> Withdraw
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
