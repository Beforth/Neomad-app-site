import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search, XCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  Plus, ChevronUp, ChevronDown, Inbox, Pencil, Trash2, X,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface LeaveTypeItem {
  id: number;
  name: string;
  daysPerYear: number;
  carryForward: boolean;
  maxCarryForwardLeaves: number;
  carryForwardExpiryDays: number;
  allowLeaveAfterDays: number;
  maxConsecutiveLeaves: number;
  isLeaveWithoutPay: boolean;
  isPartiallyPaidLeave: boolean;
  isOptionalLeave: boolean;
  allowNegativeBalance: boolean;
  allowOverAllocating: boolean;
  includeHolidaysAsLeaves: boolean;
  isCompensatory: boolean;
  description: string;
  status: 'active' | 'inactive';
}

const initialData: LeaveTypeItem[] = [
  { id: 1, name: 'Sick Leave', daysPerYear: 12, carryForward: true, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For medical reasons and health issues', status: 'active' },
  { id: 2, name: 'Casual Leave', daysPerYear: 12, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For personal work and short-term needs', status: 'active' },
  { id: 3, name: 'Earned Leave', daysPerYear: 20, carryForward: true, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'Accumulated leave for vacation and long breaks', status: 'active' },
  { id: 4, name: 'Maternity Leave', daysPerYear: 180, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For expecting and new mothers', status: 'active' },
  { id: 5, name: 'Paternity Leave', daysPerYear: 5, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For new fathers', status: 'active' },
  { id: 6, name: 'Bereavement Leave', daysPerYear: 5, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'For loss of immediate family member', status: 'active' },
  { id: 7, name: 'Unpaid Leave', daysPerYear: 0, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: true, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: false, description: 'Leave without pay', status: 'active' },
  { id: 8, name: 'Comp Off', daysPerYear: 10, carryForward: false, maxCarryForwardLeaves: 0, carryForwardExpiryDays: 0, allowLeaveAfterDays: 0, maxConsecutiveLeaves: 0, isLeaveWithoutPay: false, isPartiallyPaidLeave: false, isOptionalLeave: false, allowNegativeBalance: false, allowOverAllocating: false, includeHolidaysAsLeaves: false, isCompensatory: true, description: 'Compensatory off for weekend or holiday work', status: 'inactive' },
];

const PAGE_SIZE = 10;

type SortKey = 'name' | 'daysPerYear';

function loadTypes() {
  try {
    const stored = localStorage.getItem('leaveTypes');
    if (stored) {
      const parsed = JSON.parse(stored) as LeaveTypeItem[];
      return parsed.map((item) => ({
        ...item,
        carryForward: item.carryForward ?? false,
        maxCarryForwardLeaves: item.maxCarryForwardLeaves ?? 0,
        carryForwardExpiryDays: item.carryForwardExpiryDays ?? 0,
        allowLeaveAfterDays: item.allowLeaveAfterDays ?? 0,
        maxConsecutiveLeaves: item.maxConsecutiveLeaves ?? 0,
        isLeaveWithoutPay: item.isLeaveWithoutPay ?? false,
        isPartiallyPaidLeave: item.isPartiallyPaidLeave ?? false,
        isOptionalLeave: item.isOptionalLeave ?? false,
        allowNegativeBalance: item.allowNegativeBalance ?? false,
        allowOverAllocating: item.allowOverAllocating ?? false,
        includeHolidaysAsLeaves: item.includeHolidaysAsLeaves ?? false,
        isCompensatory: item.isCompensatory ?? false,
      }));
    }
  } catch {}
  return initialData;
}

export default function LeaveType() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState<LeaveTypeItem[]>(loadTypes);
  const [deleteTarget, setDeleteTarget] = useState<LeaveTypeItem | null>(null);

  useEffect(() => { localStorage.setItem('leaveTypes', JSON.stringify(types)); }, [types]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, searchDebounced]);

  const filtered = useMemo(() => {
    let data = [...types];
    const q = searchDebounced.toLowerCase().trim();
    if (q) {
      data = data.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') data = data.filter((r) => r.status === statusFilter);

    data.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'daysPerYear') cmp = a.daysPerYear - b.daysPerYear;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [types, searchDebounced, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || statusFilter !== 'all';

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  function handleDelete(item: LeaveTypeItem) {
    setDeleteTarget(item);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function statusBadge(status: string) {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize';
    if (status === 'active') return <span className={`${base} bg-emerald-50 text-emerald-600`}>Active</span>;
    return <span className={`${base} bg-rose-50 text-rose-600`}>Inactive</span>;
  }

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave Types</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Manage leave categories</p>
        </div>
        <button onClick={() => navigate('/hrms/leave/type/new')} className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <Plus size={14} />Add Leave Type
        </button>
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
            placeholder="Search leave types..."
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
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      {/* Data Table */}
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
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No leave types found</h3>
            <p className="text-xs text-zinc-400 max-w-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    {[
                      { key: 'name' as SortKey, label: 'Leave Type' },
                      { key: 'daysPerYear' as SortKey, label: 'Days / Year' },
                      { key: null, label: 'Carry Forward' },
                      { key: null, label: 'Description' },
                      { key: null, label: 'Status' },
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
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">
                          <button onClick={() => navigate(`/hrms/leave/type/${r.id}`)}
                            className="hover:text-blue-600 transition-colors cursor-pointer">
                            {r.name}
                          </button>
                        </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700">
                          {r.daysPerYear}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.carryForward ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">{r.description}</td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/hrms/leave/type/edit/${r.id}`)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
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
                      <p className="text-xs font-bold text-zinc-900">
                        <button onClick={() => navigate(`/hrms/leave/type/${r.id}`)}
                          className="hover:text-blue-600 transition-colors cursor-pointer">
                          {r.name}
                        </button>
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{r.description}</p>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>{r.daysPerYear} days/yr</span>
                    <span>·</span>
                    <span>Carry forward: {r.carryForward ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <button onClick={() => navigate(`/hrms/leave/type/edit/${r.id}`)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
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
                <span className="font-bold text-zinc-900">{filtered.length}</span> types
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 relative">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-zinc-900">Delete leave type?</h3>
              <p className="text-sm text-zinc-600 mt-2">
                <span className="font-semibold text-zinc-800">{deleteTarget.name}</span>
              </p>
              <p className="text-xs text-red-600 font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-zinc-50/80">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
