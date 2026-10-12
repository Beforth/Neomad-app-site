import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Tag, Calendar, ArrowRightLeft, Clock, Info, ChevronRight,
  Search, XCircle, ArrowUpDown, ChevronUp, ChevronDown, Inbox, User,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { getLeavePolicyAssignment, getLeavePolicy, type LeavePolicyAssignmentOut, type LeavePolicyOut } from '../../lib/hrmsLeave';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

const CARRY_FORWARD_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Carry Forward: Yes' },
  { value: 'no', label: 'Carry Forward: No' },
];

type SortKey = 'type' | 'days';

interface PolicyItem {
  id: number;
  type: string;
  days: number;
  carryForward: boolean;
  maxContinuous: number;
  description: string;
}

export default function LeavePolicyAssignDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [carryForwardFilter, setCarryForwardFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('type');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [entitlements, setEntitlements] = useState<PolicyItem[]>([]);
  const [assignment, setAssignment] = useState<LeavePolicyAssignmentOut | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!token || !id) return;
    (async () => {
      try {
        const assignData = await getLeavePolicyAssignment(token, Number(id));
        setAssignment(assignData);
        if (assignData.policy_id) {
          const polData = await getLeavePolicy(token, assignData.policy_id);
          setEntitlements(
            (polData.entitlements || []).map((e, i) => ({
              id: e.id || i + 1,
              type: e.leave_type_name || `Leave Type ${e.leave_type_id}`,
              days: e.days,
              carryForward: e.carry_forward,
              maxContinuous: e.max_continuous,
              description: e.description || '',
            }))
          );
        }
      } catch (e) {
        console.error('Error fetching assignment detail:', e);
        setNotFound(true);
      }
    })();
  }, [token, id]);

  const filtered = useMemo(() => {
    let data = [...entitlements];
    const q = searchDebounced.toLowerCase().trim();
    if (q) {
      data = data.filter((r) => r.type.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    if (carryForwardFilter === 'yes') data = data.filter((r) => r.carryForward);
    if (carryForwardFilter === 'no') data = data.filter((r) => !r.carryForward);

    data.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortBy === 'days') cmp = a.days - b.days;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [entitlements, searchDebounced, carryForwardFilter, sortBy, sortOrder]);

  const hasFilters = search || carryForwardFilter !== 'all';

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Assignment not found</h3>
          <p className="text-xs text-muted-foreground/70 mb-4">The assignment or its policy doesn't exist.</p>
          <Button variant="dark" size="sm" onClick={() => navigate('/hrms/leave/policy')}
            >
            Back to Policies
          </Button>
        </div>
      </div>
    );
  }

  if (!assignment) return null;

  const statCards = [
    { label: 'Total Types', value: entitlements.length, icon: Tag, color: 'bg-info/10 text-info' },
    { label: 'Annual Days', value: entitlements.reduce((s, r) => s + r.days, 0), icon: Calendar, color: 'bg-accent text-primary' },
    { label: 'Carry Forward', value: entitlements.filter((r) => r.carryForward).length, icon: ArrowRightLeft, color: 'bg-warning/10 text-warning' },
    { label: 'Max Continuous', value: Math.max(...entitlements.map((r) => r.maxContinuous)), icon: Clock, color: 'bg-destructive/10 text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="icon-sm"
          onClick={() => navigate('/hrms/leave/policy')}
          
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </Button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{assignment.employee_name || assignment.employee_email}</h1>
            {assignment.status === 'active' ? (
              <Badge variant="success" >
                Active
              </Badge>
            ) : assignment.status === 'discontinued' ? (
              <Badge variant="warning" >
                Discontinued (Same Year)
              </Badge>
            ) : (
              <Badge>
                Inactive (Prev Year)
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Policy: {assignment.policy_name} · Assigned {assignment.start_date}
          </p>
        </div>
      </motion.div>

      {/* Assignment Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <User size={18} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{assignment.employee_name || assignment.employee_email}</p>
            <p className="text-xs text-muted-foreground/70">Assigned Policy: {assignment.policy_name}</p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <p className="text-lg font-semibold text-foreground leading-none">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

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
        <div className="w-[180px]">
          <SearchableSelect
            value={carryForwardFilter}
            onChange={setCarryForwardFilter}
            options={CARRY_FORWARD_OPTIONS}
            className="w-full"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setCarryForwardFilter('all'); }}
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      {/* Leave Entitlements */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Leave Entitlements — {assignment.policy_name}</h2>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Annual leave allocation per leave type</p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No leave types found" description="Try adjusting your search or filters" className="border-0" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: 'type' as SortKey, label: 'Leave Type' },
                      { key: 'days' as SortKey, label: 'Days / Year' },
                      { key: null, label: 'Carry Forward' },
                      { key: null, label: 'Max Continuous' },
                      { key: null, label: 'Description' },
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
                  {filtered.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                      onClick={() => navigate(`/hrms/leave/policy/assign/${id}/entitlement/${r.id}`)}
                    >
                      <TableCell className="font-semibold text-foreground">{r.type}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-[11px] font-semibold text-foreground/85">
                          {r.days}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.carryForward ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.maxContinuous} days</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.description}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {filtered.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/hrms/leave/policy/assign/${id}/entitlement/${r.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{r.type}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{r.description}</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-xs font-semibold text-foreground/85 shrink-0">
                      {r.days}d
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Carry forward: {r.carryForward ? 'Yes' : 'No'}</span>
                    <span>·</span>
                    <span>Max: {r.maxContinuous}d</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>

    </div>
  );
}
