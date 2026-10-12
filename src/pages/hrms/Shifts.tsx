import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, Settings as SettingsIcon, Calendar, Users, Plus, X, Save, Trash2,
  Edit2, CheckCircle2, Search, Loader2, Copy, CalendarOff,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, XCircle, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import type { ShiftType, ShiftSettings } from '../../lib/api';
import { DEFAULT_SHIFT_SETTINGS } from '../../lib/api';
import SearchableSelect from '../../components/SearchableSelect';
import {
  listShiftTypes,
  createShiftType,
  updateShiftType,
  deleteShiftType,
  getHrmsSettings,
  updateHrmsSettings,
} from '../../lib/hrmsShifts';

import Modal from '../../components/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, fieldClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import KpiStrip from '@/components/KpiStrip';
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/85 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70 mt-1">{hint}</p>}
    </div>
  );
}

const inputClassName = fieldClass;

function ToggleSwitch({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-foreground' : 'bg-input'}  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform shadow-[0_1px_2px_rgb(0_0_0/0.03)] ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function formatTimeDiff(start: string, end: string): string {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let mins = (eH * 60 + eM) - (sH * 60 + sM);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 || m > 0 ? `${h}h ${m}m` : '0h';
}

export default function Shifts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser, token } = useAuth();

  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'settings' || tabParam === 'shifts' || tabParam === 'types')
    ? (tabParam === 'settings' ? 'settings' : 'shifts')
    : 'shifts';

  const [activeTab, setActiveTabState] = useState<'settings' | 'shifts'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'settings' || t === 'shifts' || t === 'types') {
      setActiveTabState(t === 'settings' ? 'settings' : 'shifts');
    }
  }, [searchParams]);

  const setActiveTab = (tab: 'settings' | 'shifts') => {
    setActiveTabState(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab === 'shifts' ? 'types' : tab);
      return next;
    });
  };

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [settings, setSettings] = useState<ShiftSettings>({ ...DEFAULT_SHIFT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [types, sett] = await Promise.all([
        listShiftTypes(token),
        getHrmsSettings(token),
      ]);
      setShiftTypes(types);
      setSettings(sett);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

  const tabs = [
    { key: 'shifts' as const, label: 'Shift Types', icon: Clock },
    { key: 'settings' as const, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-foreground text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-primary" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader title="Shifts" description="Shift types, attendance rules and schedule assignments" actions={<>
<Button variant="outline" size="sm" className="self-start sm:self-auto" onClick={() => navigate('/hrms/shifts/assign')}
          >
          <Calendar size={14} /> Schedule Assignment
        </Button>
</>} />

      <Segmented className="w-fit" value={String(activeTab)} onValueChange={(v) => setActiveTab(v as never)} options={tabs.map((tab) => ({ value: String(tab.key), label: <><tab.icon size={13} />
            {tab.label}</> }))} />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground/70 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading shifts…
        </div>
      ) : (
        <>
          {activeTab === 'shifts' && (
            <ShiftTypesTab
              token={token || ''}
              shiftTypes={shiftTypes}
              setShiftTypes={setShiftTypes}
              settings={settings}
              setSettings={setSettings}
              canManage={canManage}
              showToast={showToast}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              token={token || ''}
              settings={settings}
              setSettings={setSettings}
              shiftTypes={shiftTypes}
              canManage={canManage}
              showToast={showToast}
            />
          )}
        </>
      )}
    </div>
  );
}

function ShiftTypesTab({ token, shiftTypes, setShiftTypes, settings, setSettings, canManage, showToast }: {
  token: string;
  shiftTypes: ShiftType[];
  setShiftTypes: React.Dispatch<React.SetStateAction<ShiftType[]>>;
  settings: ShiftSettings;
  setSettings: React.Dispatch<React.SetStateAction<ShiftSettings>>;
  canManage: boolean;
  showToast: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState<ShiftType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<'name' | 'start_time'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const activeCount = shiftTypes.filter(s => s.is_active).length;
  const hasFilters = searchQuery || statusFilter !== 'all';

  const filtered = useMemo(() => {
    let result = shiftTypes.filter(s => {
      if (statusFilter === 'active' && !s.is_active) return false;
      if (statusFilter === 'inactive' && s.is_active) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      const cmp = sortField === 'name'
        ? a.name.localeCompare(b.name)
        : a.start_time.localeCompare(b.start_time);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [shiftTypes, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, sortField, sortDir]);

  const toggleSort = (key: 'name' | 'start_time') => {
    if (sortField === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(key); setSortDir('asc'); }
  };

  const handleDelete = async (s: ShiftType) => {
    if (!token) return;
    try {
      await deleteShiftType(token, s.id);
      setShiftTypes(prev => prev.filter(x => x.id !== s.id));
      setSettings(prev => ({
        ...prev,
        overtimeShiftTypeIds: prev.overtimeShiftTypeIds.filter(id => id !== s.id),
        defaultShiftTypeId: prev.defaultShiftTypeId === s.id ? null : prev.defaultShiftTypeId,
      }));
      setDeleteConfirm(null);
      showToast('Shift type deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggleActive = async (s: ShiftType) => {
    if (!token || !canManage) return;
    try {
      const updated = await updateShiftType(token, s.id, { is_active: !s.is_active });
      setShiftTypes(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDuplicate = async (s: ShiftType) => {
    if (!token || !canManage) return;
    try {
      const created = await createShiftType(token, {
        name: `${s.name} (Copy)`,
        start_time: s.start_time,
        end_time: s.end_time,
        break_start: s.break_start || null,
        break_end: s.break_end || null,
        is_active: s.is_active,
        late_grace_enabled: s.late_grace_enabled ?? true,
        late_grace_minutes: s.late_grace_minutes ?? 15,
        late_penalty_amount: s.late_penalty_amount ?? 100,
        half_day_after_minutes: s.half_day_after_minutes ?? 30,
        overtime_enabled: s.overtime_enabled ?? false,
        overtime_after_minutes: s.overtime_after_minutes ?? 15,
        overtime_rate: s.overtime_rate ?? s.overtime_rate_per_hour ?? 0,
        overtime_rate_per_hour: s.overtime_rate ?? s.overtime_rate_per_hour ?? 0,
      });
      setShiftTypes(prev => [...prev, created]);
      showToast('Shift duplicated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Shift Types</h2>
          <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">Shift types, attendance rules and overtime tracking</p>
        </div>
        {canManage && (
          <Button variant="dark" size="sm" className="self-start sm:self-auto" onClick={() => navigate('/hrms/shifts/new')} >
            <Plus size={14} /> New Shift
          </Button>
        )}
      </div>

      <KpiStrip items={[
  { label: 'Total Shifts', value: shiftTypes.length },
  { label: 'Active', value: activeCount },
  { label: 'Inactive', value: shiftTypes.length - activeCount },
]} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search by shift name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            
          />
        </div>
        <div className="w-[160px]">
          <SearchableSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="Status"
          />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors">
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
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => toggleSort('name')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                  <span className="flex items-center gap-1">Shift{sortField !== 'name' ? <ArrowUpDown size={12} className="text-muted-foreground/50" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />}</span>
                </TableHead>
                <TableHead onClick={() => toggleSort('start_time')} className="uppercase whitespace-nowrap cursor-pointer hover:text-foreground/70 select-none">
                  <span className="flex items-center gap-1">Time{sortField !== 'start_time' ? <ArrowUpDown size={12} className="text-muted-foreground/50" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />}</span>
                </TableHead>
                <TableHead className="uppercase whitespace-nowrap">Break</TableHead>
                <TableHead className="uppercase whitespace-nowrap">Hours</TableHead>
                <TableHead className="uppercase whitespace-nowrap">Status</TableHead>
                {canManage && <TableHead className="uppercase whitespace-nowrap">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(s => (
                <TableRow key={s.id} className="">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{s.name}</span>
                      {Boolean(s.overtime_enabled) && (
                        <Badge className="text-violet-600 bg-violet-50 border-violet-200" >OT</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground/70">{s.start_time} — {s.end_time}</TableCell>
                  <TableCell className="text-foreground/70">{s.break_start && s.break_end ? `${s.break_start} — ${s.break_end}` : '—'}</TableCell>
                  <TableCell className="text-foreground/70 font-medium">{formatTimeDiff(s.start_time, s.end_time)}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(s)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all border ${s.is_active ? 'bg-accent text-accent-foreground border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {s.is_active ? <><CheckCircle2 size={10} />Active</> : 'Inactive'}
                    </button>
                  </TableCell>
                  {canManage && (
                    <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => handleDuplicate(s)}><Copy /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(`/hrms/shifts/edit/${s.id}`)}><Edit2 /> Edit</DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => setDeleteConfirm(s)}><Trash2 /> Delete</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                  )}
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground/70">No shift types found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {paginated.map(s => (
            <div key={s.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    {Boolean(s.overtime_enabled) && (
                      <Badge className="text-violet-600 bg-violet-50 border-violet-200" >OT</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.start_time} — {s.end_time}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/hrms/shifts/edit/${s.id}`)} ><Edit2 size={16} /></Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => setDeleteConfirm(s)} ><Trash2 size={16} /></Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Break: {s.break_start && s.break_end ? `${s.break_start} — ${s.break_end}` : 'None'}</span>
                <Badge className={`${s.is_active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
            <p className="text-xs text-muted-foreground">
              {filtered.length > 0
                ? `Showing ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`
                : 'No results'}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                >
                <ChevronLeft size={16} />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${p === page ? 'bg-secondary text-foreground border border-input' : 'text-muted-foreground hover:bg-secondary'}`}>
                  {p}
                </button>
              ))}
              <Button variant="ghost" size="icon-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {deleteConfirm && (
        <Modal title="Delete Shift Type" onClose={() => setDeleteConfirm(null)}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This may affect existing assignments.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)} >Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)} >
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SettingsTab({ token, settings, setSettings, shiftTypes, canManage, showToast }: {
  token: string;
  settings: ShiftSettings;
  setSettings: React.Dispatch<React.SetStateAction<ShiftSettings>>;
  shiftTypes: ShiftType[];
  canManage: boolean;
  showToast: (msg: string) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(settings); }, [settings]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateHrmsSettings(token, draft);
      setSettings(updated);
      showToast('Attendance settings saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden" >
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock size={18} /> Check-In / Check-Out Rules</h3>
            <p className="text-xs text-muted-foreground/70 mt-1">Configure how attendance is determined from biometric scans</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Late Entry Grace Period (min)" hint="Default for new shifts — minutes after start before marking late">
                <Input type="number" min="0" max="180" value={draft.lateEntryGraceMinutes}
                  onChange={e => setDraft(s => ({ ...s, lateEntryGraceMinutes: parseInt(e.target.value) || 0 }))}
                  disabled={!canManage}  />
              </Field>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Begin Check-In Before Shift Start</p>
                <p className="text-xs text-muted-foreground/70">Allow employees to check in before their shift start time</p>
              </div>
              <ToggleSwitch enabled={draft.beginCheckInBeforeShiftStart}
                onToggle={() => canManage && setDraft(s => ({ ...s, beginCheckInBeforeShiftStart: !s.beginCheckInBeforeShiftStart }))} disabled={!canManage} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Overtime Calculation</p>
                <p className="text-xs text-muted-foreground/70">Enable overtime tracking globally</p>
              </div>
              <ToggleSwitch enabled={draft.overtimeCalculation}
                onToggle={() => canManage && setDraft(s => ({ ...s, overtimeCalculation: !s.overtimeCalculation }))} disabled={!canManage} />
            </div>
            <Field label="Default Shift Type" hint="Used when staff has no active assignment">
              <SearchableSelect
                value={draft.defaultShiftTypeId != null ? String(draft.defaultShiftTypeId) : ''}
                onChange={v => setDraft(s => ({ ...s, defaultShiftTypeId: v ? parseInt(v, 10) : null }))}
                placeholder="No default shift"
                disabled={!canManage}
                options={shiftTypes.filter(st => st.is_active).map(st => ({
                  value: String(st.id),
                  label: `${st.name} (${st.start_time} - ${st.end_time})`,
                }))}
              />
            </Field>
          </div>
        </Card>

        <Card className="overflow-hidden" >
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Users size={18} /> Attendance Thresholds</h3>
            <p className="text-xs text-muted-foreground/70 mt-1">Define when employees are marked as half-day or absent</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Half Day Threshold (hours)" hint="Work below this many hours = half day">
                <Input type="number" min="0" max="12" step="0.5" value={draft.halfDayThresholdHours}
                  onChange={e => setDraft(s => ({ ...s, halfDayThresholdHours: parseFloat(e.target.value) || 0 }))}
                  disabled={!canManage}  />
              </Field>
              <Field label="Absent Threshold (hours)" hint="Work below this many hours = absent">
                <Input type="number" min="0" max="12" step="0.5" value={draft.absentThresholdHours}
                  onChange={e => setDraft(s => ({ ...s, absentThresholdHours: parseFloat(e.target.value) || 0 }))}
                  disabled={!canManage}  />
              </Field>
            </div>
            <div className="bg-muted border border-border rounded-xl p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                <strong>Status Logic:</strong>
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Worked below <strong className="text-foreground/85">{draft.absentThresholdHours}h</strong> → <span className="text-destructive font-medium">Absent</span></p>
                <p>• Worked below <strong className="text-foreground/85">{draft.halfDayThresholdHours}h</strong> → <span className="text-info font-medium">Half Day</span></p>
                <p>• Checked in after shift start + <strong className="text-foreground/85">{draft.lateEntryGraceMinutes}min</strong> grace → <span className="text-warning font-medium">Late</span> (per-shift rules override this)</p>
                <p>• Worked full required hours → <span className="text-primary font-medium">Present</span></p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button variant="dark" onClick={handleSave} disabled={saving}
            >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Settings</>}
          </Button>
        </div>
      )}
    </div>
  );
}
