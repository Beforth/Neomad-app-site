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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, fieldClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
  draft: { base: 'bg-secondary text-muted-foreground', label: 'Draft' },
  calculated: { base: 'bg-warning/10 text-warning', label: 'Calculated' },
  approved: { base: 'bg-info/10 text-info', label: 'Approved' },
  paid: { base: 'bg-accent text-primary', label: 'Paid' },
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
  super_admin: { base: 'bg-destructive/10 text-destructive', label: 'Super Admin' },
  admin: { base: 'bg-purple-50 text-purple-700', label: 'Admin' },
  manager: { base: 'bg-info/10 text-info', label: 'Manager' },
  staff: { base: 'bg-accent text-accent-foreground', label: 'Staff' },
  delivery_boy: { base: 'bg-muted text-foreground/70', label: 'Delivery Boy' },
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

const inputClass = fieldClass;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
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
    { label: 'Total Pay Cycles', value: runs.length, icon: FileText, color: 'bg-info/10 text-info' },
    { label: 'In Progress', value: runInProgress, icon: Clock, color: 'bg-warning/10 text-warning' },
    { label: 'Paid', value: runPaid, icon: CheckCircle2, color: 'bg-accent text-primary' },
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
    { label: 'Employees', value: structures.length, icon: Users, color: 'bg-info/10 text-info' },
    { label: 'Monthly', value: monthlyCount, icon: Calendar, color: 'bg-purple-50 text-purple-600' },
    { label: 'Shift', value: shiftCount, icon: Repeat, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Monthly Payroll', value: formatINR(monthlyGross), icon: IndianRupee, color: 'bg-accent text-primary', small: true },
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
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
        >
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}

      <PageHeader title="Payroll" description="Salary structures, pay cycles and payouts" actions={<>
{section === 'runs' && (
          <Button variant="dark" size="sm" className="self-start sm:self-auto" onClick={() => { setGenMonth(currentMonthStr()); setGenOpen(true); }} >
            <Plus size={14} />Generate Run
          </Button>
        )}
        {section === 'structures' && (
          <Button variant="dark" size="sm" className="self-start sm:self-auto" onClick={openCreate} >
            <Plus size={14} />Add Structure
          </Button>
        )}
</>} />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-muted-foreground">
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
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className={`${card.small ? 'text-sm' : 'text-lg'} font-semibold text-foreground leading-none truncate`}>
                    {card.value}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">
                    {card.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
              <Input data-search="" className="w-full pl-9 pr-4"
                type="text"
                placeholder="Search by month..."
                value={runSearch}
                onChange={(e) => setRunSearch(e.target.value)}
                
              />
            </div>
            <div className="w-[160px]">
              <SearchableSelect value={runStatusFilter} onChange={setRunStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
            </div>
            {runHasFilters && (
              <button onClick={() => { setRunSearch(''); setRunStatusFilter('all'); }} className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors">
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
            {runPaged.length === 0 ? (
              <EmptyState icon={<Inbox />} title={runs.length === 0 ? 'No pay cycles yet' : 'No results found'} description={runs.length === 0 ? 'Click "Generate Run" to create a payroll period.' : 'Try adjusting your search or filters'} className="border-0" />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => toggleRunSort('month')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                          <span className="flex items-center gap-1">Period{runSortBy !== 'month' ? <ArrowUpDown size={12} className="text-muted-foreground/50" /> : runSortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />}</span>
                        </TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Employees</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Gross</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Deductions</TableHead>
                        <TableHead onClick={() => toggleRunSort('net')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                          <span className="flex items-center gap-1">Net Pay{runSortBy !== 'net' ? <ArrowUpDown size={12} className="text-muted-foreground/50" /> : runSortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />}</span>
                        </TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Status</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runPaged.map((r, i) => {
                        const totals = runTotals(r);
                        return (
                          <motion.tr
                            key={r.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => navigate(`/hrms/payroll/run/${r.id}`)}
                            className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                          >
                            <TableCell className="whitespace-nowrap">
                              <p className="text-xs font-semibold text-foreground">{monthLabel(r.month)}</p>
                              <p className="text-[11px] text-muted-foreground/70">Created {new Date(r.createdAt).toLocaleDateString()}</p>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-[11px] font-semibold text-foreground/85">
                                {r.entries.length}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">{formatINR(totals.gross)}</TableCell>
                            <TableCell className="text-destructive">{formatINR(totals.ded)}</TableCell>
                            <TableCell className="font-semibold text-primary">{formatINR(totals.net)}</TableCell>
                            <TableCell>
                              <Badge className={`${RUN_STATUS_BADGE[r.status].base}`}>
                                {RUN_STATUS_BADGE[r.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={(ev) => ev.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/hrms/payroll/run/${r.id}`)}  title="View">
                                  <Eye size={14} />
                                </Button>
                                {(r.status === 'draft' || r.status === 'calculated') && (
                                  <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => handleCalculateRun(r)}  title={r.status === 'draft' ? 'Calculate' : 'Recalculate'}>
                                    <Zap size={14} />
                                  </Button>
                                )}
                                {r.status === 'calculated' && (
                                  <Button variant="ghost" size="icon-sm" className="hover:text-primary hover:bg-accent" onClick={() => handleApproveRun(r)}  title="Approve">
                                    <CheckCircle2 size={14} />
                                  </Button>
                                )}
                                {r.status === 'approved' && (
                                  <Button variant="ghost" size="icon-sm" className="hover:text-info hover:bg-info/10" onClick={() => handlePayRun(r)}  title="Mark Paid">
                                    <Banknote size={14} />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon-sm" onClick={() => setConfirmRegenerateRun(r)}  title="Regenerate with all active structures">
                                  <Repeat size={14} />
                                </Button>
                                <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteRun(r)}  title="Delete">
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden divide-y divide-border">
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
                            <p className="text-xs font-semibold text-foreground">{monthLabel(r.month)}</p>
                            <p className="text-[11px] text-muted-foreground/70">{r.entries.length} employees</p>
                          </div>
                          <Badge className={`shrink-0 ${RUN_STATUS_BADGE[r.status].base}`}>
                            {RUN_STATUS_BADGE[r.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="text-foreground font-semibold">{formatINR(totals.gross)}</span>
                          <span>·</span>
                          <span className="text-destructive">-{formatINR(totals.ded)}</span>
                          <span>·</span>
                          <span className="text-primary font-semibold">{formatINR(totals.net)}</span>
                        </div>
                        <div className="flex items-center gap-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/hrms/payroll/run/${r.id}`)}  title="View">
                            <Eye size={14} />
                          </Button>
                          {(r.status === 'draft' || r.status === 'calculated') && (
                            <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => handleCalculateRun(r)}  title={r.status === 'draft' ? 'Calculate' : 'Recalculate'}>
                              <Zap size={14} />
                            </Button>
                          )}
                          {r.status === 'calculated' && (
                            <Button variant="ghost" size="icon-sm" className="hover:text-primary hover:bg-accent" onClick={() => handleApproveRun(r)}  title="Approve">
                              <CheckCircle2 size={14} />
                            </Button>
                          )}
                          {r.status === 'approved' && (
                            <Button variant="ghost" size="icon-sm" className="hover:text-info hover:bg-info/10" onClick={() => handlePayRun(r)}  title="Mark Paid">
                              <Banknote size={14} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" onClick={() => setConfirmRegenerateRun(r)}  title="Regenerate">
                            <Repeat size={14} />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteRun(r)}  title="Delete">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {runFiltered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{runStartRow}</span>–
                      <span className="font-semibold text-foreground">{runEndRow}</span> of{' '}
                      <span className="font-semibold text-foreground">{runFiltered.length}</span> pay cycles
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon-sm" onClick={() => setRunPage((p) => Math.max(1, p - 1))} disabled={runPage <= 1} >
                        <ChevronLeft size={16} className="text-foreground/70" />
                      </Button>
                      <Button variant="outline" size="icon-sm" onClick={() => setRunPage((p) => Math.min(runTotalPages, p + 1))} disabled={runPage >= runTotalPages} >
                        <ChevronRight size={16} className="text-foreground/70" />
                      </Button>
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
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className={`${card.small ? 'text-sm' : 'text-lg'} font-semibold text-foreground leading-none truncate`}>
                    {card.value}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">
                    {card.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
              <Input data-search="" className="w-full pl-9 pr-4"
                type="text"
                placeholder="Search employees..."
                value={structSearch}
                onChange={(e) => setStructSearch(e.target.value)}
                
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
              <button onClick={() => { setStructSearch(''); setPayModelFilter('all'); }} className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors">
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
            {structPaged.length === 0 ? (
              <EmptyState icon={<Inbox />} title={structures.length === 0 ? 'No salary structures yet' : 'No results found'} description={structures.length === 0 ? 'Click "Add Structure" to set up an employee salary.' : 'Try adjusting your search or filters'} className="border-0" />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="uppercase whitespace-nowrap">Employee</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Role</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Pay Model</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Earnings</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Deductions</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Active</TableHead>
                        <TableHead className="uppercase whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {structPaged.map((s, i) => {
                        const rb = ROLE_BADGE[s.role] || ROLE_BADGE.staff;
                        return (
                          <motion.tr
                            key={s.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b transition-colors hover:bg-muted/70"
                          >
                            <TableCell>
                              <p className="text-xs font-semibold text-foreground">{s.employeeName}</p>
                              <p className="text-[11px] text-muted-foreground/70">Since {s.effectiveFrom}</p>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${rb.base}`}>
                                {rb.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${PAY_MODEL_BADGE[s.payModel].base}`}>
                                {PAY_MODEL_BADGE[s.payModel].label}
                              </Badge>
                            </TableCell>
                             <TableCell>
                              <span className="text-xs font-semibold text-foreground">
                                {s.payModel === 'monthly' ? (s.ctc > 0 ? `${formatINR(s.ctc)} CTC` : `${formatINR(grossMonthly(s))}/mo`) : `₹${s.shiftRate}/day`}
                              </span>
                              {s.payModel === 'monthly' && s.ctc > 0 && (
                                <p className="text-[11px] text-muted-foreground/70">Rate: {formatINR(grossMonthly(s))}/mo</p>
                              )}
                              {s.payModel === 'shift' && (
                                <p className="text-[11px] text-muted-foreground/70">OT ₹{s.overtimeRate}/hr</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-[11px] text-muted-foreground">
                                {s.deductions.pfEnabled ? `PF ${s.deductions.pfPercent}%` : ''}
                                {s.deductions.esicEnabled ? ' · ESIC' : ''}
                                {s.deductions.ptEnabled ? ` · PT ${s.deductions.pt}` : ''}
                                {s.deductions.tdsEnabled ? ` · TDS ${s.deductions.tds}` : ''}
                              </p>
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => toggleActive(s)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border
                                  ${s.active ? 'bg-accent text-accent-foreground border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20'
                                            : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-accent hover:text-accent-foreground hover:border-primary/20'}`}
                              >
                                {s.active ? 'Active' : 'Inactive'}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Button variant="soft" size="xs" className="bg-info/10 text-info hover:bg-info/15 border-info/25" onClick={() => openHistory(s)}  title="View Salary Revision History">
                                  <Clock size={12} /> History
                                </Button>
                                <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => openEdit(s)}  title="Edit Structure">
                                  <Pen size={14} />
                                </Button>
                                <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteStruct(s)}  title="Delete Structure">
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden divide-y divide-border">
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
                            <p className="text-xs font-semibold text-foreground">{s.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-1">
                              <Badge className={`mr-1 ${rb.base}`}>{rb.label}</Badge>
                              <Badge className={`${PAY_MODEL_BADGE[s.payModel].base}`}>{PAY_MODEL_BADGE[s.payModel].label}</Badge>
                            </p>
                          </div>
                          <button
                            onClick={() => toggleActive(s)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border
                              ${s.active ? 'bg-accent text-accent-foreground border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                          >
                            {s.active ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">
                            {s.payModel === 'monthly' ? formatINR(grossMonthly(s)) + '/mo' : '₹' + s.shiftRate + '/day'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Button variant="soft" size="xs" className="bg-info/10 text-info hover:bg-info/15 border-info/25" onClick={() => openHistory(s)}  title="History">
                              <Clock size={12} /> History
                            </Button>
                            <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" onClick={() => openEdit(s)}  title="Edit">
                              <Pen size={14} />
                            </Button>
                            <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteStruct(s)}  title="Delete">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {structFiltered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{structStartRow}</span>–
                      <span className="font-semibold text-foreground">{structEndRow}</span> of{' '}
                      <span className="font-semibold text-foreground">{structFiltered.length}</span> structures
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon-sm" onClick={() => setStructPage((p) => Math.max(1, p - 1))} disabled={structPage <= 1} >
                        <ChevronLeft size={16} className="text-foreground/70" />
                      </Button>
                      <Button variant="outline" size="icon-sm" onClick={() => setStructPage((p) => Math.min(structTotalPages, p + 1))} disabled={structPage >= structTotalPages} >
                        <ChevronRight size={16} className="text-foreground/70" />
                      </Button>
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
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] p-6 space-y-6"
        >
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 size={15} />Company</h2>
            <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">Shown on payslips and payment records</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company Name">
              <Input  value={settings.companyName} onChange={(e) => setSetting('companyName', e.target.value)} />
            </Field>
            <Field label="Company Address">
              <Input  value={settings.companyAddress} onChange={(e) => setSetting('companyAddress', e.target.value)} />
            </Field>
            <Field label="PF Number">
              <Input  value={settings.pfNumber} onChange={(e) => setSetting('pfNumber', e.target.value)} />
            </Field>
            <Field label="ESIC Number">
              <Input  value={settings.esicNumber} onChange={(e) => setSetting('esicNumber', e.target.value)} />
            </Field>
            <Field label="PAN Number">
              <Input  value={settings.panNumber} onChange={(e) => setSetting('panNumber', e.target.value)} />
            </Field>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground">Default Deductions</h2>
            <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">Used when creating new salary structures</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="PF %">
              <Input type="number"  value={settings.defaultPfPercent} onChange={(e) => setSetting('defaultPfPercent', num(e.target.value))} />
            </Field>
            <Field label="ESIC %">
              <Input type="number"  value={settings.defaultEsicPercent} onChange={(e) => setSetting('defaultEsicPercent', num(e.target.value))} />
            </Field>
            <Field label="ESIC Cap (₹)">
              <Input type="number"  value={settings.defaultEsicCap} onChange={(e) => setSetting('defaultEsicCap', num(e.target.value))} />
            </Field>
            <Field label="PT (₹)">
              <Input type="number"  value={settings.defaultPt} onChange={(e) => setSetting('defaultPt', num(e.target.value))} />
            </Field>
            <Field label="Default TDS (₹)">
              <Input type="number"  value={settings.defaultTds} onChange={(e) => setSetting('defaultTds', num(e.target.value))} />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button variant="dark" size="sm" type="submit" >
              <Save size={14} />Save Settings
            </Button>
          </div>
        </motion.form>
      )}

      {genOpen && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setGenOpen(false))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Generate Payroll Run</h3>
              <button type="button" onClick={() => setGenOpen(false)} className="text-muted-foreground/70 hover:text-foreground/70 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-4">
              <Field label="Pay Period">
                <Input
                  type="month"
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  
                />
              </Field>
              <p className="text-[11px] text-muted-foreground/70">
                Creates a draft run for {activeCount(structures)} active employee(s). Click Calculate to pull attendance days, late penalties, and overtime.
              </p>
              <Button variant="dark" size="lg" className="w-full"
                type="submit"
                
              >
                <Zap size={16} />Generate Run
              </Button>
            </form>
          </DialogContent>
</Dialog>
      )}

      {structOpen && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setStructOpen(false))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-2xl overflow-hidden max-h-[90dvh] flex flex-col">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-foreground">{editingId ? 'Edit Salary Structure' : 'Add Salary Structure'}</h3>
              <button type="button" onClick={() => setStructOpen(false)} className="text-muted-foreground/70 hover:text-foreground/70 transition-colors">
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
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span>Role (Auto-fetched):</span>
                    <Badge className={`${ROLE_BADGE[form.role]?.base || 'bg-secondary text-foreground/85'}`}>
                      {ROLE_BADGE[form.role]?.label || form.role}
                    </Badge>
                  </div>
                )}
              </div>

              <Field label="Pay Model">
                <Segmented className="w-fit" value={String(form.payModel)} onValueChange={(v) => { ({ ['monthly']: (() => setForm({ ...form, payModel: 'monthly' })), ['shift']: (() => setForm({ ...form, payModel: 'shift' })) } as Record<string, () => void>)[v]?.(); }} options={[
  { value: 'monthly', label: <>Monthly Salary</> },
  { value: 'shift', label: <>Shift / Daily</> }
]} />
              </Field>

              {form.payModel === 'monthly' ? (
                <div className="space-y-4">
                  <div className="bg-accent/70 border border-primary/20 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-accent-foreground flex items-center gap-1.5">
                        <Zap size={14} className="text-primary" />
                        CTC Auto-Breakdown Calculator
                      </span>
                      <span className="text-[11px] font-medium text-accent-foreground">Auto-populates 60% Basic, 30% HRA, 20% Conveyance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₹</span>
                        <Input
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

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Earnings (Editable)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="Basic">
                      <Input type="number"  value={form.basic} onChange={(e) => setForm({ ...form, basic: e.target.value })} />
                    </Field>
                    <Field label="HRA">
                      <Input type="number"  value={form.hra} onChange={(e) => setForm({ ...form, hra: e.target.value })} />
                    </Field>
                    <Field label="Conveyance">
                      <Input type="number"  value={form.conveyance} onChange={(e) => setForm({ ...form, conveyance: e.target.value })} />
                    </Field>
                    <Field label="Special Allowance">
                      <Input type="number"  value={form.specialAllowance} onChange={(e) => setForm({ ...form, specialAllowance: e.target.value })} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shift Rates (₹)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Shift Rate / day">
                      <Input type="number"  value={form.shiftRate} onChange={(e) => setForm({ ...form, shiftRate: e.target.value })} />
                    </Field>
                    <Field label="Overtime Rate / hr">
                      <Input type="number"  value={form.overtimeRate} onChange={(e) => setForm({ ...form, overtimeRate: e.target.value })} />
                    </Field>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Deductions</p>
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
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${form[key] ? 'bg-accent text-accent-foreground border-primary/20' : 'bg-muted text-muted-foreground/70 border-border'}`}
                      >
                        <CheckCircle2 size={11} />{label}
                      </button>
                      <div className="flex items-center gap-3">
                        {key === 'pfEnabled' && (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/85">%</span>
                            <Input type="number" className={`${inputClass} w-20 pl-8`} value={form.pfPercent} onChange={(e) => setForm({ ...form, pfPercent: e.target.value })} />
                          </div>
                        )}
                        {key === 'esicEnabled' && (
                          <>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/85">%</span>
                              <Input type="number" className={`${inputClass} w-20 pl-8`} value={form.esicPercent} onChange={(e) => setForm({ ...form, esicPercent: e.target.value })} />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/85">₹</span>
                              <Input type="number" className={`${inputClass} w-24 pl-8`} value={form.esicCap} onChange={(e) => setForm({ ...form, esicCap: e.target.value })} />
                            </div>
                          </>
                        )}
                        {key === 'ptEnabled' && (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/85">₹</span>
                            <Input type="number" className={`${inputClass} w-20 pl-8`} value={form.pt} onChange={(e) => setForm({ ...form, pt: e.target.value })} />
                          </div>
                        )}
                        {key === 'tdsEnabled' && (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/85">₹</span>
                            <Input type="number" className={`${inputClass} w-20 pl-8`} value={form.tds} onChange={(e) => setForm({ ...form, tds: e.target.value })} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="dark" size="lg" className="w-full"
                type="submit"
                disabled={!form.userId}
                
              >
                <Save size={16} />{editingId ? 'Update Structure' : 'Create Structure'}
              </Button>
            </form>
          </DialogContent>
</Dialog>
      )}

      {confirmDeleteRun && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5">
              <h3 className="font-semibold text-foreground mb-1">Delete run?</h3>
              <p className="text-xs text-muted-foreground">
                Permanently removes {monthLabel(confirmDeleteRun.month)}
                {confirmDeleteRun.status === 'paid' || confirmDeleteRun.status === 'approved'
                  ? ` (currently ${confirmDeleteRun.status})`
                  : ''}
                . You can Generate Run again for that month afterward.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmDeleteRun(null)} >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteRun} >
                Delete
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}

      {confirmRegenerateRun && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5">
              <h3 className="font-semibold text-foreground mb-1">Regenerate run?</h3>
              <p className="text-xs text-muted-foreground">
                Rebuilds {monthLabel(confirmRegenerateRun.month)} from all active salary structures
                ({activeCount(structures)} employees), resets to draft, and replaces existing entries.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmRegenerateRun(null)} >
                Cancel
              </Button>
              <Button size="sm" className="flex-1 bg-violet-600 text-white hover:bg-violet-700 hover:text-white" onClick={handleRegenerateRun} >
                Regenerate
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}

      {confirmDeleteStruct && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-sm overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5">
              <h3 className="font-semibold text-foreground mb-1">Delete structure?</h3>
              <p className="text-xs text-muted-foreground">This removes the salary structure for {confirmDeleteStruct.employeeName}. Existing runs keep their snapshots.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmDeleteStruct(null)} >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteStruct} >
                Delete
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}

      {historyUser && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Salary Structure History</h3>
                <p className="text-xs text-muted-foreground font-medium">Revisions & audit trail for {historyUser.name}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setHistoryUser(null)} >
                <X size={16} />
              </Button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10 text-xs font-medium text-muted-foreground gap-2">
                  <Loader2 size={16} className="animate-spin" /> Loading revision history...
                </div>
              ) : historyList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No historical structures recorded for this employee.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                  {historyList.map((st, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={`${st.id}-${idx}`} className="relative pl-8">
                        <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 bg-card ${isLatest ? 'border-primary/30 bg-primary' : 'border-input'}`} />
                        <div className="bg-muted border border-border rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`${isLatest ? 'bg-primary/15 text-accent-foreground' : 'bg-border text-foreground/70'}`}>
                                {isLatest ? 'Current Revision' : `Revision #${historyList.length - idx}`}
                              </Badge>
                              <span className="text-xs font-semibold text-foreground/85">Effective {st.effectiveFrom}</span>
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {st.payModel === 'monthly' ? (st.ctc ? `${formatINR(st.ctc)} CTC` : `${formatINR(grossMonthly(st))}/mo`) : `₹${st.shiftRate}/day`}
                            </span>
                          </div>

                          {st.payModel === 'monthly' && (
                            <Card className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5" >
                              <div><span className="text-muted-foreground/70 block text-[11px] uppercase font-semibold">Basic</span><span className="font-semibold text-foreground">{formatINR(st.monthly.basic)}</span></div>
                              <div><span className="text-muted-foreground/70 block text-[11px] uppercase font-semibold">HRA</span><span className="font-semibold text-foreground">{formatINR(st.monthly.hra)}</span></div>
                              <div><span className="text-muted-foreground/70 block text-[11px] uppercase font-semibold">Conveyance</span><span className="font-semibold text-foreground">{formatINR(st.monthly.conveyance)}</span></div>
                              <div><span className="text-muted-foreground/70 block text-[11px] uppercase font-semibold">Special</span><span className="font-semibold text-foreground">{formatINR(st.monthly.specialAllowance)}</span></div>
                            </Card>
                          )}

                          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
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
            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="dark" size="sm" onClick={() => setHistoryUser(null)} >
                Close
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}

function activeCount(structures: SalaryStructure[]) {
  return structures.filter((s) => s.active).length;
}
