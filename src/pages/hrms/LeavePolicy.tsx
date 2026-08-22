import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, FileText, CheckCircle, XCircle, Inbox, Info, ChevronRight,
  Calendar, ArrowRightLeft, Users, Trash2, Search, ChevronLeft,
  ArrowUpDown, ChevronUp, ChevronDown, Loader2, Eye, Pencil, AlertTriangle, X,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import {
  listLeavePolicies,
  listLeavePolicyAssignments,
  deleteLeavePolicyAssignment,
  deleteLeavePolicy,
  updateLeavePolicyAssignment,
  listLeaveAllocations,
  deleteLeaveAllocation,
} from '../../lib/hrmsLeave';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

type PolicySortKey = 'name' | 'effectiveDate' | 'entitlements';
type AssignmentSortKey = 'employeeName' | 'policyName' | 'assignedAt' | 'status';

interface SavedPolicy {
  id: number;
  name: string;
  description: string;
  effectiveDate: string;
  max_paid_leaves?: number;
  max_unpaid_leaves?: number;
  status: 'active' | 'inactive';
  entitlements: { leaveTypeName: string }[];
  assignedCount: number;
}

interface Assignment {
  id: number;
  policyName: string;
  employeeName: string;
  assignedAt: string;
  status?: string;
  entitlements: { leaveTypeName: string; days?: number }[];
}

interface AllocationRecord {
  id: number;
  employeeName: string;
  leaveType: string;
  policyName: string;
  totalDays: number;
  carryForwardDays: number;
  effectiveDate: string;
  notes: string;
  allocatedAt: string;
}

const generalRules = [
  { label: 'Monthly Paid Cap', value: 'Max 2 paid leave days / month' },
  { label: 'Planned Leave Notice', value: 'Prior notice before leave date' },
  { label: 'Max Consecutive Days', value: 'As per entitlement' },
  { label: 'Emergency Exception', value: 'Waives 2-day monthly limit on approval' },
  { label: 'Probation Leave', value: 'Medical Leave allowed' },
  { label: 'Leave Encashment', value: 'As per policy' },
];

const approvalSteps = [
  { step: 1, title: 'Employee Applies', desc: 'Submit leave request with reason and dates' },
  { step: 2, title: 'Manager Reviews', desc: 'Approve or reject with comments' },
  { step: 3, title: 'HR Approval', desc: 'Final approval for extended or special leaves' },
  { step: 4, title: 'Record Updated', desc: 'Leave balance and attendance auto-updated' },
];

const carryForwardRules = [
  { type: 'Medical Leave', limit: 'As per policy', expiry: 'Year End' },
  { type: 'Privilege Leave', limit: 'As per policy', expiry: 'Year End' },
  { type: 'Casual Leave', limit: 'As per policy', expiry: 'Year End' },
  { type: 'Leave Without Pay', value: 'Not applicable', expiry: '-' },
];

export default function LeavePolicy() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();
  const [policies, setPolicies] = useState<SavedPolicy[]>([]);
  
  const tabFromUrl = (searchParams.get('tab') as 'assignments' | 'policies' | 'allocations') || 'assignments';
  const [viewMode, setViewModeState] = useState<'assignments' | 'policies' | 'allocations'>(
    ['assignments', 'policies', 'allocations'].includes(tabFromUrl) ? tabFromUrl : 'assignments'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as 'assignments' | 'policies' | 'allocations';
    if (t && ['assignments', 'policies', 'allocations'].includes(t)) {
      setViewModeState(t);
    }
  }, [searchParams]);

  const setViewMode = (mode: 'assignments' | 'policies' | 'allocations') => {
    setViewModeState(mode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', mode);
      return next;
    });
  };
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [allocSearch, setAllocSearch] = useState('');

  // Modals state
  const [policyToDelete, setPolicyToDelete] = useState<SavedPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editAssignPolicyId, setEditAssignPolicyId] = useState('');
  const [editAssignStartDate, setEditAssignStartDate] = useState('');
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);

  const [allocToDelete, setAllocToDelete] = useState<AllocationRecord | null>(null);
  const [deletingAlloc, setDeletingAlloc] = useState(false);

  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const reloadData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [pData, aData, allocData] = await Promise.all([
        listLeavePolicies(token),
        listLeavePolicyAssignments(token),
        listLeaveAllocations(token),
      ]);
      setPolicies(
        pData.map((p) => {
          return {
            id: p.id,
            name: p.name,
            description: p.description || '',
            effectiveDate: p.effective_date,
            max_paid_leaves: p.max_paid_leaves,
            max_unpaid_leaves: p.max_unpaid_leaves,
            status: p.status,
            entitlements: (p.entitlements || []).map((e) => ({ leaveTypeName: e.leave_type_name || `Type ${e.leave_type_id}` })),
            assignedCount: aData.filter((a) => a.policy_id === p.id).length,
          };
        })
      );
      setAssignments(
        aData.map((a) => ({
          id: a.id,
          policyName: a.policy_name || 'Policy #' + a.policy_id,
          employeeName: a.employee_name || a.employee_email || 'Employee #' + a.user_id,
          assignedAt: a.start_date,
          status: a.status || 'active',
          entitlements: (a.entitlements || []).map((e) => ({
            leaveTypeName: e.leave_type_name || `Type #${e.leave_type_id}`,
            days: e.days,
          })),
        }))
      );
      setAllocations(
        allocData.map((a) => ({
          id: a.id,
          employeeName: a.employee_name || a.employee_email || `User #${a.user_id}`,
          leaveType: a.leave_type_name || `Type #${a.leave_type_id}`,
          policyName: a.policy_name || 'Manual',
          totalDays: a.total_days,
          carryForwardDays: a.carry_forward_days || 0,
          effectiveDate: a.effective_date,
          notes: a.notes || '',
          allocatedAt: a.created_at ? a.created_at.split('T')[0] : a.effective_date,
        }))
      );
    } catch (e) {
      console.error('Error loading leave policies:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reloadData(); }, [reloadData]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setAssignSearchDebounced(assignSearch), 300);
    return () => clearTimeout(t);
  }, [assignSearch]);

  const removePolicy = (id: number, name: string) => {
    const target = policies.find((p) => p.id === id);
    if (target) setPolicyToDelete(target);
  };

  const handleConfirmDeletePolicy = async () => {
    if (!policyToDelete || !token) return;
    setDeletingPolicy(true);
    try {
      await deleteLeavePolicy(token, policyToDelete.id);
      showToast('Policy deleted successfully');
      setPolicyToDelete(null);
      await reloadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete policy');
    } finally {
      setDeletingPolicy(false);
    }
  };

  const handleOpenEditAssignment = (a: Assignment) => {
    setEditingAssignment(a);
    setEditAssignStartDate(a.assignedAt || '');
    const matched = policies.find((p) => p.name === a.policyName);
    setEditAssignPolicyId(matched ? String(matched.id) : '');
  };

  const handleSaveEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editAssignPolicyId || !token) return;
    setUpdatingAssignment(true);
    try {
      await updateLeavePolicyAssignment(token, editingAssignment.id, {
        policy_id: Number(editAssignPolicyId),
        start_date: editAssignStartDate || new Date().toISOString().split('T')[0],
      });
      showToast('Policy assignment updated');
      setEditingAssignment(null);
      await reloadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update assignment');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!assignmentToDelete || !token) return;
    setDeletingAssignment(true);
    try {
      await deleteLeavePolicyAssignment(token, assignmentToDelete.id);
      showToast('Assignment removed');
      setAssignmentToDelete(null);
      await reloadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to remove assignment');
    } finally {
      setDeletingAssignment(false);
    }
  };

  const handleConfirmDeleteAllocation = async () => {
    if (!allocToDelete || !token) return;
    setDeletingAlloc(true);
    try {
      await deleteLeaveAllocation(token, allocToDelete.id);
      showToast('Leave allocation removed');
      setAllocToDelete(null);
      await reloadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete allocation');
    } finally {
      setDeletingAlloc(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...policies];
    if (searchDebounced.trim()) {
      const q = searchDebounced.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    result.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];
      if (sortBy === 'entitlements') {
        aVal = a.entitlements.length;
        bVal = b.entitlements.length;
      }
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [policies, searchDebounced, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const toggleSort = (key: PolicySortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  function SortIcon({ col }: { col: PolicySortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  const filteredAssignments = useMemo(() => {
    let result = [...assignments];
    if (assignSearchDebounced.trim()) {
      const q = assignSearchDebounced.toLowerCase();
      result = result.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(q) ||
          a.policyName.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[assignSortBy] || '';
      const bVal = b[assignSortBy] || '';
      return assignSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return result;
  }, [assignments, assignSearchDebounced, assignSortBy, assignSortOrder]);

  const assignTotalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE) || 1;
  const pagedAssignments = useMemo(() => {
    const start = (assignPage - 1) * PAGE_SIZE;
    return filteredAssignments.slice(start, start + PAGE_SIZE);
  }, [filteredAssignments, assignPage]);

  const toggleAssignSort = (key: AssignmentSortKey) => {
    if (assignSortBy === key) {
      setAssignSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAssignSortBy(key);
      setAssignSortOrder('asc');
    }
  };

  function AssignSortIcon({ col }: { col: AssignmentSortKey }) {
    if (assignSortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return assignSortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  const filteredAllocations = useMemo(() => {
    let result = [...allocations];
    if (allocSearch.trim()) {
      const q = allocSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(q) ||
          a.leaveType.toLowerCase().includes(q) ||
          a.policyName.toLowerCase().includes(q) ||
          a.notes.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allocations, allocSearch]);

  const hasFilters = search || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave Policy</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage leave entitlements, assigned employee policies, and leave allocations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/hrms/leave/allocation')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus size={15} /> Allocate Leaves
          </button>
          <button
            onClick={() => navigate('/hrms/leave/policy/assign')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Users size={15} /> Bulk Assign Policy
          </button>
          <button
            onClick={() => navigate('/hrms/leave/policy/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} /> New Leave Policy
          </button>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Policies', value: policies.filter((p) => p.status === 'active').length, icon: FileText, color: 'bg-zinc-900 text-white' },
          { label: 'Assigned Employees', value: assignments.length, icon: Users, color: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
          { label: 'Allocated Records', value: allocations.length, icon: CheckCircle, color: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
          { label: 'Paid Leave Cap', value: '2 Days / Month', icon: Calendar, color: 'bg-amber-50 text-amber-700 border border-amber-100' },
        ].map((card, i) => (
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
          onClick={() => setViewMode('assignments')}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            viewMode === 'assignments'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Assigned Policies ({assignments.length})
        </button>
        <button
          onClick={() => setViewMode('policies')}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            viewMode === 'policies'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Leave Policy Templates ({policies.length})
        </button>
        <button
          onClick={() => setViewMode('allocations')}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            viewMode === 'allocations'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Leave Allocations ({allocations.length})
        </button>
      </div>

      {/* SECTION 1: POLICIES SECTION */}
      {viewMode === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-zinc-900 tracking-tight">Leave Policies ({policies.length})</h2>
          </div>
          {/* Filter Bar - Policies */}
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
                placeholder="Search policy name or description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
            </div>
            <div className="w-[140px]">
              <SearchableSelect
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(val) => { setStatusFilter(val); setPage(1); }}
                placeholder="Filter status"
                className="w-full"
              />
            </div>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <XCircle size={12} />Clear
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
          >
            {filtered.length === 0 ? (
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
                          { key: null, label: 'Assigned Employees' },
                          { key: 'effectiveDate' as PolicySortKey, label: 'Effective Date' },
                          { key: null, label: 'Max Paid / Unpaid (Monthly)' },
                          { key: null, label: 'Status' },
                          { key: 'entitlements' as PolicySortKey, label: 'Entitlements & Actions' },
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
                          <td className="px-4 py-3 text-xs" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setAssignSearch(p.name);
                                setViewMode('assignments');
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="Click to view assigned employees for this policy"
                            >
                              <Users size={12} />
                              {p.assignedCount} {p.assignedCount === 1 ? 'Employee' : 'Employees'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{p.effectiveDate || '—'}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <span className="font-semibold text-emerald-700">{p.max_paid_leaves ? `${p.max_paid_leaves} Paid/mo` : 'Unlimited Paid'}</span>
                            <span className="text-zinc-300 mx-1">·</span>
                            <span className="font-semibold text-zinc-600">{p.max_unpaid_leaves ? `${p.max_unpaid_leaves} Unpaid/mo` : 'Unlimited Unpaid'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                              {p.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700 mr-1" title={`${p.entitlements.length} entitlement(s)`}>
                                {p.entitlements.length}
                              </span>
                              <button
                                onClick={() => navigate(`/hrms/leave/policy/${p.id}`)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                                title="View Policy Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => navigate(`/hrms/leave/policy/edit/${p.id}`)}
                                className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Policy"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => removePolicy(p.id, p.name)}
                                className="p-1.5 text-rose-600 bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Policy"
                              >
                                <Trash2 size={15} />
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
                  {paged.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 space-y-2 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                      onClick={() => navigate(`/hrms/leave/policy/${p.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900">{p.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2">{p.description || 'No description'}</p>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                        <span>Assigned: {p.assignedCount} Employees</span>
                        <span>Effective: {p.effectiveDate || 'N/A'}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/30">
                    <span>
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} policies
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-bold text-zinc-700 px-2">{page} / {totalPages}</span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* SECTION 2: ASSIGNED POLICIES SECTION */}
      {viewMode === 'assignments' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-zinc-900 tracking-tight">Assigned Employee Policies ({assignments.length})</h2>
          </div>
          {/* Filter Bar - Assignments */}
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
                placeholder="Search employee or policy..."
                value={assignSearch}
                onChange={(e) => { setAssignSearch(e.target.value); setAssignPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
            </div>
            {assignSearch && (
              <button
                onClick={() => setAssignSearch('')}
                className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <XCircle size={12} />Clear
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
          >
            {filteredAssignments.length === 0 ? (
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
                          { key: null, label: 'Allocated Leave' },
                          { key: 'assignedAt' as AssignmentSortKey, label: 'Assigned Date' },
                          { key: 'status' as AssignmentSortKey, label: 'Status' },
                          { key: null, label: 'Actions' },
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
                          <td className="px-4 py-3 text-xs">
                            {a.entitlements && a.entitlements.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {a.entitlements.map((ent, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  >
                                    {ent.leaveTypeName} {ent.days ? `(${ent.days}d)` : ''}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                2 Paid / 3 LWP Monthly
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{a.assignedAt}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {a.status === 'active' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">Discontinued</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/hrms/leave/policy/assign/${a.id}`)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                                title="View Assignment Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEditAssignment(a)}
                                className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Assignment Policy"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setAssignmentToDelete(a)}
                                className="p-1.5 text-rose-600 bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove Assignment"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {assignTotalPages > 1 && (
                  <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/30">
                    <span>
                      Showing {(assignPage - 1) * PAGE_SIZE + 1}–{Math.min(assignPage * PAGE_SIZE, filteredAssignments.length)} of {filteredAssignments.length} assignments
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAssignPage((p) => Math.max(1, p - 1))}
                        disabled={assignPage === 1}
                        className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-bold text-zinc-700 px-2">{assignPage} / {assignTotalPages}</span>
                      <button
                        onClick={() => setAssignPage((p) => Math.min(assignTotalPages, p + 1))}
                        disabled={assignPage === assignTotalPages}
                        className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* SECTION 3: ALLOCATIONS SECTION */}
      {viewMode === 'allocations' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 tracking-tight">Employee Leave Allocations ({allocations.length})</h2>
              <p className="text-xs text-zinc-500">Individual leave type allocations awarded to employees</p>
            </div>
            <button
              onClick={() => navigate('/hrms/leave/allocation')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} /> New Leave Allocation
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Search by employee, leave type, policy..."
                value={allocSearch}
                onChange={(e) => setAllocSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
          >
            {filteredAllocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                  <Inbox size={24} className="text-zinc-300" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">{allocations.length === 0 ? 'No leave allocations created yet' : 'No matching allocations'}</h3>
                <p className="text-xs text-zinc-400 max-w-xs">{allocations.length === 0 ? 'Click "New Leave Allocation" above to allocate leaves to employees.' : 'Try adjusting your search query.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Employee</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Allocated Leave Type</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Policy</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Days</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Carry Forward</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Effective Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Notes</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filteredAllocations.map((a, i) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-zinc-900">{a.employeeName}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {a.leaveType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{a.policyName}</td>
                        <td className="px-4 py-3 text-xs font-extrabold text-zinc-900">{a.totalDays} Days</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{a.carryForwardDays} Days</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{a.effectiveDate}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400 truncate max-w-[150px]">{a.notes || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setAllocToDelete(a)}
                            className="p-1.5 text-rose-600 bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Allocation Record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Delete Policy Confirmation Modal */}
      <AnimatePresence>
        {policyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-100 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Delete Leave Policy</h3>
                  <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600">
                Are you sure you want to delete policy <span className="font-bold text-zinc-900">"{policyToDelete.name}"</span>?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setPolicyToDelete(null)}
                  disabled={deletingPolicy}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeletePolicy}
                  disabled={deletingPolicy}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {deletingPolicy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>{deletingPolicy ? 'Deleting...' : 'Delete Policy'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Assignment Modal */}
      <AnimatePresence>
        {editingAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Edit Policy Assignment</h3>
                  <p className="text-xs text-zinc-400">Employee: <span className="font-bold text-zinc-700">{editingAssignment.employeeName}</span></p>
                </div>
                <button onClick={() => setEditingAssignment(null)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditAssignment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Select Leave Policy</label>
                  <SearchableSelect
                    options={policies.map((p) => ({ value: String(p.id), label: p.name }))}
                    value={editAssignPolicyId}
                    onChange={setEditAssignPolicyId}
                    placeholder="Choose policy..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Effective Start Date</label>
                  <input
                    type="date"
                    value={editAssignStartDate}
                    onChange={(e) => setEditAssignStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    disabled={updatingAssignment}
                    className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingAssignment || !editAssignPolicyId}
                    className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {updatingAssignment ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{updatingAssignment ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Assignment Confirmation Modal */}
      <AnimatePresence>
        {assignmentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-100 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Remove Policy Assignment</h3>
                  <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600">
                Are you sure you want to remove policy <span className="font-bold text-zinc-900">"{assignmentToDelete.policyName}"</span> assignment for <span className="font-bold text-zinc-900">"{assignmentToDelete.employeeName}"</span>?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setAssignmentToDelete(null)}
                  disabled={deletingAssignment}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteAssignment}
                  disabled={deletingAssignment}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {deletingAssignment ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>{deletingAssignment ? 'Removing...' : 'Remove Assignment'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Allocation Confirmation Modal */}
      <AnimatePresence>
        {allocToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-100 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Remove Leave Allocation</h3>
                  <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600">
                Are you sure you want to remove <span className="font-bold text-zinc-900">"{allocToDelete.leaveType}"</span> allocation for <span className="font-bold text-zinc-900">"{allocToDelete.employeeName}"</span>?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setAllocToDelete(null)}
                  disabled={deletingAlloc}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteAllocation}
                  disabled={deletingAlloc}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {deletingAlloc ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>{deletingAlloc ? 'Removing...' : 'Remove Allocation'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
