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
import { exportAttendanceXlsx } from '../../lib/hrmsExports';
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

import Modal from '../../components/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea, fieldClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState } from '@/components/ui/empty-state';
// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  present:  'bg-accent text-accent-foreground border-primary/20',
  absent:   'bg-destructive/10 text-destructive border-destructive/20',
  late:     'bg-warning/10 text-warning border-warning/25',
  half_day: 'bg-info/10 text-info border-info/25',
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
  present:  'bg-primary/80',
  absent:   'bg-destructive/80',
  late:     'bg-warning/80',
  half_day: 'bg-info/80',
  overtime: 'bg-violet-400',
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  regularization: 'Missed Punch',
  half_day: 'Request Half day',
  full_day_change: 'Full Day Request',
};

const REQUEST_TYPE_STYLES: Record<string, string> = {
  regularization: 'bg-muted text-foreground/70',
  half_day: 'bg-info/10 text-info',
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

const inputClassName = fieldClass;

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

// ─── TodayCard ────────────────────────────────────────────────────────────────

function TodayCard({ record }: { record: AttendanceRecordOut | null }) {
  const todayLabel = new Date().toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!record) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
      >
        <p className="text-xs font-medium text-muted-foreground/70 mb-3">Today · {todayLabel}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <CalendarCheck size={18} className="text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground/70">No record yet</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">Your attendance hasn't been marked today</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const late = record.check_in
    ? lateMins(record.check_in, record.shift_start || DEFAULT_SHIFT_START)
    : 0;
  const isLate = record.status === 'late' || late > 30;

  const statusBg: Record<string, string> = {
    present:  'bg-primary',
    absent:   'bg-destructive',
    late:     'bg-warning',
    half_day: 'bg-info',
    overtime: 'bg-violet-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <p className="text-xs font-medium text-muted-foreground/70 mb-3">Today · {todayLabel}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-semibold ${isLate ? statusBg.late : statusBg[record.status]}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-card/50" />
          {isLate ? 'Late' : STATUS_LABELS[record.status]}
        </span>
        {(record.source === 'admin' || record.marked_by != null) && (
          <span className="px-2.5 py-1 rounded-lg bg-warning/15 text-warning text-xs font-medium">
            Admin
          </span>
        )}
        {record.check_in && (
          <span className="flex items-center gap-1 text-xs text-foreground/70">
            <LogIn size={13} className="text-primary" />
            <span className="font-semibold">{record.check_in}</span>
            {late > 0 && <span className="text-warning font-semibold ml-0.5">({late}m late)</span>}
          </span>
        )}
        {record.check_out && (
          <span className="flex items-center gap-1 text-xs text-foreground/70">
            <LogOut size={13} className="text-destructive" />
            <span className="font-semibold">{record.check_out}</span>
          </span>
        )}
        {record.hours_worked > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={13} className="text-muted-foreground/70" />
            <span className="font-semibold">{formatHours(record.hours_worked)}</span>
          </span>
        )}
        {(record.penalty_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-destructive">−₹{record.penalty_amount}</span>
        )}
        {(record.overtime_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-violet-600">+₹{record.overtime_amount} OT</span>
        )}
        <span className="flex items-center gap-1 text-xs text-muted-foreground/50 ml-auto">
          <Info size={12} />
          Shift {record.shift_start || DEFAULT_SHIFT_START}–{record.shift_end || DEFAULT_SHIFT_END}
        </span>
      </div>
      {(record.source === 'admin' || record.marked_by != null) && (
        <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm font-semibold text-warning">
          Admin marked your attendance{record.marked_by_name ? ` by ${record.marked_by_name}` : ''}
          {record.check_in && record.check_out ? ' — Punch in & Punch out' : record.check_in ? ' — Punch in' : record.check_out ? ' — Punch out' : ''}.
        </div>
      )}
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
      className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <p className="text-xs font-medium text-muted-foreground/70 mb-4">This Week</p>
      <div className="grid grid-cols-6 gap-2">
        {days.map((d) => {
          const ds = toDateStr(d);
          const rec = recMap.get(ds);
          const isToday = ds === toDateStr(today);
          const isFuture = d > today;
          const dayName = d.toLocaleDateString('default', { weekday: 'short' });

          return (
            <div key={ds} className="flex flex-col items-center gap-1.5">
              <span className={`text-xs font-medium ${isToday ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                {dayName}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isToday ? 'ring-2 ring-ring/20 ring-offset-2' : ''
              } ${
                isFuture
                  ? 'bg-muted border border-border'
                  : rec
                    ? STATUS_STYLES[rec.status].split(' border')[0]
                    : 'bg-muted border border-border'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isFuture || !rec ? 'bg-border' : STATUS_DOT[rec.status]
                }`} />
              </div>
              {!isFuture && rec && (
                <span className={`text-[11px] font-semibold text-center leading-tight ${STATUS_STYLES[rec.status].split(' ').slice(1, 3).join(' ')}`}>
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
        className="bg-card border border-border rounded-xl p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)] flex items-center gap-2.5"
      >
        <Info size={14} className="text-muted-foreground/50 shrink-0" />
        <p className="text-xs text-muted-foreground/70">Select a date on the calendar to see full details.</p>
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
        className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
      >
        <p className="text-xs font-medium text-muted-foreground/70 mb-3">{label}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <CalendarCheck size={18} className="text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{isSunday ? 'Weekly Off' : 'No record for this date'}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {isSunday ? 'Sunday is a weekly off day.' : 'No attendance was marked for this day.'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const late = record.check_in
    ? lateMins(record.check_in, record.shift_start || DEFAULT_SHIFT_START)
    : 0;
  const isLate = record.status === 'late' || late > 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-xs font-medium text-muted-foreground/70">{label}</p>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${isLate ? STATUS_STYLES.late : STATUS_STYLES[record.status]}`}>
            {isLate ? 'Late' : STATUS_LABELS[record.status]}
          </span>
          {(record.source === 'admin' || record.marked_by != null) && (
            <span className="px-2 py-1 rounded-lg bg-warning/15 text-warning text-[11px] font-semibold uppercase">Admin</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {record.check_in ? (
          <span className="flex items-center gap-1.5 text-xs text-foreground/70">
            <LogIn size={13} className="text-primary" />
            <span className="font-semibold">{record.check_in}</span>
            {late > 0 && <span className="text-warning font-semibold ml-0.5">({late}m late)</span>}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <LogIn size={13} className="text-muted-foreground/50" />
            No check-in
          </span>
        )}
        {record.check_out ? (
          <span className="flex items-center gap-1.5 text-xs text-foreground/70">
            <LogOut size={13} className="text-destructive" />
            <span className="font-semibold">{record.check_out}</span>
          </span>
        ) : (
          record.check_in && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <LogOut size={13} className="text-muted-foreground/50" />
              No check-out
            </span>
          )
        )}
        {record.hours_worked > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={13} className="text-muted-foreground/70" />
            <span className="font-semibold">{formatHours(record.hours_worked)}</span>
          </span>
        )}
        {(record.penalty_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-destructive">−₹{record.penalty_amount}</span>
        )}
        {(record.overtime_amount ?? 0) > 0 && (
          <span className="text-xs font-semibold text-violet-600">+₹{record.overtime_amount} OT</span>
        )}
        <span className="flex items-center gap-1 text-xs text-muted-foreground/50 ml-auto">
          <Info size={12} />
          Shift {record.shift_start || DEFAULT_SHIFT_START}–{record.shift_end || DEFAULT_SHIFT_END}
        </span>
      </div>
      {(record.source === 'admin' || record.marked_by != null) && (
        <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm font-semibold text-warning">
          Admin marked your attendance{record.marked_by_name ? ` by ${record.marked_by_name}` : ''}
          {record.check_in && record.check_out ? ' — Punch in & Punch out' : record.check_in ? ' — Punch in' : record.check_out ? ' — Punch out' : ''}.
        </div>
      )}
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
      className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={15} className="text-muted-foreground/70" />
        <p className="text-xs font-medium text-muted-foreground/70">Weekly Hours</p>
        {overtimeHrs > 0 && (
          <Badge className="ml-auto  text-violet-600 bg-violet-50" >
            +{formatHours(overtimeHrs)} overtime
          </Badge>
        )}
      </div>
      <div className="flex items-end gap-3 h-14">
        {weeks.map((w) => {
          const pct = Math.round((w.hours / max) * 100);
          return (
            <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground leading-none mb-1">
                {formatHours(w.hours)}
              </span>
              <div className="w-full bg-secondary rounded-md flex items-end" style={{ height: 32 }}>
                {/* plain div with CSS transition — no Framer Motion % animation */}
                <div
                  className="w-full bg-primary/80 rounded-md transition-all duration-500"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground/70 font-semibold leading-none mt-1">{w.label}</span>
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
  const [exporting, setExporting] = useState(false);
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
    { label: 'Present',     value: summary.present,              color: 'bg-accent text-accent-foreground' },
    { label: 'Absent',      value: summary.absent,               color: 'bg-destructive/10 text-destructive' },
    { label: 'Late',        value: summary.late,                 color: 'bg-warning/10 text-warning' },
    { label: 'Half Day',    value: summary.half_day,             color: 'bg-info/10 text-info' },
    { label: 'Attendance',  value: `${summary.attendancePct}%`,  color: 'bg-secondary text-foreground/85' },
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

  // Server-side so the export covers the whole selected range rather than the
  // rows currently rendered. The backend scopes it to this user automatically.
  const handleExport = async () => {
    if (!token || exporting) return;
    setExporting(true);
    try {
      await exportAttendanceXlsx(token, {
        from_date: dateFrom,
        to_date: dateTo,
        status: statusFilter,
        // Required: the server only auto-scopes non-admins, so without this an
        // admin or manager opening their own page would export everybody.
        staff_id: user?.id,
        // An employee's own punch locations add nothing here and would make the
        // download wait on a third-party lookup.
        include_area: false,
      });
      showToast('Attendance exported as Excel.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
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
            className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle2 size={16} className="text-primary" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <PageHeader title="My Attendance" description={`${user?.username} · Personal attendance history`} actions={<>
<div className="flex items-center gap-2">
          <button onClick={() => setShowCalendar(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${showCalendar
              ? 'bg-primary text-white border border-primary/30 hover:bg-primary'
              : 'bg-card text-foreground/70 border border-border hover:bg-muted'}`}>
            <CalendarDays size={14} />
            Calendar View
          </button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}
            >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          <Button variant="dark" size="sm" onClick={openPunch}
            >
            <LogIn size={14} />
            Punch In / Out
          </Button>
          <Button variant="outline" size="sm" onClick={openRequestModal}
            >
            <ClipboardList size={14} />
            Request Attendance
          </Button>
        </div>
</>} />

      {/* Calendar View — shows ONLY the calendar; everything else is hidden */}
      {showCalendar ? (
        <>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
        >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck size={15} className="text-muted-foreground/70" />
            <h3 className="font-semibold text-foreground text-sm">{monthLabel(viewYear, viewMonth)}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth}
              >
              <ChevronLeft size={18} />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToToday}
              >
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth} disabled={isCurrentMonth}
              >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(n => (
            <div key={n} className="text-center text-xs font-medium text-muted-foreground/70">{n}</div>
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
              : isSunday ? 'bg-muted/70 text-destructive' : 'bg-muted/60 text-muted-foreground/70';
            return (
              <button key={ds} onClick={() => setSelectedDate(ds)}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] sm:min-h-[54px] rounded-lg text-xs font-semibold transition-all cursor-pointer hover:brightness-95 ${cellStyle}  ${isSelected ? 'ring-2 ring-ring/30 ring-offset-1' : ''}  ${!inMonth ? 'opacity-40' : ''}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${isToday ? 'bg-foreground text-white' : ''}`}>
                  {day.getDate()}
                </span>
                {rec ? (
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[rec.status]}`} />
                    {rec.hours_worked > 0 && (
                      <span className="text-[8px] font-semibold text-muted-foreground/70 hidden sm:inline">{formatHours(rec.hours_worked)}</span>
                    )}
                  </span>
                ) : isSunday ? (
                  <span className="text-[8px] font-semibold uppercase tracking-wide hidden sm:inline">Off</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border">
          {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(k => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
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
            className={`rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm ${s.color}`}
          >
            <p className="text-2xl font-semibold text-foreground leading-none">{s.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>



      {/* Weekly hours bars */}
      {weeklyHours.length > 0 && (
        <WeeklyBars weeks={weeklyHours} overtimeHrs={summary.overtimeHrs} />
      )}

      {/* Logs / Requests toggle — same pattern as admin Shift Types / Settings */}
      <div className="space-y-2">
        <Segmented className="w-fit" value={String(activePanel)} onValueChange={(v) => setActivePanel(v as never)} options={([
            { key: 'logs' as const, label: 'Logs', icon: FileText },
            { key: 'requests' as const, label: 'Attendance Requests', icon: ClipboardList },
          ]).map((tab) => ({ value: String(tab.key), label: <><tab.icon size={15} />
              {tab.label}
              {tab.key === 'requests' && myRequests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="ml-0.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-warning/15 text-warning text-[11px] font-semibold flex items-center justify-center">
                  {myRequests.filter((r) => r.status === 'pending').length}
                </span>
              )}</> }))} />
        <p className="text-[11px] text-muted-foreground/70 px-0.5">
          {activePanel === 'logs'
            ? 'Logs are your daily attendance history — date, status, check-in / check-out times, hours worked, and shift timing.'
            : 'Attendance requests are changes you submitted for approval (missed punch, request half day, full day request).'}
        </p>
      </div>

      {activePanel === 'requests' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-muted-foreground/70" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">My Attendance Requests</h3>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {myRequests.length} total &middot; {myRequests.filter((r) => r.status === 'pending').length} pending
                </p>
              </div>
            </div>
            <Button variant="dark" size="sm"
              type="button"
              onClick={openRequestModal}
              
            >
              <ClipboardList size={13} />
              New Request
            </Button>
          </div>
          {myRequests.length === 0 ? (
            <EmptyState icon={<Inbox />} title="No attendance requests" description="Submit a request when you need a missed punch, request half day, or full day request." className="border-0" action={<><Button variant="outline" size="sm"
                type="button"
                onClick={openRequestModal}
                
              >
                <ClipboardList size={13} />
                Request Attendance
              </Button></>} />
          ) : (
            <>
              <div className="divide-y divide-border">
                {pagedRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-semibold ${REQUEST_TYPE_STYLES[req.request_type] || 'bg-muted text-foreground/70'}`}>
                        {REQUEST_TYPE_LABELS[req.request_type]?.charAt(0) || 'R'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70">
                          {req.from_date}{req.from_date !== req.to_date ? ` \u2013 ${req.to_time ? req.from_time + ' \u2013 ' + req.to_time : req.to_date}` : (req.from_time ? ` \u2013 ${req.from_time}\u2013${req.to_time}` : '')}
                          {req.days > 1 ? ` \u00B7 ${req.days} days` : ''}
                        </p>
                        {req.reason && <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{req.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {req.notes && (
                        <span className="text-[11px] text-muted-foreground/70 max-w-[120px] truncate hidden sm:inline" title={req.notes}>
                          Note: {req.notes}
                        </span>
                      )}
                      <Badge className={`capitalize ${ req.status === 'approved' ? 'bg-accent text-primary' : req.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning' }`}>
                        {req.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{requestStartRow}</span>–
                  <span className="font-semibold text-foreground">{requestEndRow}</span> of{' '}
                  <span className="font-semibold text-foreground">{myRequests.length}</span> requests
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm"
                    type="button"
                    onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                    disabled={requestPage <= 1}
                    
                  >
                    <ChevronLeft size={16} className="text-foreground/70" />
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium min-w-[3.5rem] text-center">
                    {requestPage} / {requestTotalPages}
                  </span>
                  <Button variant="outline" size="icon-sm"
                    type="button"
                    onClick={() => setRequestPage((p) => Math.min(requestTotalPages, p + 1))}
                    disabled={requestPage >= requestTotalPages}
                    
                  >
                    <ChevronRight size={16} className="text-foreground/70" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      ) : (
        <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search date, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
          />
        </div>
        <Input className="w-auto" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
           />
        <Input className="w-auto" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
           />
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
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors">
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      {/* Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[90px_1fr_130px_130px_100px_90px] bg-muted/50 border-b border-border px-4 py-3">
          {sortColumns.map(h => (
            <button key={h.k} onClick={() => toggleSort(h.k)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground/70 hover:text-foreground/85 transition-colors">
              {h.label}
              {sortKey === h.k
                ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                : <ArrowUpDown size={11} className="opacity-50" />}
            </button>
          ))}
          <span className="text-xs font-medium text-muted-foreground/70">Shift</span>
        </div>

        {filteredRecords.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No records found" description="No attendance data matches your filters" className="border-0" />
        ) : (
          <>
            {/* Desktop rows */}
            <div className="hidden md:block divide-y divide-border">
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
                    className={`grid grid-cols-[90px_1fr_130px_130px_100px_90px] px-4 py-3 items-center hover:bg-muted/50 transition-colors ${isToday ? 'bg-muted' : ''}  ${isSelected ? 'bg-accent/50' : ''}`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground whitespace-nowrap">
                        {d.toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {d.toLocaleDateString('default', { weekday: 'short' })}
                        {isToday && <span className="ml-1 text-primary font-semibold">· Today</span>}
                      </p>
                    </div>
                    <div>
                      <Badge className={`${STATUS_STYLES[record.status]}`}>
                        {STATUS_LABELS[record.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-foreground/70">
                      {record.check_in ? (
                        <>
                          <LogIn size={12} className="text-primary shrink-0" />
                          <span className="font-semibold">{record.check_in}</span>
                          {late > 0 && <span className="text-warning text-[11px] font-semibold ml-0.5">+{late}m</span>}
                        </>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-foreground/70">
                      {record.check_out ? (
                        <>
                          <LogOut size={12} className="text-destructive shrink-0" />
                          <span className="font-semibold">{record.check_out}</span>
                        </>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={11} className="text-muted-foreground/50 shrink-0" />
                      <span className="font-semibold">{formatHours(record.hours_worked)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/50 whitespace-nowrap">
                      {record.shift_start}–{record.shift_end}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
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
                    className={`p-4 space-y-2 ${isToday ? 'bg-muted' : ''}  ${isSelected ? 'bg-accent/40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {d.toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {isToday && <span className="ml-1.5 text-[11px] text-primary font-semibold">Today</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">Shift {record.shift_start}–{record.shift_end}</p>
                      </div>
                      <Badge className={`${STATUS_STYLES[record.status]}`}>
                        {STATUS_LABELS[record.status]}
                      </Badge>
                    </div>
                    {record.check_in && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <LogIn size={11} className="text-primary" />
                          <span className="font-semibold text-foreground">{record.check_in}</span>
                          {late > 0 && <span className="text-warning font-semibold text-[11px]">+{late}m late</span>}
                        </span>
                        {record.check_out && (
                          <span className="flex items-center gap-1">
                            <LogOut size={11} className="text-destructive" />
                            <span className="font-semibold text-foreground">{record.check_out}</span>
                          </span>
                        )}
                        {record.hours_worked > 0 && (
                          <span className="flex items-center gap-1 ml-auto">
                            <Clock size={11} className="text-muted-foreground/50" />
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
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startRow}</span>–
                  <span className="font-semibold text-foreground">{endRow}</span> of{' '}
                  <span className="font-semibold text-foreground">{filteredRecords.length}</span> records
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    >
                    <ChevronLeft size={16} className="text-foreground/70" />
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium min-w-[3.5rem] text-center">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="icon-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    >
                    <ChevronRight size={16} className="text-foreground/70" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Read-only notice */}
      <Card className="flex items-center gap-2 px-4 py-2.5" >
        <AlertCircle size={13} className="text-muted-foreground/50 shrink-0" />
        <p className="text-xs text-muted-foreground/70">Records are managed by your administrator. Contact HR for any corrections.</p>
      </Card>
        </>
      )}

        </>
      )}

      {/* Attendance Request Modal */}
      {showRequestModal && (
        <Modal title="Request Attendance" onClose={() => setShowRequestModal(false)}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
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
                      ? 'border-primary/30 bg-accent text-accent-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
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
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      From Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={reqDate}
                      max={todayStr}
                      onChange={e => { setReqDate(e.target.value); if (reqToDate && e.target.value > reqToDate) setReqToDate(e.target.value); }}
                      
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      To Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={reqToDate}
                      min={reqDate || undefined}
                      max={todayStr}
                      onChange={e => setReqToDate(e.target.value)}
                      
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  {reqDate && reqToDate && reqToDate >= reqDate
                    ? `${countWorkingDays(reqDate, reqToDate)} working day${countWorkingDays(reqDate, reqToDate) > 1 ? 's' : ''} (Sundays excluded)`
                    : 'Select a valid date range'}
                </p>
              </>
            )}

            {reqType === 'half_day' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={reqDate}
                    max={todayStr}
                    onChange={e => setReqDate(e.target.value)}
                    
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      From Time <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="time"
                      value={reqFromTime}
                      onChange={e => setReqFromTime(e.target.value)}
                      
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      To Time <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="time"
                      value={reqToTime}
                      onChange={e => setReqToTime(e.target.value)}
                      
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Requesting a half day on the selected date. If approved, your attendance will be marked as Half Day.
                </p>
              </>
            )}

            {reqType === 'full_day_change' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={reqDate}
                    max={todayStr}
                    onChange={e => setReqDate(e.target.value)}
                    
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Request to change an approved Half Day into a Full Day (Present) so you can work the full shift.
                </p>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Reason {reqType !== 'full_day_change' && <span className="text-destructive">*</span>}
              </label>
              <Textarea
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
                
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1"
                type="button"
                onClick={() => setShowRequestModal(false)}
                
              >
                Cancel
              </Button>
              <Button className="flex-1"
                type="button"
                onClick={handleRequestSubmit}
                disabled={reqSubmitting || (
                  reqType === 'regularization' ? (!reqDate || !reqToDate || !reqReason.trim())
                  : reqType === 'half_day' ? (!reqDate || !reqFromTime || !reqToTime)
                  : (!reqDate || !reqReason.trim())
                )}
                
              >
                {reqSubmitting
                  ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                  : <><ClipboardList size={14} /> Submit Request</>
                }
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Punch Modal */}
      {showPunchModal && (
        <Modal title="Punch Attendance" onClose={() => { setShowPunchModal(false); resetPunchState(); }}>
          <div className="p-5 space-y-4">
            {toast && (
              <div className="p-3 bg-foreground text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-md">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span>{toast}</span>
              </div>
            )}
            {/* Punch In / Out toggle (same as admin panel) */}
            <Segmented value={String(punchMode)} onValueChange={(v) => { ({ ['in']: (() => setPunchMode('in')), ['out']: (() => setPunchMode('out')) } as Record<string, () => void>)[v]?.(); }} options={[
  { value: 'in', label: <><LogIn size={16} />
                Punch In</> },
  { value: 'out', label: <><LogOut size={16} />
                Punch Out</> }
]} />

            <div className="flex items-center justify-between bg-muted border border-border rounded-xl p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">{todayStr}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{OFFICE_NAME} · Shift {DEFAULT_SHIFT_START}–{DEFAULT_SHIFT_END}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${punchMode === 'in' ? 'bg-accent text-accent-foreground' : 'bg-warning/10 text-warning'}`}>
                {punchMode === 'in' ? 'Check In' : 'Check Out'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-muted border border-border rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground/70" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Time</p>
              </div>
              <p className="text-sm font-semibold text-foreground tabular-nums">{liveTime}</p>
            </div>
            <p className="text-[11px] text-muted-foreground/70 -mt-1">
              The punch time is captured automatically when you tap {punchMode === 'in' ? 'Punch In' : 'Punch Out'}.
            </p>

            {/* Location Verification Box */}
            <div className="p-3.5 bg-muted border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" /> Location Verification
                </span>
                <Button variant="dark" size="xs"
                  type="button"
                  onClick={verifyLocation}
                  disabled={geoVerifying}
                  
                >
                  {geoVerifying ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  Verify Current Location
                </Button>
              </div>

              {geoVerifying && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse py-1">
                  <Loader2 size={12} className="animate-spin text-info shrink-0" /> Fetching current GPS location...
                </p>
              )}

              {geoVerified && geoLat !== null && geoLng !== null && (
                <div className="p-2.5 bg-accent border border-primary/20 rounded-lg text-xs text-accent-foreground flex items-center justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-1 text-accent-foreground">
                      <CheckCircle2 size={13} className="text-primary shrink-0" /> Verified Inside Office
                    </p>
                    <p className="text-[11px] text-accent-foreground font-mono mt-0.5">
                      {geoLat.toFixed(4)}, {geoLng.toFixed(4)} ({geoDistance}m from office)
                    </p>
                  </div>
                  <Badge variant="success" >
                    MATCHED
                  </Badge>
                </div>
              )}

              {geoError && !geoVerifying && (() => {
                const errInfo = getGeoErrorInfo();
                return errInfo ? (
                  <div className={`p-2.5 border rounded-lg text-xs flex items-start gap-2 ${
                    errInfo.icon === 'distance' ? 'bg-warning/10 border-warning/25 text-warning' :
                    errInfo.icon === 'block' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                    'bg-destructive/10 border-destructive/20 text-destructive'
                  }`}>
                    <AlertCircle size={14} className={`shrink-0 mt-0.5 ${
                      errInfo.icon === 'distance' ? 'text-warning' : 'text-destructive'
                    }`} />
                    <div>
                      <p className={`font-semibold ${errInfo.icon === 'distance' ? 'text-warning' : 'text-destructive'}`}>
                        {errInfo.title}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${errInfo.icon === 'distance' ? 'text-warning' : 'text-destructive'}`}>
                        {errInfo.message}
                      </p>
                      <p className={`text-[11px] mt-1 font-medium ${errInfo.icon === 'distance' ? 'text-warning' : 'text-destructive'}`}>
                        {errInfo.hint}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {isDeliveryBoy && punchMode === 'in' && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Uniform Photo <span className="text-destructive">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground/70 mb-2">Please take a photo of yourself in uniform to verify your identity.</p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoCapture}
                  className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-accent"
                />
                {punchPhoto ? (
                  <div className="flex items-center gap-3">
                    <img src={punchPhoto} alt="Uniform selfie" className="w-16 h-16 rounded-xl object-cover border border-border" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-accent-foreground flex items-center gap-1">
                        <CheckCircle2 size={13} /> Photo captured
                      </p>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[11px] text-muted-foreground/70 hover:text-foreground/85 underline mt-0.5"
                      >
                        Retake photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="lg" className="w-full hover:border-primary/30 hover:bg-accent/50 hover:text-accent-foreground"
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    
                  >
                    <Camera size={18} />
                    Take Uniform Photo
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => { setShowPunchModal(false); resetPunchState(); }}
                >
                Cancel
              </Button>
              <button type="button" onClick={handlePunchSubmit} disabled={punchLoading || !canPunch}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${punchLoading || !canPunch
                  ? 'bg-secondary text-muted-foreground/70 cursor-not-allowed'
                  : 'bg-foreground hover:bg-foreground text-white'}`}>
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
