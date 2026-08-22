import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import {
  Banknote, Plus, Search, XCircle, Eye, X, Pen, Trash2,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  Inbox, IndianRupee, CheckCircle2, Clock, Calendar, Save,
  Zap, Users, Repeat, FileText, Building2, Loader2,
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import { formatINR } from '../../lib/hrmsExpenses';
import {
  PayModel, RunStatus, SalaryStructure, PayrollRun, PayrollSettings,
  listSalaryStructures, getSalaryStructureHistory, createSalaryStructure, updateSalaryStructure, deleteSalaryStructure,
  listPayrollRuns, createPayrollRun, deletePayrollRun, regeneratePayrollRun,
  calculatePayrollRun, approvePayrollRun, payPayrollRun,
  getPayrollSettings, updatePayrollSettings, defaultSettings,
  currentMonthStr, monthLabel, grossMonthly,
  ROLE_OPTIONS, ROLE_LABELS,
} from '../../lib/hrmsPayroll';

type Section = 'runs' | 'structures' | 'settings';
type SortKey = 'month' | 'net';

const PAGE_SIZE = 8;

const RUN_STATUS_BADGE: Record<RunStatus, { base: string; label: string }> = {
  draft: { base: 'bg-zinc-100 text-zinc-500', label: 'Draft' },
  calculated: { base: 'bg-amber-50 text-amber-600', label: 'Calculated' },
  approved: { base: 'bg-blue-50 text-blue-600', label: 'Approved' },
  paid: { base: 'bg-emerald-50 text-emerald-600', label: 'Paid' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const PAY_MODEL_BADGE: Record<PayModel, { base: string; label: string }> = {
  monthly: { base: 'bg-purple-50 text-purple-600', label: 'Monthly' },
  shift: { base: 'bg-cyan-50 text-cyan-600', label: 'Shift' },
};

const ROLE_BADGE: Record<string, { base: string; label: string }> = {
  super_admin: { base: 'bg-rose-50 text-rose-700', label: 'Super Admin' },
  admin: { base: 'bg-purple-50 text-purple-700', label: 'Admin' },
  manager: { base: 'bg-blue-50 text-blue-700', label: 'Manager' },
  staff: { base: 'bg-emerald-50 text-emerald-700', label: 'Staff' },
  delivery_boy: { base: 'bg-zinc-50 text-zinc-600', label: 'Delivery Boy' },
};

interface StructureForm {
  userId: string;
  role: string;
  payModel: PayModel;
  ctc: string;
  basic: string;
  hra: string;
  conveyance: string;
  specialAllowance: string;
  shiftRate: string;
  overtimeRate: string;
  pfEnabled: boolean;
  pfPercent: string;
  esicEnabled: boolean;
  esicPercent: string;
  esicCap: string;
  ptEnabled: boolean;
  pt: string;
  tdsEnabled: boolean;
  tds: string;
  active: boolean;
}

const emptyForm: StructureForm = {
  userId: '',
  role: 'staff',
  payModel: 'monthly',
  ctc: '0',
  basic: '0', hra: '0', conveyance: '0', specialAllowance: '0',
  shiftRate: '0', overtimeRate: '0',
  pfEnabled: true, pfPercent: '12',
  esicEnabled: true, esicPercent: '0.75', esicCap: '21000',
  ptEnabled: true, pt: '200',
  tdsEnabled: false, tds: '0',
  active: true,
};

function num(s: string) { return Math.max(0, Number(s) || 0); }

const inputClass = 'w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function Payroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const section: Section = location.pathname.includes('/structures')
    ? 'structures'
    : location.pathname.includes('/settings')
      ? 'settings'
      : 'runs';
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [settings, setSettings] = useState<PayrollSettings>(() => defaultSettings());
  const [loading, setLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [structs, payrollRuns, payrollSettings, users] = await Promise.all([
          listSalaryStructures(token),
          listPayrollRuns(token),
          getPayrollSettings(token),
          getUsers(token),
        ]);
        if (cancelled) return;
        setStructures(structs);
        setRuns(payrollRuns);
        setSettings(payrollSettings);
        setAllUsers(users);
        setStaffOptions(
          users.map((u: any) => {
            const name = (u.full_name || u.email || '').trim();
            if (!name && !u.id) return null;
            const role = mapBackendRoleToFrontend(u.role_codes);
            const roleLabel = ROLE_LABELS[role] || role;
            const label = roleLabel ? `${name || u.email} (${roleLabel})` : (name || u.email);
            return { value: String(u.id), label };
          }).filter((o): o is { value: string; label: string } => o !== null)
        );
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Failed to load payroll');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const [runSearch, setRunSearch] = useState('');
  const [runSearchDebounced, setRunSearchDebounced] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState('all');
  const [runSortBy, setRunSortBy] = useState<SortKey>('month');
  const [runSortOrder, setRunSortOrder] = useState<'asc' | 'desc'>('desc');
  const [runPage, setRunPage] = useState(1);
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(currentMonthStr());
  const [confirmDeleteRun, setConfirmDeleteRun] = useState<PayrollRun | null>(null);
  const [confirmRegenerateRun, setConfirmRegenerateRun] = useState<PayrollRun | null>(null);

  const [structSearch, setStructSearch] = useState('');
  const [structSearchDebounced, setStructSearchDebounced] = useState('');
  const [payModelFilter, setPayModelFilter] = useState('all');
  const [structPage, setStructPage] = useState(1);
  const [structOpen, setStructOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<StructureForm>(emptyForm);
  const [confirmDeleteStruct, setConfirmDeleteStruct] = useState<SalaryStructure | null>(null);

  const [historyUser, setHistoryUser] = useState<{ userId: number; name: string } | null>(null);
  const [historyList, setHistoryList] = useState<SalaryStructure[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function openHistory(s: SalaryStructure) {
    if (!token) return;
    setHistoryUser({ userId: s.userId, name: s.employeeName });
    setLoadingHistory(true);
    try {
      const history = await getSalaryStructureHistory(token, s.userId);
      setHistoryList(history);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load salary history');
    } finally {
      setLoadingHistory(false);
    }
  }

  const handleEmployeeChange = (v: string) => {
    const matchedUser = allUsers.find((u: any) => String(u.id) === v);
    const autoRole = matchedUser ? mapBackendRoleToFrontend(matchedUser.role_codes) : 'staff';
    setForm((prev) => ({ ...prev, userId: v, role: autoRole }));
  };

  useEffect(() => {
    const t = setTimeout(() => setRunSearchDebounced(runSearch), 300);
    return () => clearTimeout(t);
  }, [runSearch]);

  useEffect(() => {
    const t = setTimeout(() => setStructSearchDebounced(structSearch), 300);
    return () => clearTimeout(t);
  }, [structSearch]);

  useEffect(() => { setRunPage(1); }, [runStatusFilter, runSearchDebounced]);
  useEffect(() => { setStructPage(1); }, [payModelFilter, structSearchDebounced]);

  async function reloadStructuresAndRuns() {
    if (!token) return;
    const [structs, payrollRuns] = await Promise.all([
      listSalaryStructures(token),
      listPayrollRuns(token),
    ]);
    setStructures(structs);
    setRuns(payrollRuns);
  }

  // ─── Pay Cycles tab ───────────────────────────────────────────────────────

  const runHasFilters = runSearch || runStatusFilter !== 'all';

  const runTotal = runs.reduce((s, r) => s + r.entries.reduce((x, e) => x + e.netPay, 0), 0);
  const runInProgress = runs.filter((r) => r.status !== 'paid').length;
  const runPaid = runs.filter((r) => r.status === 'paid').length;

  const runStatCards = [
    { label: 'Total Pay Cycles', value: runs.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'In Progress', value: runInProgress, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Paid', value: runPaid, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Net Payout', value: formatINR(runTotal), icon: IndianRupee, color: 'bg-purple-50 text-purple-600', small: true },
  ];

  const runFiltered = useMemo(() => {
    let list = [...runs];
    const q = runSearchDebounced.toLowerCase().trim();
    if (q) list = list.filter((r) => monthLabel(r.month).toLowerCase().includes(q));
    if (runStatusFilter !== 'all') list = list.filter((r) => r.status === runStatusFilter);
    list.sort((a, b) => {
      const va = runSortBy === 'net' ? a.entries.reduce((s, e) => s + e.netPay, 0) : a.month;
      const vb = runSortBy === 'net' ? b.entries.reduce((s, e) => s + e.netPay, 0) : b.month;
      return runSortOrder === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
    });
    return list;
  }, [runs, runSearchDebounced, runStatusFilter, runSortBy, runSortOrder]);

  const runTotalPages = Math.max(1, Math.ceil(runFiltered.length / PAGE_SIZE));
  const runStartRow = (runPage - 1) * PAGE_SIZE + 1;
  const runEndRow = Math.min(runPage * PAGE_SIZE, runFiltered.length);
  const runPaged = runFiltered.slice((runPage - 1) * PAGE_SIZE, runPage * PAGE_SIZE);

  function toggleRunSort(key: SortKey) {
    if (runSortBy === key) setRunSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setRunSortBy(key); setRunSortOrder('asc'); }
  }

  async function handleGenerate(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token) return;
    if (runs.some((r) => r.month === genMonth)) {
      showToast('A run already exists for this month');
      return;
    }
    if (!structures.some((s) => s.active)) {
      showToast('No active salary structures yet');
      return;
    }
    try {
      const run = await createPayrollRun(token, genMonth);
      setRuns((prev) => [run, ...prev]);
      setGenOpen(false);
      showToast('Run created — click Calculate to compute salaries');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create run');
    }
  }

  async function handleCalculateRun(r: PayrollRun) {
    if (!token) return;
    try {
      const updated = await calculatePayrollRun(token, r.id);
      setRuns((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      showToast('Salaries calculated for this run');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to calculate run');
    }
  }

  async function handleApproveRun(r: PayrollRun) {
    if (!token) return;
    try {
      const updated = await approvePayrollRun(token, r.id);
      setRuns((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      showToast('Run approved and locked');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to approve run');
    }
  }

  async function handlePayRun(r: PayrollRun) {
    if (!token) return;
    try {
      const updated = await payPayrollRun(token, r.id);
      setRuns((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      showToast('Run marked as paid');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to mark run paid');
    }
  }

  async function handleDeleteRun() {
    if (!confirmDeleteRun || !token) return;
    try {
      await deletePayrollRun(token, confirmDeleteRun.id);
      setRuns((prev) => prev.filter((r) => r.id !== confirmDeleteRun.id));
      setConfirmDeleteRun(null);
      showToast('Run deleted — you can Generate Run for that month again');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete run');
    }
  }

  async function handleRegenerateRun() {
    if (!confirmRegenerateRun || !token) return;
    try {
      const updated = await regeneratePayrollRun(token, confirmRegenerateRun.id);
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setConfirmRegenerateRun(null);
      showToast(`Regenerated ${monthLabel(updated.month)} with ${updated.entries.length} employee(s)`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to regenerate run');
    }
  }

  function runTotals(r: PayrollRun) {
    return r.entries.reduce(
      (acc, e) => ({ gross: acc.gross + e.gross, ded: acc.ded + e.totalDeductions, net: acc.net + e.netPay }),
      { gross: 0, ded: 0, net: 0 }
    );
  }

  // ─── Structures tab ───────────────────────────────────────────────────────

  const structHasFilters = structSearch || payModelFilter !== 'all';
  const monthlyCount = structures.filter((s) => s.payModel === 'monthly').length;
  const shiftCount = structures.filter((s) => s.payModel === 'shift').length;
  const monthlyGross = structures.filter((s) => s.active && s.payModel === 'monthly').reduce((sum, s) => sum + grossMonthly(s), 0);

  const structStatCards = [
    { label: 'Employees', value: structures.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Monthly', value: monthlyCount, icon: Calendar, color: 'bg-purple-50 text-purple-600' },
    { label: 'Shift', value: shiftCount, icon: Repeat, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Monthly Payroll', value: formatINR(monthlyGross), icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600', small: true },
  ];

  const structFiltered = useMemo(() => {
    let list = [...structures];
    const q = structSearchDebounced.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        s.employeeName.toLowerCase().includes(q) ||
        (ROLE_LABELS[s.role] || s.role).toLowerCase().includes(q)
      );
    }
    if (payModelFilter !== 'all') list = list.filter((s) => s.payModel === payModelFilter);
    list.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return list;
  }, [structures, structSearchDebounced, payModelFilter]);

  const structTotalPages = Math.max(1, Math.ceil(structFiltered.length / PAGE_SIZE));
  const structStartRow = (structPage - 1) * PAGE_SIZE + 1;
  const structEndRow = Math.min(structPage * PAGE_SIZE, structFiltered.length);
  const structPaged = structFiltered.slice((structPage - 1) * PAGE_SIZE, structPage * PAGE_SIZE);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setStructOpen(true);
  }

  function openEdit(s: SalaryStructure) {
    setEditingId(s.id);
    setForm({
      userId: String(s.userId),
      role: s.role,
      payModel: s.payModel,
      ctc: String(s.ctc || 0),
      basic: String(s.monthly.basic), hra: String(s.monthly.hra),
      conveyance: String(s.monthly.conveyance), specialAllowance: String(s.monthly.specialAllowance),
      shiftRate: String(s.shiftRate), overtimeRate: String(s.overtimeRate),
      pfEnabled: s.deductions.pfEnabled, pfPercent: String(s.deductions.pfPercent),
      esicEnabled: s.deductions.esicEnabled, esicPercent: String(s.deductions.esicPercent), esicCap: String(s.deductions.esicCap),
      ptEnabled: s.deductions.ptEnabled, pt: String(s.deductions.pt),
      tdsEnabled: s.deductions.tdsEnabled, tds: String(s.deductions.tds),
      active: s.active,
    });
    setStructOpen(true);
  }

  async function handleStructSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token || !form.userId) return;
    const isNew = !editingId;
    const payload = {
      role: form.role || 'staff',
      payModel: form.payModel,
      monthly: {
        basic: num(form.basic), hra: num(form.hra),
        conveyance: num(form.conveyance), specialAllowance: num(form.specialAllowance),
      },
      ctc: num(form.ctc),
      shiftRate: num(form.shiftRate),
      overtimeRate: num(form.overtimeRate),
      deductions: {
        pfEnabled: form.pfEnabled, pfPercent: num(form.pfPercent),
        esicEnabled: form.esicEnabled, esicPercent: num(form.esicPercent), esicCap: num(form.esicCap),
        ptEnabled: form.ptEnabled, pt: num(form.pt),
        tdsEnabled: form.tdsEnabled, tds: num(form.tds),
      },
      active: form.active,
      effectiveFrom: currentMonthStr(),
    };
    try {
      if (isNew) {
        await createSalaryStructure(token, { userId: Number(form.userId), ...payload });
      } else {
        await updateSalaryStructure(token, editingId, payload);
      }
      await reloadStructuresAndRuns();
      setStructOpen(false);
      setEditingId(null);
      showToast(isNew ? 'Salary structure created' : 'Salary structure updated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save structure');
    }
  }

  async function handleDeleteStruct() {
    if (!confirmDeleteStruct || !token) return;
    try {
      await deleteSalaryStructure(token, confirmDeleteStruct.id);
      await reloadStructuresAndRuns();
      setConfirmDeleteStruct(null);
      showToast('Salary structure deleted');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete structure');
    }
  }

  async function toggleActive(s: SalaryStructure) {
    if (!token) return;
    try {
      await updateSalaryStructure(token, s.id, { active: !s.active });
      await reloadStructuresAndRuns();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update structure');
    }
  }

  // ─── Settings tab ─────────────────────────────────────────────────────────

  function setSetting(key: keyof PayrollSettings, value: string | number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSettingsSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token) return;
    try {
      const saved = await updatePayrollSettings(token, settings);
      setSettings(saved);
      showToast('Payroll settings saved');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save settings');
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
        >
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </motion.div>
      )}

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Payroll</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Salary structures, pay cycles and payouts</p>
        </div>
        {section === 'runs' && (
          <button onClick={() => { setGenMonth(currentMonthStr()); setGenOpen(true); }} className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <Plus size={14} />Generate Run
          </button>
        )}
        {section === 'structures' && (
          <button onClick={openCreate} className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <Plus size={14} />Add Structure
          </button>
        )}
      </motion.header>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-zinc-500">
          <Loader2 size={18} className="animate-spin" /> Loading payroll…
        </div>
      )}

      {!loading && section === 'runs' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {runStatCards.map((card, i) => (
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
                  <p className={`${card.small ? 'text-sm' : 'text-lg'} font-extrabold text-zinc-900 leading-none truncate`}>
                    {card.value}
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">
                    {card.label}
                  </p>
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
                placeholder="Search by month..."
                value={runSearch}
                onChange={(e) => setRunSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
            </div>
            <div className="w-[160px]">
              <SearchableSelect value={runStatusFilter} onChange={setRunStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
            </div>
            {runHasFilters && (
              <button onClick={() => { setRunSearch(''); setRunStatusFilter('all'); }} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
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
            {runPaged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                  <Inbox size={24} className="text-zinc-300" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">
                  {runs.length === 0 ? 'No pay cycles yet' : 'No results found'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  {runs.length === 0 ? 'Click "Generate Run" to create a payroll period.' : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th onClick={() => toggleRunSort('month')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                          <span className="flex items-center gap-1">Period{runSortBy !== 'month' ? <ArrowUpDown size={12} className="text-zinc-300" /> : runSortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />}</span>
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Employees</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Gross</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Deductions</th>
                        <th onClick={() => toggleRunSort('net')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                          <span className="flex items-center gap-1">Net Pay{runSortBy !== 'net' ? <ArrowUpDown size={12} className="text-zinc-300" /> : runSortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />}</span>
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {runPaged.map((r, i) => {
                        const totals = runTotals(r);
                        return (
                          <motion.tr
                            key={r.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => navigate(`/hrms/payroll/run/${r.id}`)}
                            className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs font-bold text-zinc-900">{monthLabel(r.month)}</p>
                              <p className="text-[10px] text-zinc-400">Created {new Date(r.createdAt).toLocaleDateString()}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700">
                                {r.entries.length}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-zinc-900">{formatINR(totals.gross)}</td>
                            <td className="px-4 py-3 text-xs text-rose-500">{formatINR(totals.ded)}</td>
                            <td className="px-4 py-3 text-xs font-extrabold text-emerald-600">{formatINR(totals.net)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${RUN_STATUS_BADGE[r.status].base}`}>
                                {RUN_STATUS_BADGE[r.status].label}
                              </span>
                            </td>
                            <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button onClick={() => navigate(`/hrms/payroll/run/${r.id}`)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                                  <Eye size={14} />
                                </button>
                                {(r.status === 'draft' || r.status === 'calculated') && (
                                  <button onClick={() => handleCalculateRun(r)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={r.status === 'draft' ? 'Calculate' : 'Recalculate'}>
                                    <Zap size={14} />
                                  </button>
                                )}
                                {r.status === 'calculated' && (
                                  <button onClick={() => handleApproveRun(r)} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                                    <CheckCircle2 size={14} />
                                  </button>
                                )}
                                {r.status === 'approved' && (
                                  <button onClick={() => handlePayRun(r)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Mark Paid">
                                    <Banknote size={14} />
                                  </button>
                                )}
                                <button onClick={() => setConfirmRegenerateRun(r)} className="p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Regenerate with all active structures">
                                  <Repeat size={14} />
                                </button>
                                <button onClick={() => setConfirmDeleteRun(r)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-zinc-100">
                  {runPaged.map((r, i) => {
                    const totals = runTotals(r);
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => navigate(`/hrms/payroll/run/${r.id}`)}
                        className="p-4 space-y-2 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{monthLabel(r.month)}</p>
                            <p className="text-[10px] text-zinc-400">{r.entries.length} employees</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${RUN_STATUS_BADGE[r.status].base}`}>
                            {RUN_STATUS_BADGE[r.status].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span className="text-zinc-900 font-bold">{formatINR(totals.gross)}</span>
                          <span>·</span>
                          <span className="text-rose-500">-{formatINR(totals.ded)}</span>
                          <span>·</span>
                          <span className="text-emerald-600 font-extrabold">{formatINR(totals.net)}</span>
                        </div>
                        <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
                          <button onClick={() => navigate(`/hrms/payroll/run/${r.id}`)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          {(r.status === 'draft' || r.status === 'calculated') && (
                            <button onClick={() => handleCalculateRun(r)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={r.status === 'draft' ? 'Calculate' : 'Recalculate'}>
                              <Zap size={14} />
                            </button>
                          )}
                          {r.status === 'calculated' && (
                            <button onClick={() => handleApproveRun(r)} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {r.status === 'approved' && (
                            <button onClick={() => handlePayRun(r)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Mark Paid">
                              <Banknote size={14} />
                            </button>
                          )}
                          <button onClick={() => setConfirmRegenerateRun(r)} className="p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Regenerate">
                            <Repeat size={14} />
                          </button>
                          <button onClick={() => setConfirmDeleteRun(r)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {runFiltered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                    <p className="text-xs text-zinc-500">
                      Showing <span className="font-bold text-zinc-900">{runStartRow}</span>–
                      <span className="font-bold text-zinc-900">{runEndRow}</span> of{' '}
                      <span className="font-bold text-zinc-900">{runFiltered.length}</span> pay cycles
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setRunPage((p) => Math.max(1, p - 1))} disabled={runPage <= 1} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft size={16} className="text-zinc-600" />
                      </button>
                      <button onClick={() => setRunPage((p) => Math.min(runTotalPages, p + 1))} disabled={runPage >= runTotalPages} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight size={16} className="text-zinc-600" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}

      {!loading && section === 'structures' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {structStatCards.map((card, i) => (
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
                  <p className={`${card.small ? 'text-sm' : 'text-lg'} font-extrabold text-zinc-900 leading-none truncate`}>
                    {card.value}
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">
                    {card.label}
                  </p>
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
                placeholder="Search employees..."
                value={structSearch}
                onChange={(e) => setStructSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
              />
            </div>
            <div className="w-[160px]">
              <SearchableSelect
                value={payModelFilter}
                onChange={setPayModelFilter}
                options={[
                  { value: 'all', label: 'All Pay Models' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'shift', label: 'Shift' },
                ]}
                placeholder="Pay Model"
              />
            </div>
            {structHasFilters && (
              <button onClick={() => { setStructSearch(''); setPayModelFilter('all'); }} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
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
            {structPaged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                  <Inbox size={24} className="text-zinc-300" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">
                  {structures.length === 0 ? 'No salary structures yet' : 'No results found'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  {structures.length === 0 ? 'Click "Add Structure" to set up an employee salary.' : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Employee</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Role</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Pay Model</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Earnings</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Deductions</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Active</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {structPaged.map((s, i) => {
                        const rb = ROLE_BADGE[s.role] || ROLE_BADGE.staff;
                        return (
                          <motion.tr
                            key={s.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-zinc-50/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="text-xs font-bold text-zinc-900">{s.employeeName}</p>
                              <p className="text-[10px] text-zinc-400">Since {s.effectiveFrom}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${rb.base}`}>
                                {rb.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${PAY_MODEL_BADGE[s.payModel].base}`}>
                                {PAY_MODEL_BADGE[s.payModel].label}
                              </span>
                            </td>
                             <td className="px-4 py-3">
                              <span className="text-xs font-bold text-zinc-900">
                                {s.payModel === 'monthly' ? (s.ctc > 0 ? `${formatINR(s.ctc)} CTC` : `${formatINR(grossMonthly(s))}/mo`) : `₹${s.shiftRate}/day`}
                              </span>
                              {s.payModel === 'monthly' && s.ctc > 0 && (
                                <p className="text-[10px] text-zinc-400">Rate: {formatINR(grossMonthly(s))}/mo</p>
                              )}
                              {s.payModel === 'shift' && (
                                <p className="text-[10px] text-zinc-400">OT ₹{s.overtimeRate}/hr</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-[10px] text-zinc-500">
                                {s.deductions.pfEnabled ? `PF ${s.deductions.pfPercent}%` : ''}
                                {s.deductions.esicEnabled ? ' · ESIC' : ''}
                                {s.deductions.ptEnabled ? ` · PT ${s.deductions.pt}` : ''}
                                {s.deductions.tdsEnabled ? ` · TDS ${s.deductions.tds}` : ''}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleActive(s)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border
                                  ${s.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
                              >
                                {s.active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => openHistory(s)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-all" title="View Salary Revision History">
                                  <Clock size={12} /> History
                                </button>
                                <button onClick={() => openEdit(s)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit Structure">
                                  <Pen size={14} />
                                </button>
                                <button onClick={() => setConfirmDeleteStruct(s)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Structure">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-zinc-100">
                  {structPaged.map((s, i) => {
                    const rb = ROLE_BADGE[s.role] || ROLE_BADGE.staff;
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{s.employeeName}</p>
                            <p className="text-[10px] text-zinc-400 mt-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold mr-1 ${rb.base}`}>{rb.label}</span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${PAY_MODEL_BADGE[s.payModel].base}`}>{PAY_MODEL_BADGE[s.payModel].label}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => toggleActive(s)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border
                              ${s.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                          >
                            {s.active ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-extrabold text-zinc-900">
                            {s.payModel === 'monthly' ? formatINR(grossMonthly(s)) + '/mo' : '₹' + s.shiftRate + '/day'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openHistory(s)} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-all" title="History">
                              <Clock size={12} /> History
                            </button>
                            <button onClick={() => openEdit(s)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                              <Pen size={14} />
                            </button>
                            <button onClick={() => setConfirmDeleteStruct(s)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {structFiltered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                    <p className="text-xs text-zinc-500">
                      Showing <span className="font-bold text-zinc-900">{structStartRow}</span>–
                      <span className="font-bold text-zinc-900">{structEndRow}</span> of{' '}
                      <span className="font-bold text-zinc-900">{structFiltered.length}</span> structures
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setStructPage((p) => Math.max(1, p - 1))} disabled={structPage <= 1} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft size={16} className="text-zinc-600" />
                      </button>
                      <button onClick={() => setStructPage((p) => Math.min(structTotalPages, p + 1))} disabled={structPage >= structTotalPages} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight size={16} className="text-zinc-600" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}

      {!loading && section === 'settings' && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSettingsSave}
          className="bg-white border border-zinc-100 rounded-xl shadow-sm p-6 space-y-6"
        >
          <div>
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Building2 size={15} />Company</h2>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Shown on payslips and payment records</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company Name">
              <input className={inputClass} value={settings.companyName} onChange={(e) => setSetting('companyName', e.target.value)} />
            </Field>
            <Field label="Company Address">
              <input className={inputClass} value={settings.companyAddress} onChange={(e) => setSetting('companyAddress', e.target.value)} />
            </Field>
            <Field label="PF Number">
              <input className={inputClass} value={settings.pfNumber} onChange={(e) => setSetting('pfNumber', e.target.value)} />
            </Field>
            <Field label="ESIC Number">
              <input className={inputClass} value={settings.esicNumber} onChange={(e) => setSetting('esicNumber', e.target.value)} />
            </Field>
            <Field label="PAN Number">
              <input className={inputClass} value={settings.panNumber} onChange={(e) => setSetting('panNumber', e.target.value)} />
            </Field>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-bold text-zinc-900">Default Deductions</h2>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Used when creating new salary structures</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="PF %">
              <input type="number" className={inputClass} value={settings.defaultPfPercent} onChange={(e) => setSetting('defaultPfPercent', num(e.target.value))} />
            </Field>
            <Field label="ESIC %">
              <input type="number" className={inputClass} value={settings.defaultEsicPercent} onChange={(e) => setSetting('defaultEsicPercent', num(e.target.value))} />
            </Field>
            <Field label="ESIC Cap (₹)">
              <input type="number" className={inputClass} value={settings.defaultEsicCap} onChange={(e) => setSetting('defaultEsicCap', num(e.target.value))} />
            </Field>
            <Field label="PT (₹)">
              <input type="number" className={inputClass} value={settings.defaultPt} onChange={(e) => setSetting('defaultPt', num(e.target.value))} />
            </Field>
            <Field label="Default TDS (₹)">
              <input type="number" className={inputClass} value={settings.defaultTds} onChange={(e) => setSetting('defaultTds', num(e.target.value))} />
            </Field>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
              <Save size={14} />Save Settings
            </button>
          </div>
        </motion.form>
      )}

      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setGenOpen(false)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">Generate Payroll Run</h3>
              <button type="button" onClick={() => setGenOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-4">
              <Field label="Pay Period">
                <input
                  type="month"
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <p className="text-[10px] text-zinc-400">
                Creates a draft run for {activeCount(structures)} active employee(s). Click Calculate to pull attendance days, late penalties, and overtime.
              </p>
              <button
                type="submit"
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={16} />Generate Run
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {structOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          onClick={() => setStructOpen(false)} role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90dvh] flex flex-col"
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-zinc-900">{editingId ? 'Edit Salary Structure' : 'Add Salary Structure'}</h3>
              <button type="button" onClick={() => setStructOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStructSave} className="p-5 overflow-y-auto space-y-5">
              <div>
                <Field label="Employee">
                  <SearchableSelect
                    value={form.userId}
                    onChange={handleEmployeeChange}
                    options={staffOptions}
                    disabled={!!editingId}
                    placeholder="Select employee"
                  />
                </Field>
                {form.userId && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <span>Role (Auto-fetched):</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${ROLE_BADGE[form.role]?.base || 'bg-zinc-100 text-zinc-700'}`}>
                      {ROLE_BADGE[form.role]?.label || form.role}
                    </span>
                  </div>
                )}
              </div>

              <Field label="Pay Model">
                <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
                  <button type="button" onClick={() => setForm({ ...form, payModel: 'monthly' })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${form.payModel === 'monthly' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                    Monthly Salary
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, payModel: 'shift' })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${form.payModel === 'shift' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                    Shift / Daily
                  </button>
                </div>
              </Field>

              {form.payModel === 'monthly' ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Zap size={14} className="text-emerald-600" />
                        CTC Auto-Breakdown Calculator
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700">Auto-populates 60% Basic, 30% HRA, 20% Conveyance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">₹</span>
                        <input
                          type="number"
                          placeholder="Enter total CTC (e.g. 48400)"
                          className={`${inputClass} pl-7`}
                          value={form.ctc || ''}
                          onChange={(e) => {
                            const ctcVal = Math.max(0, Number(e.target.value) || 0);
                            const rate = ctcVal > 21000 ? Math.max(0, ctcVal - 1950) : ctcVal;
                            const basic = Math.round(rate * 0.60);
                            const hra = Math.round(basic * 0.30);
                            const conveyance = Math.round(basic * 0.20);
                            const specialAllowance = Math.max(0, rate - (basic + hra + conveyance));
                            setForm({
                              ...form,
                              ctc: e.target.value,
                              basic: String(basic),
                              hra: String(hra),
                              conveyance: String(conveyance),
                              specialAllowance: String(specialAllowance),
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Monthly Earnings (Editable)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="Basic">
                      <input type="number" className={inputClass} value={form.basic} onChange={(e) => setForm({ ...form, basic: e.target.value })} />
                    </Field>
                    <Field label="HRA">
                      <input type="number" className={inputClass} value={form.hra} onChange={(e) => setForm({ ...form, hra: e.target.value })} />
                    </Field>
                    <Field label="Conveyance">
                      <input type="number" className={inputClass} value={form.conveyance} onChange={(e) => setForm({ ...form, conveyance: e.target.value })} />
                    </Field>
                    <Field label="Special Allowance">
                      <input type="number" className={inputClass} value={form.specialAllowance} onChange={(e) => setForm({ ...form, specialAllowance: e.target.value })} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Shift Rates (₹)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Shift Rate / day">
                      <input type="number" className={inputClass} value={form.shiftRate} onChange={(e) => setForm({ ...form, shiftRate: e.target.value })} />
                    </Field>
                    <Field label="Overtime Rate / hr">
                      <input type="number" className={inputClass} value={form.overtimeRate} onChange={(e) => setForm({ ...form, overtimeRate: e.target.value })} />
                    </Field>
                  </div>
                </div>
              )}

              <div className="border-t border-zinc-100 pt-5">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Deductions</p>
                <div className="space-y-3">
                  {([
                    { key: 'pfEnabled', label: 'Provident Fund (PF)' },
                    { key: 'esicEnabled', label: 'ESIC' },
                    { key: 'ptEnabled', label: 'Professional Tax (PT)' },
                    { key: 'tdsEnabled', label: 'TDS (Income Tax)' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, [key]: !form[key] })}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${form[key] ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}
                      >
                        <CheckCircle2 size={11} />{label}
                      </button>
                      <div className="flex items-center gap-3">
                        {key === 'pfEnabled' && (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-700">%</span>
                            <input type="number" className={`${inputClass} w-20 pl-8`} value={form.pfPercent} onChange={(e) => setForm({ ...form, pfPercent: e.target.value })} />
                          </div>
                        )}
                        {key === 'esicEnabled' && (
                          <>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-700">%</span>
                              <input type="number" className={`${inputClass} w-20 pl-8`} value={form.esicPercent} onChange={(e) => setForm({ ...form, esicPercent: e.target.value })} />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-700">₹</span>
                              <input type="number" className={`${inputClass} w-24 pl-8`} value={form.esicCap} onChange={(e) => setForm({ ...form, esicCap: e.target.value })} />
                            </div>
                          </>
                        )}
                        {key === 'ptEnabled' && (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-700">₹</span>
                            <input type="number" className={`${inputClass} w-20 pl-8`} value={form.pt} onChange={(e) => setForm({ ...form, pt: e.target.value })} />
                          </div>
                        )}
                        {key === 'tdsEnabled' && (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-700">₹</span>
                            <input type="number" className={`${inputClass} w-20 pl-8`} value={form.tds} onChange={(e) => setForm({ ...form, tds: e.target.value })} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!form.userId}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />{editingId ? 'Update Structure' : 'Create Structure'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {confirmDeleteRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5">
              <h3 className="font-bold text-zinc-900 mb-1">Delete run?</h3>
              <p className="text-xs text-zinc-500">
                Permanently removes {monthLabel(confirmDeleteRun.month)}
                {confirmDeleteRun.status === 'paid' || confirmDeleteRun.status === 'approved'
                  ? ` (currently ${confirmDeleteRun.status})`
                  : ''}
                . You can Generate Run again for that month afterward.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setConfirmDeleteRun(null)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteRun} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmRegenerateRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5">
              <h3 className="font-bold text-zinc-900 mb-1">Regenerate run?</h3>
              <p className="text-xs text-zinc-500">
                Rebuilds {monthLabel(confirmRegenerateRun.month)} from all active salary structures
                ({activeCount(structures)} employees), resets to draft, and replaces existing entries.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setConfirmRegenerateRun(null)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleRegenerateRun} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors">
                Regenerate
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmDeleteStruct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5">
              <h3 className="font-bold text-zinc-900 mb-1">Delete structure?</h3>
              <p className="text-xs text-zinc-500">This removes the salary structure for {confirmDeleteStruct.employeeName}. Existing runs keep their snapshots.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setConfirmDeleteStruct(null)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteStruct} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">Salary Structure History</h3>
                <p className="text-xs text-zinc-500 font-medium">Revisions & audit trail for {historyUser.name}</p>
              </div>
              <button onClick={() => setHistoryUser(null)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10 text-xs font-medium text-zinc-500 gap-2">
                  <Loader2 size={16} className="animate-spin" /> Loading revision history...
                </div>
              ) : historyList.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-8">No historical structures recorded for this employee.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200">
                  {historyList.map((st, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={`${st.id}-${idx}`} className="relative pl-8">
                        <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 bg-white ${isLatest ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-400'}`} />
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isLatest ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                                {isLatest ? 'Current Revision' : `Revision #${historyList.length - idx}`}
                              </span>
                              <span className="text-xs font-bold text-zinc-700">Effective {st.effectiveFrom}</span>
                            </div>
                            <span className="text-xs font-extrabold text-zinc-900">
                              {st.payModel === 'monthly' ? (st.ctc ? `${formatINR(st.ctc)} CTC` : `${formatINR(grossMonthly(st))}/mo`) : `₹${st.shiftRate}/day`}
                            </span>
                          </div>

                          {st.payModel === 'monthly' && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-zinc-100">
                              <div><span className="text-zinc-400 block text-[9px] uppercase font-bold">Basic</span><span className="font-bold text-zinc-800">{formatINR(st.monthly.basic)}</span></div>
                              <div><span className="text-zinc-400 block text-[9px] uppercase font-bold">HRA</span><span className="font-bold text-zinc-800">{formatINR(st.monthly.hra)}</span></div>
                              <div><span className="text-zinc-400 block text-[9px] uppercase font-bold">Conveyance</span><span className="font-bold text-zinc-800">{formatINR(st.monthly.conveyance)}</span></div>
                              <div><span className="text-zinc-400 block text-[9px] uppercase font-bold">Special</span><span className="font-bold text-zinc-800">{formatINR(st.monthly.specialAllowance)}</span></div>
                            </div>
                          )}

                          <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                            <span>
                              Deductions: {st.deductions.pfEnabled ? `PF (${st.deductions.pfPercent}%)` : ''} {st.deductions.esicEnabled ? '· ESIC' : ''} {st.deductions.ptEnabled ? `· PT ₹${st.deductions.pt}` : ''}
                            </span>
                            {st.updatedAt && <span>Updated: {new Date(st.updatedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-100 flex justify-end">
              <button onClick={() => setHistoryUser(null)} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function activeCount(structures: SalaryStructure[]) {
  return structures.filter((s) => s.active).length;
}
