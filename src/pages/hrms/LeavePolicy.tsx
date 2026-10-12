import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, FileText, CheckCircle, XCircle, Inbox, Info, ChevronRight,
  Calendar, ArrowRightLeft, Users, Trash2, Search, ChevronLeft,
  ArrowUpDown, ChevronUp, ChevronDown, Loader2, Eye, Pencil, AlertTriangle, X, MoreHorizontal } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  maxPaidLeaves?: number;
  maxUnpaidLeaves?: number;
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
  { label: 'Paid Leave Types', value: 'PL / ML count fully as paid' },
  { label: 'LWP', value: 'Only when Leave Without Pay type is selected' },
  { label: 'Planned Leave Notice', value: 'Prior notice before leave date' },
  { label: 'Max Consecutive Days', value: 'As per entitlement' },
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
        aData.map((a) => {
          const pol = pData.find((p) => p.id === a.policy_id);
          return {
            id: a.id,
            policyName: a.policy_name || 'Policy #' + a.policy_id,
            employeeName: a.employee_name || a.employee_email || 'Employee #' + a.user_id,
            assignedAt: a.start_date,
            status: a.status || 'active',
            maxPaidLeaves: pol?.max_paid_leaves,
            maxUnpaidLeaves: pol?.max_unpaid_leaves,
            entitlements: (a.entitlements || []).map((e) => ({
              leaveTypeName: e.leave_type_name || `Type #${e.leave_type_id}`,
              days: e.days,
            })),
          };
        })
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
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
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
    if (assignSortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return assignSortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
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
      <PageHeader title="Leave Policy" description="Manage leave entitlements, assigned employee policies, and leave allocations" actions={<>
<div className="flex items-center gap-2">
          <Button variant="soft" size="sm" className="cursor-pointer bg-accent text-accent-foreground border-primary/20 hover:bg-primary/15"
            onClick={() => navigate('/hrms/leave/allocation')}
            
          >
            <Plus size={15} /> Allocate Leaves
          </Button>
          <Button variant="secondary" size="sm" className="cursor-pointer"
            onClick={() => navigate('/hrms/leave/policy/assign')}
            
          >
            <Users size={15} /> Bulk Assign Policy
          </Button>
          <Button variant="dark" size="sm" className="cursor-pointer"
            onClick={() => navigate('/hrms/leave/policy/new')}
            
          >
            <Plus size={16} /> New Leave Policy
          </Button>
        </div>
</>} />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Policies', value: policies.filter((p) => p.status === 'active').length, icon: FileText, color: 'bg-foreground text-white' },
          { label: 'Assigned Employees', value: assignments.length, icon: Users, color: 'bg-accent text-accent-foreground border border-primary/20' },
          { label: 'Allocated Records', value: allocations.length, icon: CheckCircle, color: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
          {
            label: 'Paid Leave Cap',
            value: (() => {
              const p = policies.find((x) => x.status === 'active') ?? policies[0];
              return p?.max_paid_leaves ? `${p.max_paid_leaves} Days / Month` : 'From policy';
            })(),
            icon: Calendar,
            color: 'bg-warning/10 text-warning border border-warning/25',
          },
        ].map((card, i) => (
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
              <p className="text-lg font-semibold text-foreground leading-none">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Segmented value={String(viewMode)} onValueChange={(v) => { ({ ['assignments']: (() => setViewMode('assignments')), ['policies']: (() => setViewMode('policies')), ['allocations']: (() => setViewMode('allocations')) } as Record<string, () => void>)[v]?.(); }} options={[
  { value: 'assignments', label: <>Assigned Policies ({assignments.length})</> },
  { value: 'policies', label: <>Leave Policy Templates ({policies.length})</> },
  { value: 'allocations', label: <>Leave Allocations ({allocations.length})</> }
]} />

      {/* SECTION 1: POLICIES SECTION */}
      {viewMode === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Leave Policies ({policies.length})</h2>
          </div>
          {/* Filter Bar - Policies */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
              <Input data-search="" className="w-full pl-9 pr-3"
                type="text"
                placeholder="Search policy name or description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                
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
                className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors cursor-pointer"
              >
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
            {filtered.length === 0 ? (
              <EmptyState icon={<Inbox />} title={policies.length === 0 ? 'No policies yet' : 'No policies found'} description={policies.length === 0 ? 'Create your first leave policy to get started.' : 'Try adjusting your search or filters'} className="border-0" />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {[
                          { key: 'name' as PolicySortKey, label: 'Policy Name' },
                          { key: null, label: 'Description' },
                          { key: null, label: 'Assigned Employees' },
                          { key: 'effectiveDate' as PolicySortKey, label: 'Effective Date' },
                          { key: null, label: 'Max Paid / Unpaid (Monthly)' },
                          { key: null, label: 'Status' },
                          { key: 'entitlements' as PolicySortKey, label: 'Entitlements & Actions' },
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
                      {paged.map((p, i) => (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                          onClick={() => navigate(`/hrms/leave/policy/${p.id}`)}
                        >
                          <TableCell className="font-semibold text-foreground">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">{p.description || '—'}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button size="xs" className="cursor-pointer bg-indigo-50 hover:bg-indigo-100"
                              onClick={() => {
                                setAssignSearch(p.name);
                                setViewMode('assignments');
                              }}
                              
                              title="Click to view assigned employees for this policy"
                            >
                              <Users size={12} />
                              {p.assignedCount} {p.assignedCount === 1 ? 'Employee' : 'Employees'}
                            </Button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{p.effectiveDate || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="font-semibold text-accent-foreground">{p.max_paid_leaves ? `${p.max_paid_leaves} Paid/mo` : '2 Paid/mo'}</span>
                            <span className="text-muted-foreground/50 mx-1">·</span>
                            <span className="font-semibold text-foreground/70">{p.max_unpaid_leaves ? `${p.max_unpaid_leaves} Unpaid/mo` : '3 Unpaid/mo'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${p.status === 'active' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>
                              {p.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-[11px] font-semibold text-foreground/85 mr-1" title={`${p.entitlements.length} entitlement(s)`}>
                                {p.entitlements.length}
                              </span>
                              <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                                onClick={() => navigate(`/hrms/leave/policy/${p.id}`)}
                                
                                title="View Policy Details"
                              >
                                <Eye size={15} />
                              </Button>
                              <Button variant="ghost" size="icon-sm" className="cursor-pointer hover:text-info hover:bg-info/10"
                                onClick={() => navigate(`/hrms/leave/policy/edit/${p.id}`)}
                                
                                title="Edit Policy"
                              >
                                <Pencil size={15} />
                              </Button>
                              <Button variant="ghost" size="icon-sm" className="cursor-pointer text-destructive bg-destructive/10"
                                onClick={() => removePolicy(p.id, p.name)}
                                
                                title="Delete Policy"
                              >
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-border">
                  {paged.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/hrms/leave/policy/${p.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{p.name}</span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Badge className={`${p.status === 'active' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>
                            {p.status}
                          </Badge>
                          <Button variant="ghost" size="icon-sm" className="hover:text-info"
                            onClick={() => navigate(`/hrms/leave/policy/edit/${p.id}`)}
                            
                            title="Edit Policy"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive"
                            onClick={() => removePolicy(p.id, p.name)}
                            
                            title="Delete Policy"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description || 'No description'}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-1">
                        <span>Assigned: {p.assignedCount} Employees</span>
                        <span>Effective: {p.effectiveDate || 'N/A'}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
                    <span>
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} policies
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="font-semibold text-foreground/85 px-2">{page} / {totalPages}</span>
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        
                      >
                        <ChevronRight size={16} />
                      </Button>
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
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Assigned Employee Policies ({assignments.length})</h2>
          </div>
          {/* Filter Bar - Assignments */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
              <Input data-search="" className="w-full pl-9 pr-3"
                type="text"
                placeholder="Search employee or policy..."
                value={assignSearch}
                onChange={(e) => { setAssignSearch(e.target.value); setAssignPage(1); }}
                
              />
            </div>
            {assignSearch && (
              <button
                onClick={() => setAssignSearch('')}
                className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors cursor-pointer"
              >
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
            {filteredAssignments.length === 0 ? (
              <EmptyState icon={<Inbox />} title={assignments.length === 0 ? 'No assignments yet' : 'No assignments found'} description={assignments.length === 0 ? 'Assign a leave policy to an employee first.' : 'Try adjusting your search'} className="border-0" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {[
                          { key: 'employeeName' as AssignmentSortKey, label: 'Employee' },
                          { key: 'policyName' as AssignmentSortKey, label: 'Policy' },
                          { key: null, label: 'Allocated Leave' },
                          { key: 'assignedAt' as AssignmentSortKey, label: 'Assigned Date' },
                          { key: 'status' as AssignmentSortKey, label: 'Status' },
                          { key: null, label: 'Actions' },
                        ].map((col) => (
                          <TableHead
                            key={col.label || '__actions'}
                            onClick={col.key ? () => toggleAssignSort(col.key) : undefined}
                            className={`uppercase whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-foreground/70 select-none' : ''}`}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              {col.key && <AssignSortIcon col={col.key} />}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedAssignments.map((a, i) => (
                        <motion.tr
                          key={a.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/70"
                        >
                          <TableCell className="font-semibold text-foreground cursor-pointer"
                              onClick={() => navigate(`/hrms/leave/policy/assign/${a.id}`)}>{a.employeeName}</TableCell>
                          <TableCell className="text-muted-foreground">{a.policyName}</TableCell>
                          <TableCell>
                            {a.entitlements && a.entitlements.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {a.entitlements.map((ent, idx) => (
                                  <Badge variant="success"
                                    key={idx}
                                    
                                  >
                                    {ent.leaveTypeName} {ent.days ? `(${ent.days}d)` : ''}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                        <Badge variant="success" >
                          {a.maxPaidLeaves || a.maxUnpaidLeaves
                            ? `${a.maxPaidLeaves || 0} Paid / ${a.maxUnpaidLeaves || 0} LWP Monthly`
                            : 'Policy monthly caps'}
                        </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{a.assignedAt}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {a.status === 'active' ? (
                              <Badge variant="success" >Active</Badge>
                            ) : (
                              <Badge>Discontinued</Badge>
                            )}
                          </TableCell>
                          <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => navigate(`/hrms/leave/policy/assign/${a.id}`)}><Eye /> View Assignment Details</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleOpenEditAssignment(a)}><Pencil /> Edit Assignment Policy</DropdownMenuItem>
                              <DropdownMenuItem destructive onSelect={() => setAssignmentToDelete(a)}><Trash2 /> Remove Assignment</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {assignTotalPages > 1 && (
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
                    <span>
                      Showing {(assignPage - 1) * PAGE_SIZE + 1}–{Math.min(assignPage * PAGE_SIZE, filteredAssignments.length)} of {filteredAssignments.length} assignments
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                        onClick={() => setAssignPage((p) => Math.max(1, p - 1))}
                        disabled={assignPage === 1}
                        
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="font-semibold text-foreground/85 px-2">{assignPage} / {assignTotalPages}</span>
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer"
                        onClick={() => setAssignPage((p) => Math.min(assignTotalPages, p + 1))}
                        disabled={assignPage === assignTotalPages}
                        
                      >
                        <ChevronRight size={16} />
                      </Button>
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
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Employee Leave Allocations ({allocations.length})</h2>
              <p className="text-xs text-muted-foreground">Individual leave type allocations awarded to employees</p>
            </div>
            <Button variant="dark" size="sm" className="cursor-pointer"
              onClick={() => navigate('/hrms/leave/allocation')}
              
            >
              <Plus size={14} /> New Leave Allocation
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
              <Input data-search="" className="w-full pl-9 pr-3"
                type="text"
                placeholder="Search by employee, leave type, policy..."
                value={allocSearch}
                onChange={(e) => setAllocSearch(e.target.value)}
                
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
          >
            {filteredAllocations.length === 0 ? (
              <EmptyState icon={<Inbox />} title={allocations.length === 0 ? 'No leave allocations created yet' : 'No matching allocations'} description={allocations.length === 0 ? 'Click "New Leave Allocation" above to allocate leaves to employees.' : 'Try adjusting your search query.'} className="border-0" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase">Employee</TableHead>
                      <TableHead className="uppercase">Allocated Leave Type</TableHead>
                      <TableHead className="uppercase">Policy</TableHead>
                      <TableHead className="uppercase">Total Days</TableHead>
                      <TableHead className="uppercase">Carry Forward</TableHead>
                      <TableHead className="uppercase">Effective Date</TableHead>
                      <TableHead className="uppercase">Notes</TableHead>
                      <TableHead className="uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllocations.map((a, i) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b transition-colors hover:bg-muted/70"
                      >
                        <TableCell className="font-semibold text-foreground">{a.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="success" >
                            {a.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.policyName}</TableCell>
                        <TableCell className="font-semibold text-foreground">{a.totalDays} Days</TableCell>
                        <TableCell className="text-muted-foreground">{a.carryForwardDays} Days</TableCell>
                        <TableCell className="text-muted-foreground">{a.effectiveDate}</TableCell>
                        <TableCell className="text-muted-foreground/70 truncate max-w-[150px]">{a.notes || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon-sm" className="cursor-pointer text-destructive bg-destructive/10"
                            onClick={() => setAllocToDelete(a)}
                            
                            title="Delete Allocation Record"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Delete Policy Confirmation Modal */}
      <AnimatePresence>
        {policyToDelete && (
          <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-md">
<DialogTitle className="sr-only">Dialog</DialogTitle>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Delete Leave Policy</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-foreground/70">
                Are you sure you want to delete policy <span className="font-semibold text-foreground">"{policyToDelete.name}"</span>?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" className="cursor-pointer"
                  onClick={() => setPolicyToDelete(null)}
                  disabled={deletingPolicy}
                  
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className="cursor-pointer"
                  onClick={handleConfirmDeletePolicy}
                  disabled={deletingPolicy}
                  
                >
                  {deletingPolicy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>{deletingPolicy ? 'Deleting...' : 'Delete Policy'}</span>
                </Button>
              </div>
            </DialogContent>
</Dialog>
        )}
      </AnimatePresence>

      {/* Edit Assignment Modal */}
      <AnimatePresence>
        {editingAssignment && (
          <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-md">
<DialogTitle className="sr-only">Dialog</DialogTitle>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Edit Policy Assignment</h3>
                  <p className="text-xs text-muted-foreground/70">Employee: <span className="font-semibold text-foreground/85">{editingAssignment.employeeName}</span></p>
                </div>
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={() => setEditingAssignment(null)} >
                  <X size={16} />
                </Button>
              </div>

              <form onSubmit={handleSaveEditAssignment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/85">Select Leave Policy</label>
                  <SearchableSelect
                    options={policies.map((p) => ({ value: String(p.id), label: p.name }))}
                    value={editAssignPolicyId}
                    onChange={setEditAssignPolicyId}
                    placeholder="Choose policy..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/85">Effective Start Date</label>
                  <Input className="w-full"
                    type="date"
                    value={editAssignStartDate}
                    onChange={(e) => setEditAssignStartDate(e.target.value)}
                    
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="ghost" size="sm" className="cursor-pointer"
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    disabled={updatingAssignment}
                    
                  >
                    Cancel
                  </Button>
                  <Button variant="dark" size="sm" className="cursor-pointer"
                    type="submit"
                    disabled={updatingAssignment || !editAssignPolicyId}
                    
                  >
                    {updatingAssignment ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{updatingAssignment ? 'Saving...' : 'Save Changes'}</span>
                  </Button>
                </div>
              </form>
            </DialogContent>
</Dialog>
        )}
      </AnimatePresence>

      {/* Delete Assignment Confirmation Modal */}
      <AnimatePresence>
        {assignmentToDelete && (
          <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-md">
<DialogTitle className="sr-only">Dialog</DialogTitle>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Remove Policy Assignment</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-foreground/70">
                Are you sure you want to remove policy <span className="font-semibold text-foreground">"{assignmentToDelete.policyName}"</span> assignment for <span className="font-semibold text-foreground">"{assignmentToDelete.employeeName}"</span>?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" className="cursor-pointer"
                  onClick={() => setAssignmentToDelete(null)}
                  disabled={deletingAssignment}
                  
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className="cursor-pointer"
                  onClick={handleConfirmDeleteAssignment}
                  disabled={deletingAssignment}
                  
                >
                  {deletingAssignment ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>{deletingAssignment ? 'Removing...' : 'Remove Assignment'}</span>
                </Button>
              </div>
            </DialogContent>
</Dialog>
        )}
      </AnimatePresence>

      {/* Delete Allocation Confirmation Modal */}
      <AnimatePresence>
        {allocToDelete && (
          <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-md">
<DialogTitle className="sr-only">Dialog</DialogTitle>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Remove Leave Allocation</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-foreground/70">
                Are you sure you want to remove <span className="font-semibold text-foreground">"{allocToDelete.leaveType}"</span> allocation for <span className="font-semibold text-foreground">"{allocToDelete.employeeName}"</span>?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" className="cursor-pointer"
                  onClick={() => setAllocToDelete(null)}
                  disabled={deletingAlloc}
                  
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className="cursor-pointer"
                  onClick={handleConfirmDeleteAllocation}
                  disabled={deletingAlloc}
                  
                >
                  {deletingAlloc ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>{deletingAlloc ? 'Removing...' : 'Remove Allocation'}</span>
                </Button>
              </div>
            </DialogContent>
</Dialog>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-foreground text-white px-4 py-2.5 rounded-md text-xs font-medium shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
