import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle, ArrowUpDown, CalendarCheck, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, Clock, Download, Inbox, Info,
  Loader2, LogIn, LogOut, Search, TrendingUp,
  UserCheck, UserX, X, XCircle, CalendarDays, Camera, FileText,
  ClipboardList, MapPin, Navigation,
} from 'lucide-react';
import {
  addDays, getMonday,
  monthStart, padZ, toDateStr,
  countWorkingDays,
} from '../../lib/hrmsAttendance';
import { DEFAULT_SHIFT_SETTINGS } from '../../lib/api';
import type { ShiftSettings } from '../../lib/api';
import { toUiSettings } from '../../lib/hrmsShifts';
import { APP_NOTIFICATIONS_UPDATED_EVENT } from '../../lib/appApi';
import SearchableSelect from '../../components/SearchableSelect';
import {
  getMyAttendanceRecords,
  punchAttendance,
  getAttendanceRequests,
  createAttendanceRequest,
  getHrmsSettings,
  type AttendanceRecordOut,
  type AttendanceRequestOut,
} from '../../lib/hrmsApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  present:  'bg-emerald-50 text-emerald-700 border-emerald-100',
  absent:   'bg-red-50 text-red-700 border-red-100',
  late:     'bg-amber-50 text-amber-700 border-amber-100',
  half_day: 'bg-blue-50 text-blue-700 border-blue-100',
  overtime: 'bg-violet-50 text-violet-700 border-violet-100',
};

const STATUS_LABELS: Record<string, string> = {
  present:  'Present',
  absent:   'Absent',
  late:     'Late',
  half_day: 'Half Day',
  overtime: 'Overtime',
};

const STATUS_DOT: Record<string, string> = {
  present:  'bg-emerald-400',
  absent:   'bg-red-400',
  late:     'bg-amber-400',
  half_day: 'bg-blue-400',
  overtime: 'bg-violet-400',
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  regularization: 'Missed Punch',
  half_day: 'Request Half day',
  full_day_change: 'Full Day Request',
};

const REQUEST_TYPE_STYLES: Record<string, string> = {
  regularization: 'bg-zinc-50 text-zinc-600',
  half_day: 'bg-blue-50 text-blue-700',
  full_day_change: 'bg-violet-50 text-violet-700',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'overtime', label: 'Overtime' },
];

const OFFICE_NAME = 'Neomed Office, Nashik';

const DEFAULT_SHIFT_START = '09:00';
const DEFAULT_SHIFT_END   = '18:00';

const inputClassName = "w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function formatHours(h: number) {
  if (!h) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function lateMins(checkIn: string, shiftStart: string): number {
  const diff = timeToMinutes(checkIn) - timeToMinutes(shiftStart);
  return diff > 0 ? diff : 0;
}

function monthStartStr(year: number, month: number) {
  return `${year}-${padZ(month + 1)}-01`;
}

function monthEndStr(year: number, month: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return `${year}-${padZ(month + 1)}-${padZ(last)}`;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, closeOnBackdropClick = true }: {
  title: string; onClose: () => void; children: React.ReactNode; closeOnBackdropClick?: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { if (closeOnBackdropClick) onClose(); else e.preventDefault(); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
      onClick={closeOnBackdropClick ? onClose : undefined} onKeyDown={handleKeyDown} role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ─── TodayCard ────────────────────────────────────────────────────────────────

function TodayCard({ record }: { record: AttendanceRecordOut | null }) {
  const todayLabel = new Date().toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!record) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
      >
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Today · {todayLabel}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
            <CalendarCheck size={18} className="text-zinc-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-400">No record yet</p>
            <p className="text-xs text-zinc-300 mt-0.5">Your attendance hasn't been marked today</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const late = record.status === 'late' && record.check_in
    ? lateMins(record.check_in, record.shift_start || DEFAULT_SHIFT_START) : 0;

  const statusBg: Record<string, string> = {
    present:  'bg-emerald-500',
    absent:   'bg-red-500',
    late:     'bg-amber-500',
    half_day: 'bg-blue-500',
    overtime: 'bg-violet-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
    >
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Today · {todayLabel}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold ${statusBg[record.status]}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
          {STATUS_LABELS[record.status]}
        </span>
        {record.check_in && (
          <span className="flex items-center gap-1 text-xs text-zinc-600">
            <LogIn size={13} className="text-emerald-500" />
            <span className="font-bold">{record.check_in}</span>
            {late > 0 && <span className="text-amber-500 font-semibold ml-0.5">({late}m late)</span>}
          </span>
        )}
        {record.check_out && (
          <span className="flex items-center gap-1 text-xs text-zinc-600">
            <LogOut size={13} className="text-red-400" />
            <span className="font-bold">{record.check_out}</span>
          </span>
        )}
        {record.hours_worked > 0 && (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock size={13} className="text-zinc-400" />
            <span className="font-semibold">{formatHours(record.hours_worked)}</span>
          </span>
        )}
        {(record.penalty_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-rose-600">−₹{record.penalty_amount}</span>
        )}
        {(record.overtime_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-violet-600">+₹{record.overtime_amount} OT</span>
        )}
        <span className="flex items-center gap-1 text-xs text-zinc-300 ml-auto">
          <Info size={12} />
          Shift {record.shift_start || DEFAULT_SHIFT_START}–{record.shift_end || DEFAULT_SHIFT_END}
        </span>
      </div>
    </motion.div>
  );
}

// ─── WeekStrip ────────────────────────────────────────────────────────────────

function WeekStrip({ records }: { records: AttendanceRecordOut[] }) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const recMap = new Map(records.map(r => [r.date, r]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
    >
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">This Week</p>
      <div className="grid grid-cols-6 gap-2">
        {days.map((d) => {
          const ds = toDateStr(d);
          const rec = recMap.get(ds);
          const isToday = ds === toDateStr(today);
          const isFuture = d > today;
          const dayName = d.toLocaleDateString('default', { weekday: 'short' });

          return (
            <div key={ds} className="flex flex-col items-center gap-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {dayName}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isToday ? 'ring-2 ring-zinc-900 ring-offset-2' : ''
              } ${
                isFuture
                  ? 'bg-zinc-50 border border-zinc-100'
                  : rec
                    ? STATUS_STYLES[rec.status].split(' border')[0]
                    : 'bg-zinc-50 border border-zinc-100'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isFuture || !rec ? 'bg-zinc-200' : STATUS_DOT[rec.status]
                }`} />
              </div>
              {!isFuture && rec && (
                <span className={`text-[9px] font-bold text-center leading-tight ${STATUS_STYLES[rec.status].split(' ').slice(1, 3).join(' ')}`}>
                  {STATUS_LABELS[rec.status] === 'Half Day' ? 'Half' : STATUS_LABELS[rec.status]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── DayDetail ────────────────────────────────────────────────────────────────

function DayDetail({ date, record }: { date: string | null; record: AttendanceRecordOut | null }) {
  if (!date) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm flex items-center gap-2.5"
      >
        <Info size={14} className="text-zinc-300 shrink-0" />
        <p className="text-xs text-zinc-400">Select a date on the calendar to see full details.</p>
      </motion.div>
    );
  }

  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isSunday = d.getDay() === 0;

  if (!record) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
      >
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">{label}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
            <CalendarCheck size={18} className="text-zinc-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-500">{isSunday ? 'Weekly Off' : 'No record for this date'}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isSunday ? 'Sunday is a weekly off day.' : 'No attendance was marked for this day.'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const late = record.status === 'late' && record.check_in
    ? lateMins(record.check_in, record.shift_start || DEFAULT_SHIFT_START) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${STATUS_STYLES[record.status]}`}>
          {STATUS_LABELS[record.status]}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {record.check_in ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-600">
            <LogIn size={13} className="text-emerald-500" />
            <span className="font-bold">{record.check_in}</span>
            {late > 0 && <span className="text-amber-500 font-semibold ml-0.5">({late}m late)</span>}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <LogIn size={13} className="text-zinc-300" />
            No check-in
          </span>
        )}
        {record.check_out ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-600">
            <LogOut size={13} className="text-red-400" />
            <span className="font-bold">{record.check_out}</span>
          </span>
        ) : (
          record.check_in && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <LogOut size={13} className="text-zinc-300" />
              No check-out
            </span>
          )
        )}
        {record.hours_worked > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock size={13} className="text-zinc-400" />
            <span className="font-semibold">{formatHours(record.hours_worked)}</span>
          </span>
        )}
        {(record.penalty_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-rose-600">−₹{record.penalty_amount}</span>
        )}
        {(record.overtime_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-violet-600">+₹{record.overtime_amount} OT</span>
        )}
        <span className="flex items-center gap-1 text-xs text-zinc-300 ml-auto">
          <Info size={12} />
          Shift {record.shift_start || DEFAULT_SHIFT_START}–{record.shift_end || DEFAULT_SHIFT_END}
        </span>
      </div>
    </motion.div>
  );
}

// ─── WeeklyBars ───────────────────────────────────────────────────────────────
// Uses plain CSS transition (not motion) to avoid Framer Motion % height issue

function WeeklyBars({ weeks, overtimeHrs }: { weeks: { label: string; hours: number }[]; overtimeHrs: number }) {
  const max = Math.max(...weeks.map(w => w.hours), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={15} className="text-zinc-400" />
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Weekly Hours</p>
        {overtimeHrs > 0 && (
          <span className="ml-auto text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            +{formatHours(overtimeHrs)} overtime
          </span>
        )}
      </div>
      <div className="flex items-end gap-3 h-14">
        {weeks.map((w) => {
          const pct = Math.round((w.hours / max) * 100);
          return (
            <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 leading-none mb-1">
                {formatHours(w.hours)}
              </span>
              <div className="w-full bg-zinc-100 rounded-md flex items-end" style={{ height: 32 }}>
                {/* plain div with CSS transition — no Framer Motion % animation */}
                <div
                  className="w-full bg-emerald-400 rounded-md transition-all duration-500"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400 font-semibold leading-none mt-1">{w.label}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyAttendance() {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<AttendanceRecordOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Shift settings — loaded from backend API
  const [shiftSettings, setShiftSettings] = useState<ShiftSettings>(DEFAULT_SHIFT_SETTINGS);

  // Regularization requests
  const [myRequests, setMyRequests] = useState<AttendanceRequestOut[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqType, setReqType] = useState<'regularization' | 'half_day' | 'full_day_change'>('regularization');
  const [reqDate, setReqDate] = useState('');
  const [reqToDate, setReqToDate] = useState('');
  const [reqFromTime, setReqFromTime] = useState('');
  const [reqToTime, setReqToTime] = useState('');
  const [reqReason, setReqReason] = useState('');
  // ── URL Search Params Syncing ──
  const [searchParams, setSearchParams] = useSearchParams();
  const panelParam = searchParams.get('panel') || searchParams.get('tab');
  const initialPanel = (panelParam === 'requests' || panelParam === 'logs') ? panelParam : 'logs';

  const [activePanel, setActivePanelState] = useState<'logs' | 'requests'>(initialPanel);

  useEffect(() => {
    const p = searchParams.get('panel') || searchParams.get('tab');
    if (p === 'requests' || p === 'logs') {
      setActivePanelState(p);
    }
  }, [searchParams]);

  const setActivePanel = (panel: 'logs' | 'requests') => {
    setActivePanelState(panel);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('panel', panel);
      return next;
    });
  };

  const calendarParam = searchParams.get('calendar') === 'true';
  const [showCalendar, setShowCalendarState] = useState<boolean>(calendarParam);

  useEffect(() => {
    const c = searchParams.get('calendar') === 'true';
    setShowCalendarState(c);
  }, [searchParams]);

  const setShowCalendar = (val: boolean | ((prev: boolean) => boolean)) => {
    setShowCalendarState((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        if (nextVal) next.set('calendar', 'true');
        else next.delete('calendar');
        return next;
      });
      return nextVal;
    });
  };

  const [reqSubmitting, setReqSubmitting] = useState(false);

  const today    = new Date();
  const todayStr = toDateStr(today);

  // Calendar month navigation
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [dateFrom, setDateFrom] = useState(monthStartStr(viewYear, viewMonth));
  const [dateTo, setDateTo]     = useState(monthEndStr(viewYear, viewMonth));
  const [statusFilter, setStatusFilter] = useState('all');

  // Sorting
  const [sortKey, setSortKey] = useState<'date' | 'status' | 'checkIn' | 'checkOut' | 'hours'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);

  // Punch modal
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [punchMode, setPunchMode] = useState<'in' | 'out'>('in');
  const [liveTime, setLiveTime] = useState(timeNow());
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchPhoto, setPunchPhoto] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  // Keep the read-only punch clock in sync while the punch modal is open
  useEffect(() => {
    if (!showPunchModal) return;
    const t = window.setInterval(() => setLiveTime(timeNow()), 1000);
    return () => window.clearInterval(t);
  }, [showPunchModal]);

  // Sync date range with the calendar month
  useEffect(() => {
    setDateFrom(monthStartStr(viewYear, viewMonth));
    setDateTo(monthEndStr(viewYear, viewMonth));
  }, [viewYear, viewMonth]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, searchDebounced, dateFrom, dateTo, sortKey, sortDir]);
  useEffect(() => { setRequestPage(1); }, [myRequests.length, activePanel]);

  // Load attendance records and requests from the API
  const [officeConfig, setOfficeConfig] = useState<{ lat: number; lng: number; radius: number } | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [recordsRes, requestsRes] = await Promise.all([
        getMyAttendanceRecords(token, { from_date: dateFrom, to_date: dateTo }),
        getAttendanceRequests(token),
      ]);
      setRecords(recordsRes);
      setMyRequests(requestsRes);

      // Fetch live admin-configured office settings from backend API
      try {
        const hrmsSet = await getHrmsSettings(token);
        if (hrmsSet.latitude && hrmsSet.longitude) {
          setOfficeConfig({
            lat: Number(hrmsSet.latitude),
            lng: Number(hrmsSet.longitude),
            radius: Number(hrmsSet.radius_meters || 500),
          });
        }
        // Also load shift timing settings from backend
        setShiftSettings(toUiSettings(hrmsSet));
      } catch (err) {
        console.warn('Could not fetch live HRMS settings:', err);
      }
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      showToast(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, dateFrom, dateTo]);

  // Refresh records, requests, and shift settings on focus or notification update
  useEffect(() => {
    const refresh = async () => {
      fetchData();
      // Re-fetch shift settings from backend in case admin changed them
      if (token) {
        try {
          const s = await getHrmsSettings(token);
          setShiftSettings(toUiSettings(s));
        } catch {}
      }
    };
    window.addEventListener('focus', refresh);
    window.addEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(APP_NOTIFICATIONS_UPDATED_EVENT, refresh);
    };
  }, [token, dateFrom, dateTo]);

  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [geoVerifying, setGeoVerifying] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoVerified, setGeoVerified] = useState(false);

  const fetchOfficeLocation = () => {
    if (officeConfig) {
      return officeConfig;
    }
    return { lat: 19.9975, lng: 73.7898, radius: 500 };
  };

  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setGeoVerified(false);
      return;
    }
    setGeoVerifying(true);
    setGeoError('');
    setGeoVerified(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoLat(lat);
        setGeoLng(lng);

        const office = fetchOfficeLocation();
        const R = 6371000;
        const dLat = ((lat - office.lat) * Math.PI) / 180;
        const dLon = ((lng - office.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((office.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = Math.round(R * c);

        setGeoDistance(dist);

        if (dist <= office.radius) {
          setGeoVerified(true);
          setGeoError('');
        } else {
          setGeoVerified(false);
          setGeoError(`outside_radius:${dist}:${office.radius}`);
        }
        setGeoVerifying(false);
      },
      (err) => {
        setGeoVerifying(false);
        setGeoVerified(false);
        if (err.code === 1) {
          setGeoError('permission_denied');
        } else if (err.code === 2) {
          setGeoError('position_unavailable');
        } else if (err.code === 3) {
          setGeoError('timeout');
        } else {
          setGeoError('unknown');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getGeoErrorInfo = () => {
    if (!geoError) return null;
    if (geoError === 'permission_denied') {
      return {
        title: 'Location Permission Denied',
        message: 'Location access was blocked by your browser.',
        hint: 'Click the lock icon in your address bar → select "Allow" for Location. Then reload the page and try again.',
        icon: 'block',
      };
    }
    if (geoError === 'position_unavailable') {
      return {
        title: 'GPS Signal Unavailable',
        message: 'Your device could not determine your current location.',
        hint: 'Make sure you are outdoors or near a window for GPS signal. On desktop, ensure your device has GPS hardware. Try again in a few seconds.',
        icon: 'unavailable',
      };
    }
    if (geoError === 'timeout') {
      return {
        title: 'Location Request Timed Out',
        message: 'It took too long to get your GPS coordinates.',
        hint: 'Try moving to an area with better GPS signal and click "Verify Current Location" again.',
        icon: 'timeout',
      };
    }
    if (geoError === 'unknown') {
      return {
        title: 'Location Error',
        message: 'An unexpected error occurred while fetching your location.',
        hint: 'Please try again. If this persists, check your browser settings for location permissions.',
        icon: 'unknown',
      };
    }
    if (geoError === 'Geolocation is not supported by your browser.') {
      return {
        title: 'Browser Not Supported',
        message: 'Your browser does not support GPS/location services.',
        hint: 'Please use a modern browser (Chrome, Firefox, Edge, or Safari) on a device with GPS capability.',
        icon: 'unsupported',
      };
    }
    if (geoError.startsWith('outside_radius:')) {
      const [, dist, radius] = geoError.split(':');
      return {
        title: 'Outside Office Boundary',
        message: `You are ${dist}m away from the office. Maximum allowed distance is ${radius}m.`,
        hint: 'Please move closer to the office location and click "Verify Current Location" again.',
        icon: 'distance',
      };
    }
    return {
      title: 'Location Access / Distance Issue',
      message: geoError,
      hint: 'Check your browser location permissions and try again.',
      icon: 'unknown',
    };
  };

  const resetPunchState = () => {
    setPunchPhoto(null);
    setGeoLat(null);
    setGeoLng(null);
    setGeoDistance(null);
    setGeoError('');
    setGeoVerified(false);
    setGeoVerifying(false);
  };

  const isDeliveryBoy = user?.role === 'delivery_boy';
  const canPunch = geoVerified && !(isDeliveryBoy && punchMode === 'in' && !punchPhoto);

  function prevMonth() {
    setSelectedDate(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    setSelectedDate(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  }

  const recMap = useMemo(() => new Map(records.map(r => [r.date, r])), [records]);

  const calendarDays = useMemo(() => {
    const start = getMonday(monthStart(new Date(viewYear, viewMonth)));
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(start, i));
    return days;
  }, [viewYear, viewMonth]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < 6; i++) w.push(calendarDays.slice(i * 7, i * 7 + 7));
    return w;
  }, [calendarDays]);

  // Records within the selected date range (drives summary + table)
  const rangeRecords = useMemo(() => {
    return records.filter(r => r.date >= dateFrom && r.date <= dateTo);
  }, [records, dateFrom, dateTo]);

  // Fully filtered + sorted list for the table
  const filteredRecords = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase();
    const list = rangeRecords.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q) {
        const d = new Date(r.date + 'T00:00:00');
        const dateText = d.toLocaleDateString('default', { day: 'numeric', month: 'short' }).toLowerCase();
        const hay = `${dateText} ${STATUS_LABELS[r.status].toLowerCase()} ${r.check_in || ''} ${r.check_out || ''} ${formatHours(r.hours_worked)}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date':     cmp = a.date.localeCompare(b.date); break;
        case 'status':   cmp = STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status]); break;
        case 'checkIn':  cmp = (a.check_in || 'zzz').localeCompare(b.check_in || 'zzz'); break;
        case 'checkOut': cmp = (a.check_out || 'zzz').localeCompare(b.check_out || 'zzz'); break;
        case 'hours':    cmp = a.hours_worked - b.hours_worked; break;
      }
      return cmp * dir;
    });
  }, [rangeRecords, statusFilter, searchDebounced, sortKey, sortDir]);

  const todayRecord = records.find(r => r.date === todayStr) ?? null;
  const selectedRecord = selectedDate ? recMap.get(selectedDate) ?? null : null;

  // Monthly summary for the selected date range
  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, half_day: 0, overtime: 0 };
    rangeRecords.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const presentDays  = counts.present + counts.late + counts.half_day + counts.overtime;
    const workingDays  = rangeRecords.length;
    const totalHours   = rangeRecords.reduce((acc, r) => acc + r.hours_worked, 0);
    const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
    const overtimeHrs  = rangeRecords
      .filter(r => r.status === 'overtime' && r.check_out)
      .reduce((acc, r) => {
        const extra = timeToMinutes(r.check_out!) - timeToMinutes(r.shift_end || DEFAULT_SHIFT_END);
        return acc + (extra > 0 ? Math.round(extra / 60 * 10) / 10 : 0);
      }, 0);
    return { ...counts, totalHours, attendancePct, overtimeHrs };
  }, [rangeRecords]);

  // Weekly hours for the selected date range (plain array, no motion animation)
  const weeklyHours = useMemo(() => {
    const inRange = [...rangeRecords].sort((a, b) => a.date.localeCompare(b.date));
    const weeks: { label: string; hours: number }[] = [];
    if (inRange.length === 0) return weeks;

    let weekNum   = 1;
    let weekStart = inRange[0].date;
    let weekHrs   = 0;

    inRange.forEach((r, i) => {
      const diffDays = Math.round(
        (new Date(r.date + 'T00:00:00').getTime() - new Date(weekStart + 'T00:00:00').getTime()) / 86400000
      );
      if (diffDays >= 7) {
        weeks.push({ label: `Wk ${weekNum}`, hours: Math.round(weekHrs * 10) / 10 });
        weekNum++;
        weekStart = r.date;
        weekHrs   = r.hours_worked;
      } else {
        weekHrs += r.hours_worked;
      }
      if (i === inRange.length - 1) {
        weeks.push({ label: `Wk ${weekNum}`, hours: Math.round(weekHrs * 10) / 10 });
      }
    });
    return weeks;
  }, [rangeRecords]);

  const summaryCards = [
    { label: 'Present',     value: summary.present,              color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Absent',      value: summary.absent,               color: 'bg-red-50 text-red-700' },
    { label: 'Late',        value: summary.late,                 color: 'bg-amber-50 text-amber-700' },
    { label: 'Half Day',    value: summary.half_day,             color: 'bg-blue-50 text-blue-700' },
    { label: 'Attendance',  value: `${summary.attendancePct}%`,  color: 'bg-zinc-100 text-zinc-700' },
    { label: 'Total Hrs',   value: formatHours(summary.totalHours), color: 'bg-violet-50 text-violet-700' },
  ];

  const PAGE_SIZE  = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const startRow   = (page - 1) * PAGE_SIZE + 1;
  const endRow     = Math.min(page * PAGE_SIZE, filteredRecords.length);
  const paged      = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const REQUEST_PAGE_SIZE = 10;
  const requestTotalPages = Math.max(1, Math.ceil(myRequests.length / REQUEST_PAGE_SIZE));
  const requestStartRow = (requestPage - 1) * REQUEST_PAGE_SIZE + 1;
  const requestEndRow = Math.min(requestPage * REQUEST_PAGE_SIZE, myRequests.length);
  const pagedRequests = myRequests.slice(
    (requestPage - 1) * REQUEST_PAGE_SIZE,
    requestPage * REQUEST_PAGE_SIZE,
  );

  const hasFilters = search !== '' || statusFilter !== 'all'
    || dateFrom !== monthStartStr(viewYear, viewMonth) || dateTo !== monthEndStr(viewYear, viewMonth);

  const clearFilters = () => {
    setSearch('');
    setSearchDebounced('');
    setStatusFilter('all');
    setDateFrom(monthStartStr(viewYear, viewMonth));
    setDateTo(monthEndStr(viewYear, viewMonth));
  };

  const toggleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  };

  const handleExport = () => {
    const headers = ['Date', 'Status', 'Check In', 'Check Out', 'Hours', 'Shift', 'Late (min)'];
    const rows = filteredRecords.map(r => [
      r.date,
      STATUS_LABELS[r.status],
      r.check_in || '',
      r.check_out || '',
      r.hours_worked ? String(r.hours_worked) : '',
      `${r.shift_start || DEFAULT_SHIFT_START}–${r.shift_end || DEFAULT_SHIFT_END}`,
      r.status === 'late' && r.check_in ? String(lateMins(r.check_in, r.shift_start || DEFAULT_SHIFT_START)) : '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Attendance exported as CSV.');
  };

  const openPunch = () => {
    setLiveTime(timeNow());
    resetPunchState();
    const tr = records.find(r => r.date === todayStr);
    if (tr && tr.check_in && !tr.check_out) setPunchMode('out');
    else setPunchMode('in');
    setShowPunchModal(true);
    setTimeout(() => {
      verifyLocation();
    }, 100);
  };

  const handlePunchSubmit = async () => {
    if (!token) {
      showToast('Authentication required');
      return;
    }
    if (!geoVerified) {
      showToast('Please verify your current location inside office radius first.');
      return;
    }
    setPunchLoading(true);
    
    try {
      const result = await punchAttendance(token, {
        mode: punchMode,
        lat: geoLat ?? undefined,
        lng: geoLng ?? undefined,
        distance_from_office: geoDistance ?? undefined,
        punch_photo: punchPhoto ?? undefined,
      });

      const stamped = punchMode === 'in' ? result.check_in : result.check_out;
      showToast(`Punched ${punchMode === 'in' ? 'in' : 'out'} at ${stamped || liveTime}`);
      
      // Refresh records to show the updated punch
      await fetchData();
      
      setShowPunchModal(false);
      resetPunchState();
    } catch (error) {
      console.error('Punch failed:', error);
      showToast(error instanceof Error ? error.message : 'Punch failed');
    } finally {
      setPunchLoading(false);
    }
  };

  // Task 4: Handle uniform photo capture for delivery boy punch-in
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPunchPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Submit a regularization request
  const handleRequestSubmit = async () => {
    if (!token) {
      showToast('Authentication required');
      return;
    }
    if (!reqDate) return;
    if (reqType === 'regularization') {
      if (!reqToDate || !reqReason.trim()) return;
      if (countWorkingDays(reqDate, reqToDate) <= 0) {
        showToast('Select a valid date range');
        return;
      }
    } else if (reqType === 'half_day') {
      if (!reqFromTime || !reqToTime) {
        showToast('Select the half-day time range');
        return;
      }
    } else if (reqType === 'full_day_change') {
      if (!reqReason.trim()) {
        showToast('Please add a reason');
        return;
      }
    }
    setReqSubmitting(true);
    
    try {
      await createAttendanceRequest(token, {
        from_date: reqDate,
        to_date: reqType === 'regularization' ? reqToDate : reqDate,
        request_type: reqType,
        from_time: reqType === 'half_day' ? reqFromTime || undefined : undefined,
        to_time: reqType === 'half_day' ? reqToTime || undefined : undefined,
        reason: reqReason.trim() || undefined,
      });
      
      showToast('Attendance request submitted');
      setActivePanel('requests');

      // Refresh requests to show the new one
      const requestsRes = await getAttendanceRequests(token);
      setMyRequests(requestsRes);
      
      setShowRequestModal(false);
      setReqType('regularization');
      setReqDate('');
      setReqToDate('');
      setReqFromTime('');
      setReqToTime('');
      setReqReason('');
    } catch (error) {
      console.error('Failed to submit request:', error);
      showToast(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setReqSubmitting(false);
    }
  };

  const openRequestModal = () => {
    setReqType('regularization');
    setReqDate(todayStr);
    setReqToDate(todayStr);
    setReqFromTime('');
    setReqToTime('');
    setReqReason('');
    setShowRequestModal(true);
  };

  const handleReqTypeChange = (t: 'regularization' | 'half_day' | 'full_day_change') => {
    setReqType(t);
    setReqFromTime('');
    setReqToTime('');
    if (t === 'full_day_change') {
      const halfDays = records.filter(r => r.status === 'half_day').map(r => r.date).sort().reverse();
      setReqDate(halfDays[0] || todayStr);
      setReqToDate('');
    } else if (t === 'regularization') {
      setReqDate(todayStr);
      setReqToDate(todayStr);
    } else {
      setReqDate(todayStr);
      setReqToDate('');
    }
  };

  const sortColumns = [
    { label: 'Date', k: 'date' as const },
    { label: 'Status', k: 'status' as const },
    { label: 'Check In', k: 'checkIn' as const },
    { label: 'Check Out', k: 'checkOut' as const },
    { label: 'Hours', k: 'hours' as const },
  ];

  return (
    <div className="space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Attendance</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{user?.username} · Personal attendance history</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCalendar(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${showCalendar
              ? 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}>
            <CalendarDays size={14} />
            Calendar View
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
            <Download size={14} />
            Export CSV
          </button>
          <button onClick={openPunch}
            className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <LogIn size={14} />
            Punch In / Out
          </button>
          <button onClick={openRequestModal}
            className="flex items-center gap-2 bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
            <ClipboardList size={14} />
            Request Attendance
          </button>
        </div>
      </motion.header>

      {/* Calendar View — shows ONLY the calendar; everything else is hidden */}
      {showCalendar ? (
        <>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm"
        >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck size={15} className="text-zinc-400" />
            <h3 className="font-bold text-zinc-900 text-sm">{monthLabel(viewYear, viewMonth)}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth}
              className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors">
              Today
            </button>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(n => (
            <div key={n} className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{n}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weeks.flat().map((day) => {
            const ds = toDateStr(day);
            const rec = recMap.get(ds);
            const isToday = ds === todayStr;
            const inMonth = day.getMonth() === viewMonth;
            const isSunday = day.getDay() === 0;
            const isSelected = selectedDate === ds;
            const cellStyle = rec
              ? STATUS_STYLES[rec.status]
              : isSunday ? 'bg-zinc-50/70 text-red-400' : 'bg-zinc-50/60 text-zinc-400';
            return (
              <button key={ds} onClick={() => setSelectedDate(ds)}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] sm:min-h-[54px] rounded-lg text-xs font-bold transition-all cursor-pointer hover:brightness-95 ${cellStyle} ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-1' : ''} ${!inMonth ? 'opacity-40' : ''}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${isToday ? 'bg-zinc-900 text-white' : ''}`}>
                  {day.getDate()}
                </span>
                {rec ? (
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[rec.status]}`} />
                    {rec.hours_worked > 0 && (
                      <span className="text-[8px] font-semibold text-zinc-400 hidden sm:inline">{formatHours(rec.hours_worked)}</span>
                    )}
                  </span>
                ) : isSunday ? (
                  <span className="text-[8px] font-semibold uppercase tracking-wide hidden sm:inline">Off</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-zinc-100">
          {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(k => (
            <span key={k} className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[k]}`} />
              {STATUS_LABELS[k]}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Selected date details */}
      <DayDetail date={selectedDate} record={selectedRecord} />
      </>
      ) : (
        <>
          {/* Today Card */}
          <TodayCard record={todayRecord} />

          {/* Week Strip — only on current month */}
          {isCurrentMonth && <WeekStrip records={records} />}

          {/* Summary chips */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {summaryCards.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm ${s.color}`}
          >
            <p className="text-2xl font-bold text-zinc-900 leading-none">{s.value}</p>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>



      {/* Weekly hours bars */}
      {weeklyHours.length > 0 && (
        <WeeklyBars weeks={weeklyHours} overtimeHrs={summary.overtimeHrs} />
      )}

      {/* Logs / Requests toggle — same pattern as admin Shift Types / Settings */}
      <div className="space-y-2">
        <div className="flex gap-1.5 bg-zinc-100 p-1.5 rounded-xl w-fit">
          {([
            { key: 'logs' as const, label: 'Logs', icon: FileText },
            { key: 'requests' as const, label: 'Attendance Requests', icon: ClipboardList },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActivePanel(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                activePanel === tab.key
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.key === 'requests' && myRequests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="ml-0.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                  {myRequests.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 px-0.5">
          {activePanel === 'logs'
            ? 'Logs are your daily attendance history — date, status, check-in / check-out times, hours worked, and shift timing.'
            : 'Attendance requests are changes you submitted for approval (missed punch, request half day, full day request).'}
        </p>
      </div>

      {activePanel === 'requests' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 pb-3 border-b border-zinc-50">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-zinc-400" />
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">My Attendance Requests</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {myRequests.length} total &middot; {myRequests.filter((r) => r.status === 'pending').length} pending
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openRequestModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
            >
              <ClipboardList size={13} />
              New Request
            </button>
          </div>
          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                <Inbox size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">No attendance requests</h3>
              <p className="text-xs text-zinc-400 max-w-xs mb-4">
                Submit a request when you need a missed punch, request half day, or full day request.
              </p>
              <button
                type="button"
                onClick={openRequestModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <ClipboardList size={13} />
                Request Attendance
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-zinc-50">
                {pagedRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${REQUEST_TYPE_STYLES[req.request_type] || 'bg-zinc-50 text-zinc-600'}`}>
                        {REQUEST_TYPE_LABELS[req.request_type]?.charAt(0) || 'R'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">
                          {REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {req.from_date}{req.from_date !== req.to_date ? ` \u2013 ${req.to_time ? req.from_time + ' \u2013 ' + req.to_time : req.to_date}` : (req.from_time ? ` \u2013 ${req.from_time}\u2013${req.to_time}` : '')}
                          {req.days > 1 ? ` \u00B7 ${req.days} days` : ''}
                        </p>
                        {req.reason && <p className="text-[11px] text-zinc-400 truncate mt-0.5">{req.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {req.notes && (
                        <span className="text-[10px] text-zinc-400 max-w-[120px] truncate hidden sm:inline" title={req.notes}>
                          Note: {req.notes}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                        req.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{requestStartRow}</span>–
                  <span className="font-bold text-zinc-900">{requestEndRow}</span> of{' '}
                  <span className="font-bold text-zinc-900">{myRequests.length}</span> requests
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                    disabled={requestPage <= 1}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} className="text-zinc-600" />
                  </button>
                  <span className="text-xs text-zinc-500 font-medium min-w-[3.5rem] text-center">
                    {requestPage} / {requestTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRequestPage((p) => Math.min(requestTotalPages, p + 1))}
                    disabled={requestPage >= requestTotalPages}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} className="text-zinc-600" />
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      ) : (
        <>
      {/* Filters */}
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
            placeholder="Search date, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all" />
        <div className="w-[160px]">
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            className="w-full"
          />
        </div>
        {hasFilters && (
          <button onClick={clearFilters}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      {/* Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden"
      >
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[90px_1fr_130px_130px_100px_90px] bg-zinc-50/50 border-b border-zinc-100 px-4 py-3">
          {sortColumns.map(h => (
            <button key={h.k} onClick={() => toggleSort(h.k)}
              className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-700 transition-colors">
              {h.label}
              {sortKey === h.k
                ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                : <ArrowUpDown size={11} className="opacity-50" />}
            </button>
          ))}
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Shift</span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <Inbox size={24} className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">No records found</h3>
            <p className="text-xs text-zinc-400 max-w-xs">No attendance data matches your filters</p>
          </div>
        ) : (
          <>
            {/* Desktop rows */}
            <div className="hidden md:block divide-y divide-zinc-50">
              {paged.map((record, i) => {
                const d    = new Date(record.date + 'T00:00:00');
                const isToday = record.date === todayStr;
                const isSelected = record.date === selectedDate;
                const late = record.status === 'late' && record.check_in
                  ? lateMins(record.check_in, record.shift_start || DEFAULT_SHIFT_START) : 0;
                return (
                  <motion.div key={record.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`grid grid-cols-[90px_1fr_130px_130px_100px_90px] px-4 py-3 items-center hover:bg-zinc-50/50 transition-colors ${isToday ? 'bg-zinc-50' : ''} ${isSelected ? 'bg-emerald-50/50' : ''}`}
                  >
                    <div>
                      <p className="text-xs font-bold text-zinc-900 whitespace-nowrap">
                        {d.toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {d.toLocaleDateString('default', { weekday: 'short' })}
                        {isToday && <span className="ml-1 text-emerald-500 font-bold">· Today</span>}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[record.status]}`}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-600">
                      {record.check_in ? (
                        <>
                          <LogIn size={12} className="text-emerald-500 shrink-0" />
                          <span className="font-bold">{record.check_in}</span>
                          {late > 0 && <span className="text-amber-500 text-[10px] font-semibold ml-0.5">+{late}m</span>}
                        </>
                      ) : <span className="text-zinc-300">—</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-600">
                      {record.check_out ? (
                        <>
                          <LogOut size={12} className="text-red-400 shrink-0" />
                          <span className="font-bold">{record.check_out}</span>
                        </>
                      ) : <span className="text-zinc-300">—</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock size={11} className="text-zinc-300 shrink-0" />
                      <span className="font-semibold">{formatHours(record.hours_worked)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-300 whitespace-nowrap">
                      {record.shift_start}–{record.shift_end}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-100">
              {paged.map((record, i) => {
                const d    = new Date(record.date + 'T00:00:00');
                const isToday = record.date === todayStr;
                const isSelected = record.date === selectedDate;
                const late = record.status === 'late' && record.check_in
                  ? lateMins(record.check_in, record.shift_start || DEFAULT_SHIFT_START) : 0;
                return (
                  <motion.div key={record.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 space-y-2 ${isToday ? 'bg-zinc-50' : ''} ${isSelected ? 'bg-emerald-50/40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-zinc-900">
                          {d.toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {isToday && <span className="ml-1.5 text-[10px] text-emerald-500 font-bold">Today</span>}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Shift {record.shift_start}–{record.shift_end}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[record.status]}`}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </div>
                    {record.check_in && (
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <LogIn size={11} className="text-emerald-500" />
                          <span className="font-bold text-zinc-900">{record.check_in}</span>
                          {late > 0 && <span className="text-amber-500 font-semibold text-[10px]">+{late}m late</span>}
                        </span>
                        {record.check_out && (
                          <span className="flex items-center gap-1">
                            <LogOut size={11} className="text-red-400" />
                            <span className="font-bold text-zinc-900">{record.check_out}</span>
                          </span>
                        )}
                        {record.hours_worked > 0 && (
                          <span className="flex items-center gap-1 ml-auto">
                            <Clock size={11} className="text-zinc-300" />
                            {formatHours(record.hours_worked)}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {filteredRecords.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-bold text-zinc-900">{startRow}</span>–
                  <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
                  <span className="font-bold text-zinc-900">{filteredRecords.length}</span> records
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={16} className="text-zinc-600" />
                  </button>
                  <span className="text-xs text-zinc-500 font-medium min-w-[3.5rem] text-center">
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={16} className="text-zinc-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Read-only notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-100 rounded-xl shadow-sm">
        <AlertCircle size={13} className="text-zinc-300 shrink-0" />
        <p className="text-xs text-zinc-400">Records are managed by your administrator. Contact HR for any corrections.</p>
      </div>
        </>
      )}

        </>
      )}

      {/* Attendance Request Modal */}
      {showRequestModal && (
        <Modal title="Request Attendance" onClose={() => setShowRequestModal(false)}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-zinc-500">
              Request your admin or manager to update your attendance. Choose the type of request below.
            </p>

            {/* Request type */}
            <div className="grid grid-cols-3 gap-2">
              {(['regularization', 'half_day', 'full_day_change'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleReqTypeChange(t)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                    reqType === t
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  {t === 'regularization' && <ClipboardList size={16} />}
                  {t === 'half_day' && <Clock size={16} />}
                  {t === 'full_day_change' && <CalendarCheck size={16} />}
                  {REQUEST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {reqType === 'regularization' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      From Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={reqDate}
                      max={todayStr}
                      onChange={e => { setReqDate(e.target.value); if (reqToDate && e.target.value > reqToDate) setReqToDate(e.target.value); }}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      To Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={reqToDate}
                      min={reqDate || undefined}
                      max={todayStr}
                      onChange={e => setReqToDate(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {reqDate && reqToDate && reqToDate >= reqDate
                    ? `${countWorkingDays(reqDate, reqToDate)} working day${countWorkingDays(reqDate, reqToDate) > 1 ? 's' : ''} (Sundays excluded)`
                    : 'Select a valid date range'}
                </p>
              </>
            )}

            {reqType === 'half_day' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={reqDate}
                    max={todayStr}
                    onChange={e => setReqDate(e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      From Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={reqFromTime}
                      onChange={e => setReqFromTime(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      To Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={reqToTime}
                      onChange={e => setReqToTime(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Requesting a half day on the selected date. If approved, your attendance will be marked as Half Day.
                </p>
              </>
            )}

            {reqType === 'full_day_change' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={reqDate}
                    max={todayStr}
                    onChange={e => setReqDate(e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Request to change an approved Half Day into a Full Day (Present) so you can work the full shift.
                </p>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                Reason {reqType !== 'full_day_change' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={reqReason}
                onChange={e => setReqReason(e.target.value)}
                rows={3}
                placeholder={
                  reqType === 'half_day'
                    ? 'Explain why you need a half day and which half you will work...'
                    : reqType === 'full_day_change'
                    ? 'Explain why you want to change your half day to a full day...'
                    : 'Explain why you could not mark attendance on this day...'
                }
                className={inputClassName}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestSubmit}
                disabled={reqSubmitting || (
                  reqType === 'regularization' ? (!reqDate || !reqToDate || !reqReason.trim())
                  : reqType === 'half_day' ? (!reqDate || !reqFromTime || !reqToTime)
                  : (!reqDate || !reqReason.trim())
                )}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reqSubmitting
                  ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                  : <><ClipboardList size={14} /> Submit Request</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Punch Modal */}
      {showPunchModal && (
        <Modal title="Punch Attendance" onClose={() => { setShowPunchModal(false); resetPunchState(); }}>
          <div className="p-5 space-y-4">
            {toast && (
              <div className="p-3 bg-zinc-900 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-md">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>{toast}</span>
              </div>
            )}
            {/* Punch In / Out toggle (same as admin panel) */}
            <div className="flex items-center bg-zinc-100 rounded-xl p-1">
              <button type="button" onClick={() => setPunchMode('in')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${punchMode === 'in' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <LogIn size={16} />
                Punch In
              </button>
              <button type="button" onClick={() => setPunchMode('out')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${punchMode === 'out' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <LogOut size={16} />
                Punch Out
              </button>
            </div>

            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl p-3">
              <div>
                <p className="text-xs font-bold text-zinc-900">{todayStr}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{OFFICE_NAME} · Shift {DEFAULT_SHIFT_START}–{DEFAULT_SHIFT_END}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${punchMode === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {punchMode === 'in' ? 'Check In' : 'Check Out'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-400" />
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Current Time</p>
              </div>
              <p className="text-sm font-bold text-zinc-900 tabular-nums">{liveTime}</p>
            </div>
            <p className="text-[11px] text-zinc-400 -mt-1">
              The punch time is captured automatically when you tap {punchMode === 'in' ? 'Punch In' : 'Punch Out'}.
            </p>

            {/* Location Verification Box */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-600" /> Location Verification
                </span>
                <button
                  type="button"
                  onClick={verifyLocation}
                  disabled={geoVerifying}
                  className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {geoVerifying ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  Verify Current Location
                </button>
              </div>

              {geoVerifying && (
                <p className="text-xs text-zinc-500 flex items-center gap-1.5 animate-pulse py-1">
                  <Loader2 size={12} className="animate-spin text-blue-600 shrink-0" /> Fetching current GPS location...
                </p>
              )}

              {geoVerified && geoLat !== null && geoLng !== null && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold flex items-center gap-1 text-emerald-900">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> Verified Inside Office
                    </p>
                    <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                      {geoLat.toFixed(4)}, {geoLng.toFixed(4)} ({geoDistance}m from office)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-200/70 text-emerald-900 text-[10px] font-black rounded-md">
                    MATCHED
                  </span>
                </div>
              )}

              {geoError && !geoVerifying && (() => {
                const errInfo = getGeoErrorInfo();
                return errInfo ? (
                  <div className={`p-2.5 border rounded-lg text-xs flex items-start gap-2 ${
                    errInfo.icon === 'distance' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    errInfo.icon === 'block' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                    'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <AlertCircle size={14} className={`shrink-0 mt-0.5 ${
                      errInfo.icon === 'distance' ? 'text-amber-600' : 'text-rose-600'
                    }`} />
                    <div>
                      <p className={`font-bold ${errInfo.icon === 'distance' ? 'text-amber-900' : 'text-rose-900'}`}>
                        {errInfo.title}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${errInfo.icon === 'distance' ? 'text-amber-700' : 'text-rose-700'}`}>
                        {errInfo.message}
                      </p>
                      <p className={`text-[10px] mt-1 font-medium ${errInfo.icon === 'distance' ? 'text-amber-600' : 'text-rose-600'}`}>
                        {errInfo.hint}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {isDeliveryBoy && punchMode === 'in' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Uniform Photo <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-zinc-400 mb-2">Please take a photo of yourself in uniform to verify your identity.</p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                {punchPhoto ? (
                  <div className="flex items-center gap-3">
                    <img src={punchPhoto} alt="Uniform selfie" className="w-16 h-16 rounded-xl object-cover border border-zinc-200" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Photo captured
                      </p>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[11px] text-zinc-400 hover:text-zinc-700 underline mt-0.5"
                      >
                        Retake photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-zinc-300 hover:border-emerald-400 bg-zinc-50 hover:bg-emerald-50/50 text-zinc-500 hover:text-emerald-700 rounded-xl text-sm font-medium transition-all"
                  >
                    <Camera size={18} />
                    Take Uniform Photo
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowPunchModal(false); resetPunchState(); }}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handlePunchSubmit} disabled={punchLoading || !canPunch}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${punchLoading || !canPunch
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}>
                {punchLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : punchMode === 'in' ? (
                  <><UserCheck size={16} /> Punch In</>
                ) : (
                  <><UserX size={16} /> Punch Out</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
