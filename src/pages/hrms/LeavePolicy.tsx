import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plus, FileText, CheckCircle, XCircle, Inbox, Info, ChevronRight,
  Calendar, ArrowRightLeft, Users, Trash2, Search, ChevronLeft,
  ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

type PolicySortKey = 'name' | 'effectiveDate' | 'entitlements';
type AssignmentSortKey = 'employeeName' | 'policyName' | 'assignedAt';

interface SavedPolicy {
  id: number;
  name: string;
  description: string;
  effectiveDate: string;
  status: 'active' | 'inactive';
  entitlements: { leaveTypeName: string }[];
}

function loadPolicies(): SavedPolicy[] {
  try {
    const stored = localStorage.getItem('leavePolicies');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

interface Assignment {
  id: number;
  policyName: string;
  employeeName: string;
  assignedAt: string;
}

function loadAssignments(): Assignment[] {
  try {
    const stored = localStorage.getItem('leavePolicyAssignments');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

const generalRules = [
  { label: 'Casual Leave Notice', value: '1 day prior' },
  { label: 'Planned Leave Notice', value: '7 days prior' },
  { label: 'Max Consecutive Days', value: '3 days without approval' },
  { label: 'Half-Day Policy', value: 'Available for Sick & Casual' },
  { label: 'Probation Leave', value: 'Only Sick Leave allowed' },
  { label: 'Leave Encashment', value: 'Not applicable' },
];

const approvalSteps = [
  { step: 1, title: 'Employee Applies', desc: 'Submit leave request with reason and dates' },
  { step: 2, title: 'Manager Reviews', desc: 'Approve or reject with comments' },
  { step: 3, title: 'HR Approval', desc: 'Final approval for extended or special leaves' },
  { step: 4, title: 'Record Updated', desc: 'Leave balance and attendance auto-updated' },
];

const carryForwardRules = [
  { type: 'Sick Leave', limit: '5 days', expiry: 'June 30' },
  { type: 'Earned Leave', limit: '10 days', expiry: 'June 30' },
  { type: 'Casual Leave', value: 'Not applicable', expiry: '-' },
  { type: 'Maternity Leave', value: 'Not applicable', expiry: '-' },
];

export default function LeavePolicy() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<SavedPolicy[]>([]);
  const [viewMode, setViewMode] = useState<'policies' | 'assignments'>('policies');
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<PolicySortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const [assignSearch, setAssignSearch] = useState('');
  const [assignSearchDebounced, setAssignSearchDebounced] = useState('');
  const [assignSortBy, setAssignSortBy] = useState<AssignmentSortKey>('employeeName');
  const [assignSortOrder, setAssignSortOrder] = useState<'asc' | 'desc'>('asc');
  const [assignPage, setAssignPage] = useState(1);

  useEffect(() => {
    setPolicies(loadPolicies());
    setAssignments(loadAssignments());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, searchDebounced]);

  useEffect(() => {
    const t = setTimeout(() => setAssignSearchDebounced(assignSearch), 300);
    return () => clearTimeout(t);
  }, [assignSearch]);

  useEffect(() => { setAssignPage(1); }, [assignSearchDebounced]);

  const filtered = useMemo(() => {
    let data = [...policies];
    const q = searchDebounced.toLowerCase().trim();
    if (q) {
      data = data.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') data = data.filter((r) => r.status === statusFilter);
    data.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'effectiveDate') cmp = (a.effectiveDate || '').localeCompare(b.effectiveDate || '');
      else if (sortBy === 'entitlements') cmp = a.entitlements.length - b.entitlements.length;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [policies, searchDebounced, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredAssignments = useMemo(() => {
    let data = [...assignments];
    const q = assignSearchDebounced.toLowerCase().trim();
    if (q) {
      data = data.filter((r) => r.employeeName.toLowerCase().includes(q) || r.policyName.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      let cmp = 0;
      if (assignSortBy === 'employeeName') cmp = a.employeeName.localeCompare(b.employeeName);
      else if (assignSortBy === 'policyName') cmp = a.policyName.localeCompare(b.policyName);
      else if (assignSortBy === 'assignedAt') cmp = a.assignedAt.localeCompare(b.assignedAt);
      return assignSortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [assignments, assignSearchDebounced, assignSortBy, assignSortOrder]);

  const assignTotalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const assignStartRow = (assignPage - 1) * PAGE_SIZE + 1;
  const assignEndRow = Math.min(assignPage * PAGE_SIZE, filteredAssignments.length);
  const pagedAssignments = filteredAssignments.slice((assignPage - 1) * PAGE_SIZE, assignPage * PAGE_SIZE);

  const hasFilters = search || statusFilter !== 'all';
  const hasAssignFilters = assignSearch;

  function toggleSort(key: PolicySortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  function SortIcon({ col }: { col: PolicySortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  function toggleAssignSort(key: AssignmentSortKey) {
    if (assignSortBy === key) setAssignSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setAssignSortBy(key); setAssignSortOrder('asc'); }
  }

  function AssignSortIcon({ col }: { col: AssignmentSortKey }) {
    if (assignSortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return assignSortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  const activeCount = policies.filter((p) => p.status === 'active').length;
  const inactiveCount = policies.filter((p) => p.status === 'inactive').length;
  const totalEntitlements = policies.reduce((s, p) => s + p.entitlements.length, 0);

  const removeAssignment = (id: number) => {
    const list = assignments.filter((a) => a.id !== id);
    setAssignments(list);
    localStorage.setItem('leavePolicyAssignments', JSON.stringify(list));
  };

  const statCards = [
    { label: 'Total Policies', value: policies.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active', value: activeCount, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Inactive', value: inactiveCount, icon: XCircle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Entitlements', value: totalEntitlements, icon: FileText, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave Policies</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Manage company leave guidelines and entitlements</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/hrms/leave/allocation')} className="flex items-center gap-2 bg-white border border-zinc-300 text-zinc-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
            <Calendar size={14} />Leave Allocation
          </button>
          <button onClick={() => navigate('/hrms/leave/policy/assign')} className="flex items-center gap-2 bg-white border border-zinc-300 text-zinc-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
            <Users size={14} />Assign Leave Policy
          </button>
          <button onClick={() => navigate('/hrms/leave/policy/new')} className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <Plus size={14} />Create New Policy
          </button>
        </div>
      </motion.header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <p className="text-lg font-extrabold text-zinc-900 leading-none">{card.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
        <button
          onClick={() => setViewMode('policies')}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            viewMode === 'policies'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          All Policies
        </button>
        <button
          onClick={() => setViewMode('assignments')}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            viewMode === 'assignments'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Assigned Policies
        </button>
      </div>

      {/* Filter Bar - Policies */}
      {viewMode === 'policies' && (
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
              placeholder="Search policies..."
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
      )}

      {/* Filter Bar - Assignments */}
      {viewMode === 'assignments' && (
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
              placeholder="Search assignments..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
            />
          </div>
          {hasAssignFilters && (
            <button
              onClick={() => setAssignSearch('')}
              className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
            >
              <XCircle size={12} />Clear
            </button>
          )}
        </motion.div>
      )}

      {/* Policy List / Assigned Policies */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >

        {viewMode === 'policies' ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                <Inbox size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{policies.length === 0 ? 'No policies yet' : 'No policies found'}</h3>
              <p className="text-xs text-zinc-400 max-w-xs">{policies.length === 0 ? 'Create your first leave policy to get started.' : 'Try adjusting your search or filters'}</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      {[
                        { key: 'name' as PolicySortKey, label: 'Policy Name' },
                        { key: null, label: 'Description' },
                        { key: 'effectiveDate' as PolicySortKey, label: 'Effective Date' },
                        { key: null, label: 'Status' },
                        { key: 'entitlements' as PolicySortKey, label: 'Entitlements' },
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
                    {paged.map((p, i) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/hrms/leave/policy/${p.id}`)}
                      >
                        <td className="px-4 py-3 text-xs font-bold text-zinc-900">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">{p.description || '—'}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{p.effectiveDate || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                            {p.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700">
                            {p.entitlements.length}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-zinc-100">
                {paged.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 space-y-2 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                    onClick={() => navigate(`/hrms/leave/policy/${p.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{p.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{p.description || 'No description'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span>Effective: {p.effectiveDate || '—'}</span>
                      <span>·</span>
                      <span>{p.entitlements.length} entitlement{p.entitlements.length !== 1 ? 's' : ''}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{startRow}</span>–
                  <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
                  <span className="font-bold text-zinc-900">{filtered.length}</span> policies
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
          )
        ) : (
          filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                <Inbox size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{assignments.length === 0 ? 'No assignments yet' : 'No assignments found'}</h3>
              <p className="text-xs text-zinc-400 max-w-xs">{assignments.length === 0 ? 'Assign a leave policy to an employee first.' : 'Try adjusting your search'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      {[
                        { key: 'employeeName' as AssignmentSortKey, label: 'Employee' },
                        { key: 'policyName' as AssignmentSortKey, label: 'Policy' },
                        { key: 'assignedAt' as AssignmentSortKey, label: 'Assigned Date' },
                        { key: null, label: '' },
                      ].map((col) => (
                        <th
                          key={col.label || '__actions'}
                          onClick={col.key ? () => toggleAssignSort(col.key) : undefined}
                          className={`px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-zinc-600 select-none' : ''}`}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {col.key && <AssignSortIcon col={col.key} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {pagedAssignments.map((a, i) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-zinc-900 cursor-pointer hover:text-zinc-700"
                            onClick={() => navigate(`/hrms/leave/policy/assign/${a.id}`)}>{a.employeeName}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{a.policyName}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{a.assignedAt}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeAssignment(a.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{assignStartRow}</span>–
                  <span className="font-bold text-zinc-900">{assignEndRow}</span> of{' '}
                  <span className="font-bold text-zinc-900">{filteredAssignments.length}</span> assignments
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssignPage((p) => Math.max(1, p - 1))}
                    disabled={assignPage <= 1}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} className="text-zinc-600" />
                  </button>
                  <button
                    onClick={() => setAssignPage((p) => Math.min(assignTotalPages, p + 1))}
                    disabled={assignPage >= assignTotalPages}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} className="text-zinc-600" />
                  </button>
                </div>
              </div>
            </>
          )
        )}
      </motion.div>

      {/* General Rules + Approval Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
            <Info size={16} className="text-zinc-500" />
            <h2 className="font-bold text-zinc-900 text-sm">General Rules</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {generalRules.map((rule) => (
              <div key={rule.label} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                <span className="text-xs text-zinc-500">{rule.label}</span>
                <span className="text-xs font-bold text-zinc-900">{rule.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
            <ChevronRight size={16} className="text-zinc-500" />
            <h2 className="font-bold text-zinc-900 text-sm">Approval Workflow</h2>
          </div>
          <div className="p-4 space-y-3">
            {approvalSteps.map((step) => (
              <div key={step.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {step.step}
                </div>
                <div className="pt-0.5">
                  <p className="text-xs font-bold text-zinc-900">{step.title}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Carry Forward Rules + Important Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-zinc-500" />
            <h2 className="font-bold text-zinc-900 text-sm">Carry Forward Rules</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {carryForwardRules.map((rule) => (
              <div key={rule.type} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                <span className="text-xs font-medium text-zinc-700">{rule.type}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400">Expiry: {rule.expiry}</span>
                  <span className="text-xs font-bold text-zinc-900">{rule.limit || rule.value}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
            <Calendar size={16} className="text-zinc-500" />
            <h2 className="font-bold text-zinc-900 text-sm">Important Dates</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            <div className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
              <span className="text-xs text-zinc-500">Financial Year</span>
              <span className="text-xs font-bold text-zinc-900">April 1 – March 31</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
              <span className="text-xs text-zinc-500">Leave Reset Date</span>
              <span className="text-xs font-bold text-zinc-900">April 1 each year</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
              <span className="text-xs text-zinc-500">Carry Forward Expiry</span>
              <span className="text-xs font-bold text-zinc-900">June 30 each year</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
              <span className="text-xs text-zinc-500">Settlement Deadline</span>
              <span className="text-xs font-bold text-zinc-900">March 31 each year</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
