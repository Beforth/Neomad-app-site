import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search, XCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  Plus, ChevronUp, ChevronDown, Inbox, Pencil, Trash2, X, Loader2, CheckCircle2,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { listLeaveTypes, deleteLeaveType, updateLeaveType } from '../../lib/hrmsLeave';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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

const PAGE_SIZE = 10;

type SortKey = 'name' | 'daysPerYear';

export default function LeaveType() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState<LeaveTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<LeaveTypeItem | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const reload = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listLeaveTypes(token);
      setTypes(
        data.map((t) => ({
          id: t.id,
          name: t.name,
          daysPerYear: t.days_per_year,
          carryForward: t.carry_forward,
          maxCarryForwardLeaves: t.max_carry_forward_leaves,
          carryForwardExpiryDays: t.carry_forward_expiry_days,
          allowLeaveAfterDays: t.allow_leave_after_days,
          maxConsecutiveLeaves: t.max_consecutive_leaves,
          isLeaveWithoutPay: t.is_leave_without_pay,
          isPartiallyPaidLeave: t.is_partially_paid_leave,
          isOptionalLeave: t.is_optional_leave,
          allowNegativeBalance: t.allow_negative_balance,
          allowOverAllocating: t.allow_over_allocating,
          includeHolidaysAsLeaves: t.include_holidays_as_leaves,
          isCompensatory: t.is_compensatory,
          description: t.description || '',
          status: (t.status as any) || 'active',
        }))
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load leave types');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

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
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
  }

  function handleDelete(item: LeaveTypeItem) {
    setDeleteTarget(item);
  }

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    try {
      await deleteLeaveType(token, deleteTarget.id);
      await reload();
      showToast('Leave type deleted successfully');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete leave type');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function toggleStatus(item: LeaveTypeItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await updateLeaveType(token, item.id, { status: nextStatus });
      await reload();
      showToast(`Leave type set to ${nextStatus}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  function statusBadge(item: LeaveTypeItem) {
    const isActive = item.status === 'active';
    return (
      <button
        onClick={(e) => toggleStatus(item, e)}
        title={`Click to set ${isActive ? 'Inactive' : 'Active'}`}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize cursor-pointer transition-all hover:scale-105 select-none ${isActive ? 'bg-accent text-accent-foreground border border-primary/30 hover:bg-primary/15' : 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary' : 'bg-destructive'}`}></span>
        {item.status}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Types" description="Manage leave categories" actions={<>
<Button variant="dark" size="sm" className="self-start sm:self-auto" onClick={() => navigate('/hrms/leave/type/new')} >
          <Plus size={14} />Add Leave Type
        </Button>
</>} />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search leave types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
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
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        {filtered.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No leave types found" description="Try adjusting your search or filters" className="border-0" />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: 'name' as SortKey, label: 'Leave Type' },
                      { key: 'daysPerYear' as SortKey, label: 'Days / Year' },
                      { key: null, label: 'Carry Forward' },
                      { key: null, label: 'Description' },
                      { key: null, label: 'Status' },
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
                      <TableCell className="font-semibold text-foreground">
                          <button onClick={() => navigate(`/hrms/leave/type/${r.id}`)}
                            className="hover:text-info transition-colors cursor-pointer">
                            {r.name}
                          </button>
                        </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-[11px] font-semibold text-foreground/85">
                          {r.daysPerYear}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.carryForward ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.description || '—'}</TableCell>
                      <TableCell>{statusBadge(r)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => navigate(`/hrms/leave/type/edit/${r.id}`)}  title="Edit">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(r)}
                            
                            title="Delete"
                          >
                            <Trash2 size={14} />
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
                      <p className="text-xs font-semibold text-foreground">
                        <button onClick={() => navigate(`/hrms/leave/type/${r.id}`)}
                          className="hover:text-info transition-colors cursor-pointer">
                          {r.name}
                        </button>
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{r.description}</p>
                    </div>
                    {statusBadge(r)}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{r.daysPerYear} days/yr</span>
                    <span>·</span>
                    <span>Carry forward: {r.carryForward ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => navigate(`/hrms/leave/type/edit/${r.id}`)}  title="Edit">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(r)}
                      
                      title="Delete"
                    >
                      <Trash2 size={14} />
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
                <span className="font-semibold text-foreground">{filtered.length}</span> types
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

      {deleteTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setDeleteTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => setDeleteTarget(null)}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">Delete leave type?</h3>
              <p className="text-sm text-foreground/70 mt-2">
                <span className="font-semibold text-foreground">{deleteTarget.name}</span>
              </p>
              <p className="text-xs text-destructive font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" type="button" onClick={() => setDeleteTarget(null)}
                >
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15" type="button" onClick={confirmDelete}
                >
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
