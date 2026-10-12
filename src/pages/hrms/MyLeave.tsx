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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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
  if (status === 'approved') return <span className={`${base} bg-accent text-primary`}>Approved</span>;
  if (status === 'rejected') return <span className={`${base} bg-destructive/10 text-destructive`}>Rejected</span>;
  if (status === 'cancelled') return <span className={`${base} bg-secondary text-foreground/70`}>Cancelled</span>;
  return <span className={`${base} bg-warning/10 text-warning`}>Pending</span>;
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
    { label: 'Total Requests', value: requests.length, icon: CalendarOff, color: 'bg-info/10 text-info' },
    { label: 'Approved', value: requests.filter((r) => r.status === 'approved').length, icon: CheckCircle2, color: 'bg-accent text-primary' },
    { label: 'Pending', value: requests.filter((r) => r.status === 'pending').length, icon: Clock, color: 'bg-warning/10 text-warning' },
    { label: 'Rejected', value: requests.filter((r) => r.status === 'rejected').length, icon: XCircle, color: 'bg-destructive/10 text-destructive' },
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
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
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
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}

      <PageHeader title="Leave Requests" description="View and manage your leave requests" actions={<>
<Link
          to="/hrms/leave/apply/new"
          className="self-start sm:self-auto flex items-center gap-2 bg-foreground text-white border border-foreground px-4 py-2 rounded-md text-xs font-semibold hover:bg-foreground transition-colors shadow-sm"
        >
          <Plus size={14} />Apply for Leave
        </Link>
</>} />

      <div className="space-y-6">
        {/* Assigned Policy Header */}
        {myPolicy && myPolicy.has_policy ? (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-primary/20 rounded-xl p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)] space-y-2.5"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-primary/15 text-accent-foreground flex items-center justify-center font-semibold text-xs">
                  POL
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Assigned Policy: {myPolicy.policy_name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground/70 font-medium">
                    {myPolicy.period_label ? `Period: ${myPolicy.period_label}` : 'Active Company Policy'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-accent-foreground">
                <span className="px-3 py-1 rounded-lg bg-accent border border-primary/20">
                  Monthly Paid Limit: {myPolicy.max_paid_leaves ? `${myPolicy.max_paid_leaves} Days/mo` : 'Unlimited'}
                </span>
                <span className="px-3 py-1 rounded-lg bg-secondary border border-border text-foreground/85">
                  Monthly Unpaid Limit: {myPolicy.max_unpaid_leaves ? `${myPolicy.max_unpaid_leaves} Days/mo` : 'Unlimited'}
                </span>
              </div>
            </div>

            {myPolicy.entitlements && myPolicy.entitlements.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {myPolicy.entitlements.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border border-border text-xs">
                    <span className="font-semibold text-foreground">{e.leave_type_name || `Type ${e.leave_type_id}`}</span>
                    <span className="font-semibold text-accent-foreground">{e.days} Days/yr</span>
                    {e.carry_forward && <Badge variant="warning" >Carry Forward</Badge>}
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
            className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarOff size={16} className="text-primary" />
                Your Leave Balances
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground/70">Calculated real-time</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {balances.map((b) => (
                <div key={b.leave_type_id} className="p-3.5 rounded-xl bg-muted border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{b.leave_type_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{b.used} used of {b.total}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-primary leading-none block">{b.remaining}</span>
                    <span className="text-xs font-medium text-muted-foreground/70">left</span>
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
                placeholder="Search reason, leave type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                
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
                className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors"
              >
                <XCircle size={12} />Clear
              </button>
            )}
          </div>

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
                  onClick={reloadData}
                  
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
                          { key: null, label: 'Leave Type' },
                          { key: 'startDate' as SortKey, label: 'Dates' },
                          { key: 'days' as SortKey, label: 'Breakdown' },
                          { key: null, label: 'Classification' },
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
                          <TableCell className="font-medium text-foreground/85">{r.leaveType}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-foreground">
                                {r.days}d Total
                              </span>
                              <span className="text-[11px] text-muted-foreground font-semibold">
                                {r.paidDays > 0 ? `${r.paidDays} Paid` : ''}
                                {r.paidDays > 0 && r.lwpDays > 0 ? ' + ' : ''}
                                {r.lwpDays > 0 ? `${r.lwpDays} LWP` : ''}
                                {r.paidDays === 0 && r.lwpDays === 0 ? `${r.days}d` : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {r.unplannedDays > 0 ? (
                                <Badge variant="warning" >
                                  Unplanned ({r.unplannedDays}d)
                                </Badge>
                              ) : (
                                <Badge variant="success" >
                                  Planned ({r.plannedDays}d)
                                </Badge>
                              )}
                              {r.isEmergency && (
                                <Badge className="bg-purple-50 text-purple-700 border-purple-200" >
                                  Emergency
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[160px] truncate">{r.reason}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-muted-foreground/70 whitespace-nowrap">{formatDate(r.appliedOn)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => setDetailTarget(r)}  title="View">
                                <Eye size={14} />
                              </Button>
                              {r.status === 'pending' && (
                                <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setWithdrawTarget(r)}
                                  
                                  title="Withdraw"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>

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
                          <p className="text-xs font-semibold text-foreground">{r.leaveType}</p>
                        </div>
                        {statusBadge(r.status)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground/70">
                          {formatDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ''} · {r.days}d
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{r.reason}</p>
                      <div className="flex items-center gap-1 pt-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setDetailTarget(r)}  title="View">
                          <Eye size={14} />
                        </Button>
                        {r.status === 'pending' && (
                          <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setWithdrawTarget(r)}
                            
                            title="Withdraw"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

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
      </div>

      {detailTarget && (        <Dialog open onOpenChange={(open) => { if (!open) (() => setDetailTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => setDetailTarget(null)}
                >
                <X size={18} />
              </Button>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{detailTarget.leaveType}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(detailTarget.startDate)}{detailTarget.startDate !== detailTarget.endDate ? ` – ${formatDate(detailTarget.endDate)}` : ''} · {detailTarget.days} day{detailTarget.days !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="ml-auto">{statusBadge(detailTarget.status)}</div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground/70 mb-1">Reason</p>
                <p className="text-sm text-foreground/85">{detailTarget.reason}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground/70 mb-1">Applied On</p>
                <p className="text-sm text-foreground/85">{formatDate(detailTarget.appliedOn)}</p>
              </div>
              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" type="button" onClick={() => setDetailTarget(null)}
                  >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
</Dialog>
      )}

      {withdrawTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setWithdrawTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => setWithdrawTarget(null)}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">Withdraw leave request?</h3>
              <p className="text-sm text-foreground/70 mt-2">
                <span className="font-semibold text-foreground">{withdrawTarget.leaveType}</span>
                {' · '}
                {formatDate(withdrawTarget.startDate)}{withdrawTarget.startDate !== withdrawTarget.endDate ? ` – ${formatDate(withdrawTarget.endDate)}` : ''}
              </p>
              <p className="text-xs text-destructive font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" type="button" onClick={() => setWithdrawTarget(null)}
                >
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15" type="button" onClick={handleWithdraw}
                >
                <Trash2 size={16} /> Withdraw
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
