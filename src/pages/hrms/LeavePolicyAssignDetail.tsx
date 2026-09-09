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
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Assignment not found</h3>
          <p className="text-xs text-zinc-400 mb-4">The assignment or its policy doesn't exist.</p>
          <button onClick={() => navigate('/hrms/leave/policy')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Back to Policies
          </button>
        </div>
      </div>
    );
  }

  if (!assignment) return null;

  const statCards = [
    { label: 'Total Types', value: entitlements.length, icon: Tag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Annual Days', value: entitlements.reduce((s, r) => s + r.days, 0), icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Carry Forward', value: entitlements.filter((r) => r.carryForward).length, icon: ArrowRightLeft, color: 'bg-amber-50 text-amber-600' },
    { label: 'Max Continuous', value: Math.max(...entitlements.map((r) => r.maxContinuous)), icon: Clock, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate('/hrms/leave/policy')}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{assignment.employee_name || assignment.employee_email}</h1>
            {assignment.status === 'active' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            ) : assignment.status === 'discontinued' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Discontinued (Same Year)
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                Inactive (Prev Year)
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Policy: {assignment.policy_name} · Assigned {assignment.start_date}
          </p>
        </div>
      </motion.div>

      {/* Assignment Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            <User size={18} className="text-zinc-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900">{assignment.employee_name || assignment.employee_email}</p>
            <p className="text-xs text-zinc-400">Assigned Policy: {assignment.policy_name}</p>
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

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      {/* Leave Entitlements */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 text-sm">Leave Entitlements — {assignment.policy_name}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Annual leave allocation per leave type</p>
        </div>

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
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    {[
                      { key: 'type' as SortKey, label: 'Leave Type' },
                      { key: 'days' as SortKey, label: 'Days / Year' },
                      { key: null, label: 'Carry Forward' },
                      { key: null, label: 'Max Continuous' },
                      { key: null, label: 'Description' },
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
                  {filtered.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/hrms/leave/policy/assign/${id}/entitlement/${r.id}`)}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">{r.type}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700">
                          {r.days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.carryForward ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.maxContinuous} days</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">{r.description}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-zinc-100">
              {filtered.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 space-y-2 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  onClick={() => navigate(`/hrms/leave/policy/assign/${id}/entitlement/${r.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{r.type}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{r.description}</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-700 shrink-0">
                      {r.days}d
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
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
