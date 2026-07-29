import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, Settings as SettingsIcon, Calendar, Users, Plus, X, Save, Trash2,
  Edit2, CheckCircle2, Search, ChevronDown, Loader2, MapPin, ToggleLeft,
  ToggleRight, CalendarDays, ArrowRightLeft, Eye, EyeOff, Copy, Filter,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import type {
  ShiftType, ShiftAssignment, ShiftSettings,
} from '../../lib/api';
import {
  DEFAULT_SHIFT_SETTINGS,
  DAY_LABELS, ALL_DAYS, WORKING_DAYS_DEFAULT, LOCATION_OPTIONS,
  STATUS_COLORS, SCHEDULE_TYPE_LABELS,
} from '../../lib/api';
import SearchableSelect from '../../components/SearchableSelect';

const LS_KEYS = {
  shiftTypes: 'hrms_shift_types',
  assignments: 'hrms_shift_assignments',
  settings: 'hrms_shift_settings',
};

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveLS(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

let _idSeq = 1000;
function nextId() { return ++_idSeq; }

const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 1, name: 'Morning', start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '13:30', color: '', is_active: true },
  { id: 2, name: 'Evening', start_time: '13:00', end_time: '21:00', break_start: '17:00', break_end: '17:30', color: '', is_active: true },
  { id: 3, name: 'Night', start_time: '21:00', end_time: '05:00', break_start: '01:00', break_end: '01:30', color: '', is_active: true },
  { id: 4, name: 'Half Day', start_time: '09:00', end_time: '13:00', break_start: '', break_end: '', color: '', is_active: true },
];

function Modal({ title, onClose, children, closeOnBackdropClick = true, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; closeOnBackdropClick?: boolean; wide?: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { if (closeOnBackdropClick) onClose(); else e.preventDefault(); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
      onClick={closeOnBackdropClick ? onClose : undefined} onKeyDown={handleKeyDown} role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-xl overflow-hidden ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputClassName = "w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all";

function ToggleSwitch({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-600' : 'bg-zinc-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
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

function calcTotalHours(start: string, end: string, breakStart: string, breakEnd: string): number {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let totalMins = (eH * 60 + eM) - (sH * 60 + sM);
  if (totalMins < 0) totalMins += 24 * 60;
  if (breakStart && breakEnd) {
    const [bsH, bsM] = breakStart.split(':').map(Number);
    const [beH, beM] = breakEnd.split(':').map(Number);
    let breakMins = (beH * 60 + beM) - (bsH * 60 + bsM);
    if (breakMins < 0) breakMins += 24 * 60;
    totalMins -= breakMins;
  }
  return Math.round((totalMins / 60) * 10) / 10;
}

export default function Shifts() {
  const { user: currentUser, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'shifts' | 'assignments'>('shifts');

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(() => loadLS(LS_KEYS.shiftTypes, DEFAULT_SHIFT_TYPES));
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(() => loadLS(LS_KEYS.assignments, []));
  const [settings, setSettings] = useState<ShiftSettings>(() => ({ ...DEFAULT_SHIFT_SETTINGS, ...loadLS(LS_KEYS.settings, {}) }));

  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => { loadStaff(); }, [token]);
  useEffect(() => { saveLS(LS_KEYS.shiftTypes, shiftTypes); }, [shiftTypes]);
  useEffect(() => { saveLS(LS_KEYS.assignments, assignments); }, [assignments]);
  useEffect(() => { saveLS(LS_KEYS.settings, settings); }, [settings]);

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      if (token) {
        const data = await getUsers(token);
        setAllStaff(data.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email.split('@')[0],
          email: u.email,
          role: mapBackendRoleToFrontend(u.role_codes),
        })));
      }
    } catch { setAllStaff([]); }
    finally { setStaffLoading(false); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const tabs = [
    { key: 'shifts' as const, label: 'Shift Types', icon: Clock },
    { key: 'settings' as const, label: 'Settings', icon: SettingsIcon },
    { key: 'assignments' as const, label: 'Schedule Assignment', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-zinc-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Shifts</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage shift types, attendance rules, and schedule assignments</p>
      </div>

      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}>
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'shifts' && (
        <ShiftTypesTab shiftTypes={shiftTypes} setShiftTypes={setShiftTypes} settings={settings} setSettings={setSettings} canManage={canManage} showToast={showToast} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab settings={settings} setSettings={setSettings} shiftTypes={shiftTypes} canManage={canManage} showToast={showToast} />
      )}
      {activeTab === 'assignments' && (
        <AssignmentsTab assignments={assignments} setAssignments={setAssignments} shiftTypes={shiftTypes}
          allStaff={allStaff} staffLoading={staffLoading} canManage={canManage} showToast={showToast} search={search} setSearch={setSearch} />
      )}
    </div>
  );
}

function ShiftTypesTab({ shiftTypes, setShiftTypes, settings, setSettings, canManage, showToast }: {
  shiftTypes: ShiftType[];
  setShiftTypes: React.Dispatch<React.SetStateAction<ShiftType[]>>;
  settings: ShiftSettings;
  setSettings: React.Dispatch<React.SetStateAction<ShiftSettings>>;
  canManage: boolean;
  showToast: (msg: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShiftType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ShiftType | null>(null);
  const [form, setForm] = useState({ name: '', start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '13:30', enableOvertime: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'start_time' | 'hours'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const activeCount = shiftTypes.filter(s => s.is_active).length;

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
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'start_time') cmp = a.start_time.localeCompare(b.start_time);
      else cmp = formatTimeDiff(a.start_time, a.end_time).localeCompare(formatTimeDiff(b.start_time, b.end_time));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [shiftTypes, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, sortField, sortDir]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '13:30', enableOvertime: settings.overtimeCalculation });
    setShowModal(true);
  };

  const openEdit = (s: ShiftType) => {
    setEditing(s);
    setForm({ name: s.name, start_time: s.start_time, end_time: s.end_time, break_start: s.break_start || '', break_end: s.break_end || '', enableOvertime: settings.overtimeShiftTypeIds.includes(s.id) });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Shift name is required'); return; }
    if (editing) {
      setShiftTypes(prev => prev.map(s => s.id === editing.id ? { ...s, name: form.name, start_time: form.start_time, end_time: form.end_time, break_start: form.break_start, break_end: form.break_end } : s));
      setSettings(prev => ({
        ...prev,
        overtimeShiftTypeIds: form.enableOvertime
          ? (prev.overtimeShiftTypeIds.includes(editing.id) ? prev.overtimeShiftTypeIds : [...prev.overtimeShiftTypeIds, editing.id])
          : prev.overtimeShiftTypeIds.filter(id => id !== editing.id),
      }));
      showToast('Shift type updated');
    } else {
      const newId = nextId();
      setShiftTypes(prev => [...prev, { id: newId, name: form.name, start_time: form.start_time, end_time: form.end_time, break_start: form.break_start, break_end: form.break_end, color: '', is_active: true }]);
      if (form.enableOvertime) {
        setSettings(prev => ({ ...prev, overtimeShiftTypeIds: [...prev.overtimeShiftTypeIds, newId] }));
      }
      showToast('Shift type created');
    }
    setShowModal(false);
  };

  const handleDelete = (s: ShiftType) => {
    setShiftTypes(prev => prev.filter(x => x.id !== s.id));
    setSettings(prev => ({ ...prev, overtimeShiftTypeIds: prev.overtimeShiftTypeIds.filter(id => id !== s.id) }));
    setDeleteConfirm(null);
    showToast('Shift type deleted');
  };

  const handleToggleActive = (s: ShiftType) => {
    setShiftTypes(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  };

  const handleDuplicate = (s: ShiftType) => {
    const newId = nextId();
    setShiftTypes(prev => [...prev, { ...s, id: newId, name: `${s.name} (Copy)` }]);
    if (settings.overtimeShiftTypeIds.includes(s.id)) {
      setSettings(prev => ({ ...prev, overtimeShiftTypeIds: [...prev.overtimeShiftTypeIds, newId] }));
    }
    showToast('Shift duplicated');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="grid grid-cols-3 gap-3 flex-1">
          {[
            { label: 'Total Shifts', value: shiftTypes.length, color: 'bg-blue-50 text-blue-600' },
            { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Inactive', value: shiftTypes.length - activeCount, color: 'bg-zinc-100 text-zinc-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Clock size={18} />
              </div>
              <div>
                <p className="text-lg font-extrabold text-zinc-900 leading-none">{stat.value}</p>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
        {canManage && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shrink-0 mt-1">
            <Plus size={16} /> New Shift
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by shift name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300" />
        </div>
        <div className="relative">
          <button onClick={() => setShowStatusFilter(!showStatusFilter)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${statusFilter !== 'all' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
            <Filter size={14} />
            <span className="hidden sm:inline">{statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
          </button>
          {showStatusFilter && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 z-20">
              {[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map(opt => (
                <button key={opt.value} onClick={() => { setStatusFilter(opt.value as any); setShowStatusFilter(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${statusFilter === opt.value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => {
            if (sortField === 'name') {
              setSortField('start_time');
              setSortDir('asc');
            } else if (sortField === 'start_time') {
              setSortField('hours');
              setSortDir('asc');
            } else {
              setSortField('name');
              setSortDir('asc');
            }
          }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all">
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">{sortField === 'name' ? 'Name' : sortField === 'start_time' ? 'Time' : 'Hours'}</span>
          </button>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700">
            {sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Shift</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Time</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Break</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Hours</th>
                <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Status</th>
                {canManage && <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.map(s => (
                <tr key={s.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{s.name}</span>
                      {settings.overtimeShiftTypeIds.includes(s.id) && (
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">OT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-600">{s.start_time} — {s.end_time}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-600">{s.break_start && s.break_end ? `${s.break_start} — ${s.break_end}` : '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-600 font-medium">{formatTimeDiff(s.start_time, s.end_time)}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => handleToggleActive(s)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border ${s.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                      {s.is_active ? <><CheckCircle2 size={10} />Active</> : 'Inactive'}
                    </button>
                  </td>
                  {canManage && (
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDuplicate(s)} title="Duplicate"
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><Copy size={14} /></button>
                        <button onClick={() => openEdit(s)} title="Edit"
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteConfirm(s)} title="Delete"
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-400">No shift types found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-zinc-50">
          {paginated.map(s => (
            <div key={s.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{s.name}</p>
                    {settings.overtimeShiftTypeIds.includes(s.id) && (
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">OT</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{s.start_time} — {s.end_time}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(s)} className="p-2 text-zinc-400 hover:text-zinc-700"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteConfirm(s)} className="p-2 text-zinc-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-zinc-500">Break: {s.break_start && s.break_end ? `${s.break_start} — ${s.break_end}` : 'None'}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl px-4 py-3 shadow-sm">
        <p className="text-xs text-zinc-500">
          {filtered.length > 0
            ? `Showing ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`
            : 'No results'}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Shift Type' : 'New Shift Type'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <Field label="Shift Name">
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Morning, Night" className={inputClassName} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time">
                <input type="time" required value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={inputClassName} />
              </Field>
              <Field label="End Time">
                <input type="time" required value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={inputClassName} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Break Start" hint="Optional">
                <input type="time" value={form.break_start} onChange={e => setForm(f => ({ ...f, break_start: e.target.value }))} className={inputClassName} />
              </Field>
              <Field label="Break End" hint="Optional">
                <input type="time" value={form.break_end} onChange={e => setForm(f => ({ ...f, break_end: e.target.value }))} className={inputClassName} />
              </Field>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-zinc-700 font-medium">Total Working Hours</span>
              <span className="text-sm font-bold text-zinc-900">
                {formatTimeDiff(form.start_time, form.end_time)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">Enable Overtime</p>
                <p className="text-xs text-zinc-400">Track overtime hours for this shift type</p>
              </div>
              <ToggleSwitch enabled={form.enableOvertime}
                onToggle={() => canManage && setForm(f => ({ ...f, enableOvertime: !f.enableOvertime }))} disabled={!canManage || !settings.overtimeCalculation} />
            </div>
            {!settings.overtimeCalculation && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">Overtime is disabled globally. Enable it in <strong>Settings → Overtime</strong> first.</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Save size={16} /> {editing ? 'Save Changes' : 'Create Shift'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Shift Type" onClose={() => setDeleteConfirm(null)}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-zinc-500">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This may affect existing assignments.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 transition-colors text-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SettingsTab({ settings, setSettings, shiftTypes, canManage, showToast }: {
  settings: ShiftSettings;
  setSettings: React.Dispatch<React.SetStateAction<ShiftSettings>>;
  shiftTypes: ShiftType[];
  canManage: boolean;
  showToast: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    setSaving(false);
    showToast('Attendance settings saved');
  };

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Clock size={18} /> Check-In / Check-Out Rules</h3>
            <p className="text-xs text-zinc-400 mt-1">Configure how attendance is determined from biometric scans</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Late Entry Grace Period (min)" hint="Minutes after shift start before marking late">
                <input type="number" min="0" max="180" value={settings.lateEntryGraceMinutes}
                  onChange={e => setSettings(s => ({ ...s, lateEntryGraceMinutes: parseInt(e.target.value) || 0 }))}
                  disabled={!canManage} className={inputClassName} />
              </Field>
              <Field label="Early Exit Grace Period (min)" hint="Minutes before shift end that still count as full day">
                <input type="number" min="0" max="180" value={settings.earlyExitGraceMinutes}
                  onChange={e => setSettings(s => ({ ...s, earlyExitGraceMinutes: parseInt(e.target.value) || 0 }))}
                  disabled={!canManage} className={inputClassName} />
              </Field>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">Begin Check-In Before Shift Start</p>
                <p className="text-xs text-zinc-400">Allow employees to check in before their shift start time</p>
              </div>
              <ToggleSwitch enabled={settings.beginCheckInBeforeShiftStart}
                onToggle={() => canManage && setSettings(s => ({ ...s, beginCheckInBeforeShiftStart: !s.beginCheckInBeforeShiftStart }))} disabled={!canManage} />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                <strong>Biometric Logic:</strong> The first scan of the day is treated as check-in, and the last scan as check-out.
                All scans in between are logged but not used for attendance determination.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Users size={18} /> Attendance Thresholds</h3>
            <p className="text-xs text-zinc-400 mt-1">Define when employees are marked as half-day or absent</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Half Day Threshold (hours)" hint="Work below this many hours = half day">
                <input type="number" min="0" max="12" step="0.5" value={settings.halfDayThresholdHours}
                  onChange={e => setSettings(s => ({ ...s, halfDayThresholdHours: parseFloat(e.target.value) || 0 }))}
                  disabled={!canManage} className={inputClassName} />
              </Field>
              <Field label="Absent Threshold (hours)" hint="Work below this many hours = absent">
                <input type="number" min="0" max="12" step="0.5" value={settings.absentThresholdHours}
                  onChange={e => setSettings(s => ({ ...s, absentThresholdHours: parseFloat(e.target.value) || 0 }))}
                  disabled={!canManage} className={inputClassName} />
              </Field>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
              <p className="text-xs text-zinc-500">
                <strong>Status Logic:</strong>
              </p>
              <div className="text-xs text-zinc-500 space-y-1">
                <p>• Worked below <strong className="text-zinc-700">{settings.absentThresholdHours}h</strong> → <span className="text-red-600 font-medium">Absent</span></p>
                <p>• Worked below <strong className="text-zinc-700">{settings.halfDayThresholdHours}h</strong> → <span className="text-blue-600 font-medium">Half Day</span></p>
                <p>• Checked in after shift start + <strong className="text-zinc-700">{settings.lateEntryGraceMinutes}min</strong> grace → <span className="text-amber-600 font-medium">Late</span></p>
                <p>• Checked out before shift end − <strong className="text-zinc-700">{settings.earlyExitGraceMinutes}min</strong> grace → <span className="text-amber-600 font-medium">Early Exit</span></p>
                <p>• Worked full required hours → <span className="text-emerald-600 font-medium">Present</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2"><CalendarDays size={18} /> Overtime</h3>
          <p className="text-xs text-zinc-400 mt-1">Configure overtime calculation for specific shift types</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">Overtime Calculation</p>
              <p className="text-xs text-zinc-400">Track hours worked beyond shift end time</p>
            </div>
            <ToggleSwitch enabled={settings.overtimeCalculation}
              onToggle={() => canManage && setSettings(s => ({ ...s, overtimeCalculation: !s.overtimeCalculation }))} disabled={!canManage} />
          </div>
          {settings.overtimeCalculation && (
            <div className="pl-0 pt-2 border-t border-zinc-100">
              <p className="text-sm font-medium text-zinc-900 mb-1">Applicable Shift Types</p>
              <p className="text-xs text-zinc-400 mb-3">Select which shift types have overtime tracking enabled</p>
              <div className="flex flex-wrap gap-2">
                {shiftTypes.filter(st => st.is_active).map(st => {
                  const selected = settings.overtimeShiftTypeIds.includes(st.id);
                  return (
                    <button key={st.id}
                      onClick={() => canManage && setSettings(s => {
                        const ids = selected
                          ? s.overtimeShiftTypeIds.filter(id => id !== st.id)
                          : [...s.overtimeShiftTypeIds, st.id];
                        return { ...s, overtimeShiftTypeIds: ids };
                      })}
                      disabled={!canManage}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                      {selected && <span className="mr-1">✓</span>}
                      {st.name}
                    </button>
                  );
                })}
                {shiftTypes.filter(st => st.is_active).length === 0 && (
                  <p className="text-xs text-zinc-400">No active shift types available</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({ assignments, setAssignments, shiftTypes, allStaff, staffLoading, canManage, showToast, search, setSearch }: {
  assignments: ShiftAssignment[];
  setAssignments: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>;
  shiftTypes: ShiftType[];
  allStaff: any[];
  staffLoading: boolean;
  canManage: boolean;
  showToast: (msg: string) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShiftAssignment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ShiftAssignment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [sortField, setSortField] = useState<'staff_name' | 'shift_type_name' | 'status'>('staff_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [form, setForm] = useState({
    staff_id: '', shift_type_id: '', location: 'Office', status: 'active' as 'active' | 'pending' | 'cancelled',
    schedule_type: 'fixed' as 'alternate_day' | 'alternate_week' | 'fixed',
    frequency_weeks: 1, working_days: [...WORKING_DAYS_DEFAULT],
    effective_from: new Date().toISOString().split('T')[0], effective_to: '',
  });

  const activeCount = assignments.filter(a => a.status === 'active').length;
  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const cancelledCount = assignments.filter(a => a.status === 'cancelled').length;

  const filtered = useMemo(() => {
    let result = assignments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.staff_name.toLowerCase().includes(q) && !a.shift_type_name.toLowerCase().includes(q) && !a.location.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'staff_name') cmp = a.staff_name.localeCompare(b.staff_name);
      else if (sortField === 'shift_type_name') cmp = a.shift_type_name.localeCompare(b.shift_type_name);
      else cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [assignments, statusFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, sortField, sortDir]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      staff_id: '', shift_type_id: '', location: 'Office', status: 'active',
      schedule_type: 'fixed', frequency_weeks: 1, working_days: [...WORKING_DAYS_DEFAULT],
      effective_from: new Date().toISOString().split('T')[0], effective_to: '',
    });
    setShowModal(true);
  };

  const openEdit = (a: ShiftAssignment) => {
    setEditing(a);
    setForm({
      staff_id: String(a.staff_id), shift_type_id: String(a.shift_type_id), location: a.location,
      status: a.status, schedule_type: a.schedule_type, frequency_weeks: a.frequency_weeks,
      working_days: [...a.working_days], effective_from: a.effective_from, effective_to: a.effective_to || '',
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const staffId = parseInt(form.staff_id, 10);
    const shiftId = parseInt(form.shift_type_id, 10);
    if (!staffId || !shiftId) { showToast('Please select staff and shift type'); return; }
    const staff = allStaff.find(s => s.id === staffId);
    const shift = shiftTypes.find(s => s.id === shiftId);
    if (!staff || !shift) { showToast('Invalid staff or shift selection'); return; }

    const data: ShiftAssignment = {
      id: editing?.id || nextId(),
      staff_id: staffId, staff_name: staff.name,
      shift_type_id: shiftId, shift_type_name: shift.name,
      location: form.location, status: form.status,
      schedule_type: form.schedule_type, frequency_weeks: form.frequency_weeks,
      working_days: [...form.working_days],
      effective_from: form.effective_from, effective_to: form.effective_to || null,
    };

    if (editing) {
      setAssignments(prev => prev.map(a => a.id === editing.id ? data : a));
      showToast('Assignment updated');
    } else {
      setAssignments(prev => [...prev, data]);
      showToast('Assignment created');
    }
    setShowModal(false);
  };

  const handleDelete = (a: ShiftAssignment) => {
    setAssignments(prev => prev.filter(x => x.id !== a.id));
    setDeleteConfirm(null);
    showToast('Assignment removed');
  };

  const toggleWorkingDay = (day: string) => {
    setForm(f => ({
      ...f,
      working_days: f.working_days.includes(day) ? f.working_days.filter(d => d !== day) : [...f.working_days, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)),
    }));
  };

  const activeShiftTypes = shiftTypes.filter(s => s.is_active);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pending', value: pendingCount, color: 'bg-amber-50 text-amber-600' },
          { label: 'Cancelled', value: cancelledCount, color: 'bg-zinc-100 text-zinc-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-zinc-900 leading-none">{stat.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by staff or shift..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300" />
        </div>
        <div className="relative">
          <button onClick={() => setShowStatusFilter(!showStatusFilter)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${statusFilter !== 'all' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
            <Filter size={14} />
            <span className="hidden sm:inline">{statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
          </button>
          {showStatusFilter && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 z-20">
              {[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'cancelled', label: 'Cancelled' }].map(opt => (
                <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setShowStatusFilter(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${statusFilter === opt.value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => {
            if (sortField === 'staff_name') setSortField('shift_type_name');
            else if (sortField === 'shift_type_name') setSortField('status');
            else setSortField('staff_name');
            setSortDir('asc');
          }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all">
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">{sortField === 'staff_name' ? 'Staff' : sortField === 'shift_type_name' ? 'Shift' : 'Status'}</span>
          </button>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700">
            {sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
        <div className="flex items-center bg-zinc-100 rounded-xl p-1">
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            List
          </button>
          <button onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            Calendar
          </button>
        </div>
        {canManage && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={16} /> Assign Shift
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <><div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Staff</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Shift</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Location</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Schedule</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Period</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Status</th>
                  {canManage && <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map(a => (
                  <tr key={a.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {a.staff_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{a.staff_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-zinc-50 text-zinc-700 border-zinc-200">
                        {a.shift_type_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-600">
                      <span className="inline-flex items-center gap-1"><MapPin size={12} /> {a.location}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-600">
                      {SCHEDULE_TYPE_LABELS[a.schedule_type]}
                      {a.schedule_type !== 'fixed' && <span className="text-zinc-400 ml-1">({a.frequency_weeks}w)</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">{a.effective_from} — {a.effective_to || 'Ongoing'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${STATUS_COLORS[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(a)} title="Edit"
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-all"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteConfirm(a)} title="Delete"
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-400">No assignments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-zinc-50">
            {paginated.map(a => (
              <div key={a.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {a.staff_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{a.staff_name}</p>
                      <p className="text-xs text-zinc-500">{a.location} &middot; {SCHEDULE_TYPE_LABELS[a.schedule_type]}</p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a)} className="p-2 text-zinc-400 hover:text-zinc-700"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirm(a)} className="p-2 text-zinc-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-zinc-50 text-zinc-700 border-zinc-200">
                    {a.shift_type_name}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${STATUS_COLORS[a.status]}`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs text-zinc-500">
            {filtered.length > 0
              ? `Showing ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`
              : 'No results'}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </>
      ) : (
        <CalendarView assignments={filtered} shiftTypes={shiftTypes} />
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Assignment' : 'New Shift Assignment'} onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee">
                <SearchableSelect
                  value={form.staff_id}
                  onChange={v => setForm(f => ({ ...f, staff_id: v }))}
                  placeholder="Select employee..."
                  options={allStaff.map(s => ({ value: String(s.id), label: `${s.name} (${s.role})` }))}
                />
              </Field>
              <Field label="Shift Type">
                <SearchableSelect
                  value={form.shift_type_id}
                  onChange={v => setForm(f => ({ ...f, shift_type_id: v }))}
                  placeholder="Select shift..."
                  options={activeShiftTypes.map(s => ({ value: String(s.id), label: `${s.name} (${s.start_time} - ${s.end_time})` }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Location">
                <SearchableSelect
                  value={form.location}
                  onChange={v => setForm(f => ({ ...f, location: v }))}
                  placeholder="Select location..."
                  options={LOCATION_OPTIONS.map(l => ({ value: l, label: l }))}
                />
              </Field>
              <Field label="Schedule Type">
                <SearchableSelect
                  value={form.schedule_type}
                  onChange={v => setForm(f => ({ ...f, schedule_type: v as any }))}
                  placeholder="Select schedule..."
                  options={[
                    { value: 'fixed', label: 'Fixed' },
                    { value: 'alternate_day', label: 'Alternate Day' },
                    { value: 'alternate_week', label: 'Alternate Week' },
                  ]}
                />
              </Field>
              <Field label="Status">
                <SearchableSelect
                  value={form.status}
                  onChange={v => setForm(f => ({ ...f, status: v as any }))}
                  placeholder="Select status..."
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </Field>
            </div>
            {form.schedule_type !== 'fixed' && (
              <Field label={`Frequency (every ${form.frequency_weeks} week${form.frequency_weeks > 1 ? 's' : ''})`}>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="12" value={form.frequency_weeks}
                    onChange={e => setForm(f => ({ ...f, frequency_weeks: parseInt(e.target.value) }))}
                    className="flex-1 accent-emerald-600" />
                  <span className="text-sm font-bold text-zinc-900 w-8 text-right">{form.frequency_weeks}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {form.schedule_type === 'alternate_week'
                    ? `Employee works every ${form.frequency_weeks} week(s) then off for ${form.frequency_weeks} week(s)`
                    : `Employee works every ${form.frequency_weeks} day(s) then off`}
                </p>
              </Field>
            )}
            <Field label="Working Days">
              <div className="flex gap-2 flex-wrap">
                {ALL_DAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleWorkingDay(d)}
                    className={`w-12 py-2 rounded-lg text-xs font-bold transition-all ${
                      form.working_days.includes(d) ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                    }`}>
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Effective From">
                <input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} className={inputClassName} />
              </Field>
              <Field label="Effective To" hint="Leave empty for ongoing">
                <input type="date" value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))} className={inputClassName} />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Save size={16} /> {editing ? 'Save Changes' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Remove Assignment" onClose={() => setDeleteConfirm(null)}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-zinc-500">
              Remove shift assignment for <strong>{deleteConfirm.staff_name}</strong> ({deleteConfirm.shift_type_name})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 transition-colors text-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm">
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CalendarView({ assignments, shiftTypes }: { assignments: ShiftAssignment[]; shiftTypes: ShiftType[] }) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);

  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + w * 7);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      days.push(day);
    }
    weeks.push(days);
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const uniqueStaff = [...new Set(assignments.map(a => a.staff_id))].map(id => assignments.find(a => a.staff_id === id)!);

  const isWorkingDay = (assignment: ShiftAssignment, dayOfWeek: number): boolean => {
    const dayKey = ALL_DAYS[dayOfWeek];
    return assignment.working_days.includes(dayKey);
  };

  const isScheduledWeek = (assignment: ShiftAssignment, weekIndex: number): boolean => {
    if (assignment.schedule_type === 'fixed') return true;
    if (assignment.schedule_type === 'alternate_week') {
      return weekIndex % (assignment.frequency_weeks * 2) < assignment.frequency_weeks;
    }
    return true;
  };

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[700px] p-4 space-y-6">
          {weeks.map((week, wi) => (
            <div key={wi}>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Week of {week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <div className="grid grid-cols-8 gap-1">
                <div />
                {dayNames.map((name, di) => (
                  <div key={di} className={`text-center text-[10px] font-bold uppercase tracking-wider py-1 rounded ${week[di].toDateString() === today.toDateString() ? 'bg-zinc-900 text-white' : 'text-zinc-400'}`}>
                    {name}<br />
                    <span className="text-[9px] font-normal">{week[di].getDate()}</span>
                  </div>
                ))}
                {uniqueStaff.map(a => {
                  const shift = shiftTypes.find(s => s.id === a.shift_type_id);
                  const scheduledWeek = isScheduledWeek(a, wi);
                  return (
                    <Fragment key={`${a.id}-${wi}`}>
                      <div className="text-xs font-medium text-zinc-700 truncate py-1 pr-2 flex items-center" title={a.staff_name}>
                        {a.staff_name.split(' ')[0]}
                      </div>
                      {week.map((day, di) => {
                        const working = isWorkingDay(a, di) && scheduledWeek;
                        return (
                          <div key={di} className={`h-8 rounded text-[9px] font-bold flex items-center justify-center ${
                            working ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' : 'bg-zinc-50 text-zinc-300 border border-zinc-100'
                          }`} title={working ? `${a.shift_type_name}: ${shift?.start_time}-${shift?.end_time}` : 'Off'}>
                            {working ? shift?.name?.slice(0, 3) : '—'}
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
                {uniqueStaff.length === 0 && (
                  <div className="col-span-8 text-center py-6 text-xs text-zinc-400">No assignments to display</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
