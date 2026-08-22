import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, Settings as SettingsIcon, Calendar, Users, Plus, X, Save, Trash2,
  Edit2, CheckCircle2, Search, Loader2, Copy, CalendarOff,
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, XCircle
} from 'lucide-react';
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

const inputClassName = "w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-sm transition-all";

function ToggleSwitch({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-zinc-900' : 'bg-zinc-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
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
            className="fixed top-6 right-6 z-50 bg-zinc-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Shifts</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Shift types, attendance rules and schedule assignments</p>
        </div>
        <button onClick={() => navigate('/hrms/shifts/assign')}
          className="self-start sm:self-auto flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">
          <Calendar size={14} /> Schedule Assignment
        </button>
      </motion.header>

      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === tab.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}>
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400 gap-2 text-sm">
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
          <h2 className="text-sm font-bold text-zinc-900">Shift Types</h2>
          <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Shift types, attendance rules and overtime tracking</p>
        </div>
        {canManage && (
          <button onClick={() => navigate('/hrms/shifts/new')} className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <Plus size={14} /> New Shift
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Shifts', value: shiftTypes.length, icon: Clock, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: activeCount, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactive', value: shiftTypes.length - activeCount, icon: CalendarOff, color: 'bg-zinc-100 text-zinc-500' },
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
              <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{card.value}</p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{card.label}</p>
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
            placeholder="Search by shift name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
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
          <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
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
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th onClick={() => toggleSort('name')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                  <span className="flex items-center gap-1">Shift{sortField !== 'name' ? <ArrowUpDown size={12} className="text-zinc-300" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />}</span>
                </th>
                <th onClick={() => toggleSort('start_time')} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-zinc-600 select-none">
                  <span className="flex items-center gap-1">Time{sortField !== 'start_time' ? <ArrowUpDown size={12} className="text-zinc-300" /> : sortDir === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />}</span>
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Break</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Hours</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                {canManage && <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.map(s => (
                <tr key={s.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900">{s.name}</span>
                      {Boolean(s.overtime_enabled) && (
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">OT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{s.start_time} — {s.end_time}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{s.break_start && s.break_end ? `${s.break_start} — ${s.break_end}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600 font-medium">{formatTimeDiff(s.start_time, s.end_time)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(s)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border ${s.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                      {s.is_active ? <><CheckCircle2 size={10} />Active</> : 'Inactive'}
                    </button>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDuplicate(s)} title="Duplicate"
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><Copy size={14} /></button>
                        <button onClick={() => navigate(`/hrms/shifts/edit/${s.id}`)} title="Edit"
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteConfirm(s)} title="Delete"
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-zinc-400">No shift types found.</td></tr>
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
                    {Boolean(s.overtime_enabled) && (
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">OT</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{s.start_time} — {s.end_time}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/hrms/shifts/edit/${s.id}`)} className="p-2 text-zinc-400 hover:text-zinc-700"><Edit2 size={16} /></button>
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

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-white">
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
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page ? 'bg-zinc-100 text-zinc-800 border border-zinc-300' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

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
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Clock size={18} /> Check-In / Check-Out Rules</h3>
            <p className="text-xs text-zinc-400 mt-1">Configure how attendance is determined from biometric scans</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Late Entry Grace Period (min)" hint="Default for new shifts — minutes after start before marking late">
                <input type="number" min="0" max="180" value={draft.lateEntryGraceMinutes}
                  onChange={e => setDraft(s => ({ ...s, lateEntryGraceMinutes: parseInt(e.target.value) || 0 }))}
                  disabled={!canManage} className={inputClassName} />
              </Field>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">Begin Check-In Before Shift Start</p>
                <p className="text-xs text-zinc-400">Allow employees to check in before their shift start time</p>
              </div>
              <ToggleSwitch enabled={draft.beginCheckInBeforeShiftStart}
                onToggle={() => canManage && setDraft(s => ({ ...s, beginCheckInBeforeShiftStart: !s.beginCheckInBeforeShiftStart }))} disabled={!canManage} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">Overtime Calculation</p>
                <p className="text-xs text-zinc-400">Enable overtime tracking globally</p>
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
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Users size={18} /> Attendance Thresholds</h3>
            <p className="text-xs text-zinc-400 mt-1">Define when employees are marked as half-day or absent</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Half Day Threshold (hours)" hint="Work below this many hours = half day">
                <input type="number" min="0" max="12" step="0.5" value={draft.halfDayThresholdHours}
                  onChange={e => setDraft(s => ({ ...s, halfDayThresholdHours: parseFloat(e.target.value) || 0 }))}
                  disabled={!canManage} className={inputClassName} />
              </Field>
              <Field label="Absent Threshold (hours)" hint="Work below this many hours = absent">
                <input type="number" min="0" max="12" step="0.5" value={draft.absentThresholdHours}
                  onChange={e => setDraft(s => ({ ...s, absentThresholdHours: parseFloat(e.target.value) || 0 }))}
                  disabled={!canManage} className={inputClassName} />
              </Field>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
              <p className="text-xs text-zinc-500">
                <strong>Status Logic:</strong>
              </p>
              <div className="text-xs text-zinc-500 space-y-1">
                <p>• Worked below <strong className="text-zinc-700">{draft.absentThresholdHours}h</strong> → <span className="text-red-600 font-medium">Absent</span></p>
                <p>• Worked below <strong className="text-zinc-700">{draft.halfDayThresholdHours}h</strong> → <span className="text-blue-600 font-medium">Half Day</span></p>
                <p>• Checked in after shift start + <strong className="text-zinc-700">{draft.lateEntryGraceMinutes}min</strong> grace → <span className="text-amber-600 font-medium">Late</span> (per-shift rules override this)</p>
                <p>• Worked full required hours → <span className="text-emerald-600 font-medium">Present</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      )}
    </div>
  );
}
