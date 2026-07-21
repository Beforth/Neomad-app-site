import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search, XCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  Plus, ChevronUp, ChevronDown, Inbox, Eye, CheckCircle2, X,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'Sick Leave', label: 'Sick Leave' },
  { value: 'Casual Leave', label: 'Casual Leave' },
  { value: 'Earned Leave', label: 'Earned Leave' },
  { value: 'Maternity Leave', label: 'Maternity Leave' },
  { value: 'Paternity Leave', label: 'Paternity Leave' },
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
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
}

const initialData: LeaveRequest[] = [
  { id: 1, employee: 'Rahul Sharma', department: 'Delivery', leaveType: 'Sick Leave', startDate: '2026-07-10', endDate: '2026-07-12', days: 3, reason: 'Fever and cold', status: 'approved', appliedOn: '2026-07-08' },
  { id: 2, employee: 'Priya Patil', department: 'Operations', leaveType: 'Casual Leave', startDate: '2026-07-14', endDate: '2026-07-14', days: 1, reason: 'Personal work', status: 'pending', appliedOn: '2026-07-12' },
  { id: 3, employee: 'Amit Deshmukh', department: 'Warehouse', leaveType: 'Earned Leave', startDate: '2026-07-18', endDate: '2026-07-22', days: 5, reason: 'Family vacation', status: 'pending', appliedOn: '2026-07-10' },
  { id: 4, employee: 'Sneha Kulkarni', department: 'Office Admin', leaveType: 'Sick Leave', startDate: '2026-07-05', endDate: '2026-07-06', days: 2, reason: 'Doctor appointment', status: 'approved', appliedOn: '2026-07-04' },
  { id: 5, employee: 'Vikram Jadhav', department: 'Delivery', leaveType: 'Casual Leave', startDate: '2026-07-20', endDate: '2026-07-20', days: 1, reason: 'Bank work', status: 'rejected', appliedOn: '2026-07-15' },
  { id: 6, employee: 'Neha Gaikwad', department: 'Operations', leaveType: 'Maternity Leave', startDate: '2026-08-01', endDate: '2027-01-28', days: 180, reason: 'Maternity', status: 'approved', appliedOn: '2026-06-20' },
  { id: 7, employee: 'Suresh More', department: 'Delivery', leaveType: 'Sick Leave', startDate: '2026-07-15', endDate: '2026-07-15', days: 1, reason: 'Migraine', status: 'pending', appliedOn: '2026-07-14' },
  { id: 8, employee: 'Pooja Mane', department: 'Warehouse', leaveType: 'Casual Leave', startDate: '2026-07-25', endDate: '2026-07-26', days: 2, reason: 'Family function', status: 'pending', appliedOn: '2026-07-16' },
  { id: 9, employee: 'Rajesh Kumar', department: 'Delivery', leaveType: 'Earned Leave', startDate: '2026-07-28', endDate: '2026-07-30', days: 3, reason: 'Personal reasons', status: 'approved', appliedOn: '2026-07-11' },
  { id: 10, employee: 'Kavita Shinde', department: 'Office Admin', leaveType: 'Paternity Leave', startDate: '2026-07-21', endDate: '2026-07-25', days: 5, reason: 'Child birth', status: 'approved', appliedOn: '2026-07-01' },
  { id: 11, employee: 'Anil Rathod', department: 'Delivery', leaveType: 'Sick Leave', startDate: '2026-07-08', endDate: '2026-07-09', days: 2, reason: 'Stomach ache', status: 'rejected', appliedOn: '2026-07-07' },
  { id: 12, employee: 'Meena Yadav', department: 'Operations', leaveType: 'Casual Leave', startDate: '2026-07-22', endDate: '2026-07-22', days: 1, reason: 'Urgent work at home', status: 'pending', appliedOn: '2026-07-17' },
  { id: 13, employee: 'Deepak Verma', department: 'Warehouse', leaveType: 'Earned Leave', startDate: '2026-08-05', endDate: '2026-08-08', days: 4, reason: 'Trip planned', status: 'pending', appliedOn: '2026-07-17' },
  { id: 14, employee: 'Sunita Bhosale', department: 'Delivery', leaveType: 'Sick Leave', startDate: '2026-07-16', endDate: '2026-07-17', days: 2, reason: 'Back pain', status: 'approved', appliedOn: '2026-07-15' },
  { id: 15, employee: 'Ramesh Naik', department: 'Office Admin', leaveType: 'Casual Leave', startDate: '2026-07-29', endDate: '2026-07-29', days: 1, reason: 'Personal work', status: 'pending', appliedOn: '2026-07-17' },
];

const PAGE_SIZE = 10;

function loadRequests(): LeaveRequest[] {
  try {
    const stored = localStorage.getItem('leaveRequests');
    if (stored) return JSON.parse(stored) as LeaveRequest[];
  } catch {}
  return initialData;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status: string) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize';
  if (status === 'approved') return <span className={`${base} bg-emerald-50 text-emerald-600`}>Approved</span>;
  if (status === 'rejected') return <span className={`${base} bg-rose-50 text-rose-600`}>Rejected</span>;
  return <span className={`${base} bg-amber-50 text-amber-600`}>Pending</span>;
}

export default function LeaveRequest() {
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState<LeaveRequest[]>(loadRequests);
  const [actionTarget, setActionTarget] = useState<{ id: number; action: 'approved' | 'rejected' } | null>(null);

  useEffect(() => { localStorage.setItem('leaveRequests', JSON.stringify(requests)); }, [requests]);

  function handleAction(id: number, newStatus: 'approved' | 'rejected') {
    setActionTarget({ id, action: newStatus });
  }

  function confirmAction() {
    if (!actionTarget) return;
    setRequests((prev) => prev.map((r) => (r.id === actionTarget.id ? { ...r, status: actionTarget.action } : r)));
    setActionTarget(null);
  }

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, typeFilter, searchDebounced]);

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

    data.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'employee') cmp = a.employee.localeCompare(b.employee);
      else if (sortBy === 'startDate') cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      else if (sortBy === 'days') cmp = a.days - b.days;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [requests, searchDebounced, statusFilter, typeFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all';

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
        <div className="w-[160px]">
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            className="w-full"
          />
        </div>
        <div className="w-[160px]">
          <SearchableSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_OPTIONS}
            className="w-full"
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

      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden"
      >
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
                        <span className="text-xs font-bold text-zinc-900">{r.employee}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-700">{r.leaveType}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700">
                          {r.days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[160px] truncate">{r.reason}</td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3 text-[10px] text-zinc-400 whitespace-nowrap">{formatDate(r.appliedOn)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(r.id, 'approved')}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Accept"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={() => handleAction(r.id, 'rejected')}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
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
                  <div className="flex items-center gap-1 pt-1">
                    <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                      <Eye size={14} />
                    </button>
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(r.id, 'approved')}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Accept"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'rejected')}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
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
              <p className="text-sm text-zinc-600 mt-2">
                <span className="font-semibold text-zinc-800">
                  {requests.find((r) => r.id === actionTarget.id)?.employee}
                </span>
                {' · '}
                {requests.find((r) => r.id === actionTarget.id)?.leaveType}
              </p>
              <p className="text-xs text-red-600 font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => setActionTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={confirmAction}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${actionTarget.action === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                {actionTarget.action === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {actionTarget.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
