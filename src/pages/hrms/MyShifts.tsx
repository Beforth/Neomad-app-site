import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2,
  MapPin, CalendarDays, Inbox, Briefcase, Info, X, Calendar as CalendarIcon,
  Check, History, Sparkles,
} from 'lucide-react';
import {
  listShiftAssignments,
  listShiftCalendar,
  formatShiftTimeRange,
  type ShiftAssignment,
  type DailyShiftAllocation,
} from '../../lib/hrmsShifts';
import { DAY_LABELS } from '../../lib/api';

// ─── Helpers ───────────────────────────────────────────────────────────────

function padZ(n: number) { return String(n).padStart(2, '0'); }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${padZ(d.getMonth() + 1)}-${padZ(d.getDate())}`;
}

function getMonday(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function formatDateLabel(dStr: string) {
  if (!dStr) return '';
  const d = new Date(dStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function getShiftDurationHours(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return '';
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  if (isNaN(h1) || isNaN(h2)) return '';
  let startMin = h1 * 60 + (m1 || 0);
  let endMin = h2 * 60 + (m2 || 0);
  if (endMin < startMin) endMin += 24 * 60;
  const diffHours = (endMin - startMin) / 60;
  return `${diffHours.toFixed(1)} Hours`;
}

function getDaysRemainingText(effectiveTo: string): string {
  if (!effectiveTo) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(effectiveTo + 'T00:00:00');
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Ended';
  if (diffDays === 0) return 'Ends today';
  if (diffDays === 1) return 'Ends tomorrow';
  return `${diffDays} days left`;
}

// ─── Theme Styles ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  ended:     'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  pending:   'Upcoming',
  cancelled: 'Cancelled',
  ended:     'Ended',
};

function assignmentDisplayStatus(a: ShiftAssignment, todayStr: string): string {
  if (a.status === 'cancelled' || a.is_active === false) return 'cancelled';
  if (a.effective_to && a.effective_to < todayStr) return 'ended';
  if (a.effective_from > todayStr) return 'pending';
  return a.status || 'active';
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function MyShifts() {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [calendarDays, setCalendarDays] = useState<DailyShiftAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const today = new Date();
  const todayStr = toDateStr(today);

  // Calendar navigation
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [assignmentTab, setAssignmentTab] = useState<'active' | 'ended'>('active');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const calFrom = toDateStr(getMonday(monthStart(new Date(viewYear, viewMonth))));
      const calTo = toDateStr(addDays(new Date(viewYear, viewMonth + 1, 0), 42 - new Date(viewYear, viewMonth + 1, 0).getDate()));

      const [myAssignments, myCalendar] = await Promise.all([
        listShiftAssignments(token),
        listShiftCalendar(token, calFrom, calTo),
      ]);
      setAssignments(myAssignments);
      setCalendarDays(myCalendar);
    } catch (error) {
      console.error('Failed to load shift data:', error);
      showToast(error instanceof Error ? error.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, viewYear, viewMonth]);

  // ─── Calendar Grid ─────────────────────────────────────────────────────

  const calendarGrid = useMemo(() => {
    const start = getMonday(monthStart(new Date(viewYear, viewMonth)));
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(start, i));
    return days;
  }, [viewYear, viewMonth]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < 6; i++) w.push(calendarGrid.slice(i * 7, i * 7 + 7));
    return w;
  }, [calendarGrid]);

  const calendarMap = useMemo(() => {
    const m = new Map<string, DailyShiftAllocation[]>();
    calendarDays.forEach(d => {
      // Exclude past ended allocations from calendar if date is before today and status is ended
      const list = m.get(d.date) || [];
      list.push(d);
      m.set(d.date, list);
    });
    return m;
  }, [calendarDays]);

  // ─── Categorized Assignments ──────────────────────────────────────────

  const { activeAssignmentsList, endedAssignmentsList } = useMemo(() => {
    const active: ShiftAssignment[] = [];
    const ended: ShiftAssignment[] = [];
    assignments.forEach((a) => {
      const st = assignmentDisplayStatus(a, todayStr);
      if (st === 'ended' || st === 'cancelled') {
        ended.push(a);
      } else {
        active.push(a);
      }
    });
    active.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    ended.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    return { activeAssignmentsList: active, endedAssignmentsList: ended };
  }, [assignments, todayStr]);

  const primaryActive = activeAssignmentsList.length > 0 ? activeAssignmentsList[0] : null;

  // ─── Navigation ────────────────────────────────────────────────────────

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

  // ─── Selected Day ─────────────────────────────────────────────────────

  const selectedDayAllocations = useMemo(() => {
    if (!selectedDate) return [];
    const day = new Date(selectedDate + 'T00:00:00');
    if (day.getDay() === 0) return []; // Sunday weekly holiday

    const list = calendarMap.get(selectedDate);
    if (list && list.length > 0) return list;

    // Fallback: match assignments covering this date
    const matching = assignments.filter((a) => {
      if (a.is_active === false || a.status === 'cancelled') return false;
      if (a.effective_from > selectedDate) return false;
      if (a.effective_to && a.effective_to < selectedDate) return false;
      return true;
    });

    return matching.map((a) => ({
      id: a.id,
      assignment_id: a.id,
      staff_id: a.staff_id,
      staff_name: a.staff_name,
      date: selectedDate,
      shift_type_id: a.shift_type_id,
      shift_type_name: a.shift_type_name || 'Assigned Shift',
      start_time: a.start_time || undefined,
      end_time: a.end_time || undefined,
      location: a.location,
      status: a.status || 'active',
    }));
  }, [selectedDate, calendarMap, assignments]);

  const selectedIsSunday = selectedDate
    ? new Date(selectedDate + 'T00:00:00').getDay() === 0
    : false;

  // ─── Loading State ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Shifts</h1>
          <p className="text-sm text-zinc-500 mt-1">Your shift schedule</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-12 text-center text-sm text-zinc-400">
          Loading your shifts…
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

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

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Shifts</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{user?.username} · Your assigned shift schedule</p>
        </div>
      </motion.header>

      {/* Clean Theme Card: Assigned Shift Details */}
      {primaryActive ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Briefcase size={16} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-zinc-900">Current Assigned Shift</h2>
                <p className="text-xs text-zinc-500 font-medium">Official shift record assigned by Admin</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active Assignment
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-50/70 border border-zinc-100 rounded-xl p-4">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Shift Name</p>
              <p className="text-sm font-extrabold text-zinc-900 mt-1">{primaryActive.shift_type_name}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Shift Timings</p>
              <p className="text-xs font-semibold text-zinc-700 mt-1 flex items-center gap-1">
                <Clock size={13} className="text-emerald-600" />
                {formatShiftTimeRange(primaryActive.start_time, primaryActive.end_time) || 'Standard Hours'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assigned Period & End Date</p>
              <p className="text-xs font-semibold text-zinc-800 mt-1 leading-relaxed">
                From: <span className="font-bold text-zinc-900">{formatDateLabel(primaryActive.effective_from)}</span>
                <br />
                To: {primaryActive.effective_to ? (
                  <>
                    <span className="font-bold text-amber-700">
                      {formatDateLabel(primaryActive.effective_to)} ({getDaysRemainingText(primaryActive.effective_to)})
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-medium mt-0.5">
                      ↳ Returns to Default Morning shift after {formatDateLabel(primaryActive.effective_to)}
                    </span>
                  </>
                ) : (
                  <span className="font-bold text-emerald-700">Ongoing (Permanent Shift)</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Working Days & Location</p>
              <p className="text-xs font-semibold text-zinc-700 mt-1 flex items-center gap-1">
                <MapPin size={12} className="text-zinc-400" />
                {primaryActive.location} · Mon–Sat
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Info size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900">No active shift assigned</p>
            <p className="text-xs text-zinc-500 mt-0.5">Contact your HR manager to assign your shift schedule.</p>
          </div>
        </motion.div>
      )}

      {/* Clean Theme Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-zinc-400" />
            <h3 className="font-bold text-zinc-900 text-sm">{monthLabel(viewYear, viewMonth)}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth}
              className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors">
              Today
            </button>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(n => (
            <div key={n} className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider py-1">{n}</div>
          ))}
        </div>

        {/* Soft Clean Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {weeks.flat().map((day) => {
            const ds = toDateStr(day);
            const isSunday = day.getDay() === 0;
            const allocs = isSunday ? [] : (calendarMap.get(ds) || []);
            const isToday = ds === todayStr;
            const isPast = ds < todayStr;
            const inMonth = day.getMonth() === viewMonth;
            const isSelected = selectedDate === ds;
            const hasAllocation = allocs.length > 0;

            const cellBg = isSunday
              ? 'bg-red-50/50 text-red-400 border-transparent'
              : isToday
                ? 'bg-emerald-600 text-white font-bold shadow-sm border-transparent'
                : isSelected
                  ? 'bg-white text-zinc-900 ring-2 ring-emerald-500 border-transparent'
                  : hasAllocation
                    ? isPast
                      ? 'bg-zinc-50/60 text-zinc-500 border-zinc-200/40 hover:bg-zinc-100'
                      : 'bg-white text-zinc-800 border-zinc-200/70 hover:bg-zinc-50'
                    : 'bg-zinc-50/50 text-zinc-400 border-transparent';

            return (
              <button key={ds} onClick={() => setSelectedDate(ds)}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-[48px] sm:min-h-[56px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${cellBg} ${!inMonth ? 'opacity-30' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${isToday ? 'font-extrabold text-white' : ''}`}>
                  {day.getDate()}
                </span>
                {isSunday ? (
                  <span className="text-[8px] font-semibold text-red-400 uppercase tracking-wide">Off</span>
                ) : hasAllocation ? (
                  isPast ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 my-0.5" title={`Past Shift: ${allocs[0].shift_type_name} (Click date for details)`} />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className={`text-[9px] truncate max-w-[50px] hidden sm:inline ${isToday ? 'text-emerald-100 font-extrabold' : 'text-zinc-700 font-semibold'}`}>
                        {allocs[0].shift_type_name?.split(' ')[0]}
                      </span>
                    </div>
                  )
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 pt-3 border-t border-zinc-100">
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Shift Assigned
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Past Shift
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            Today
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Sunday · Weekly Off
          </span>
        </div>
      </motion.div>

      {/* Selected Day Details */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Selected Date · {formatDateLabel(selectedDate)}
            </p>
            <button onClick={() => setSelectedDate(null)} className="text-zinc-300 hover:text-zinc-500 transition-colors">
              <X size={16} />
            </button>
          </div>
          {selectedDayAllocations.length > 0 ? (
            <div className="space-y-2">
              {selectedDayAllocations.map(a => {
                const isPastAlloc = a.date < todayStr;
                return (
                  <div key={`${a.id}-${a.date}`} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl p-3.5 ${isPastAlloc ? 'bg-zinc-50/80 border-zinc-200/70' : 'bg-zinc-50 border-zinc-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${isPastAlloc ? 'bg-zinc-100 border-zinc-200 text-zinc-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                        <Briefcase size={16} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${isPastAlloc ? 'text-zinc-800' : 'text-zinc-900'}`}>{a.shift_type_name}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${isPastAlloc ? 'text-zinc-500 bg-zinc-100 border-zinc-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                            {isPastAlloc ? 'Past Shift (Completed)' : a.status || 'Active Shift'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1 font-medium text-zinc-700">
                            <Clock size={13} className="text-zinc-400" />
                            {formatShiftTimeRange(a.start_time, a.end_time) || 'Timing not set'}
                            {getShiftDurationHours(a.start_time, a.end_time) && (
                              <span className="text-zinc-400 font-normal">({getShiftDurationHours(a.start_time, a.end_time)})</span>
                            )}
                          </span>
                          {a.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={13} className="text-zinc-400" />
                              {a.location}
                            </span>
                          )}
                          {a.staff_name && (
                            <span className="flex items-center gap-1 text-zinc-400">
                              Assigned to: <span className="font-semibold text-zinc-700">{a.staff_name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                <Info size={18} className="text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-600">
                  {selectedIsSunday ? 'Weekly Off' : 'No shift allocated'}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedIsSunday
                    ? 'Sunday is a weekly holiday — no shifts are scheduled.'
                    : 'No shift has been assigned for this date.'}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Shift Assignment Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
              <CalendarDays size={16} className="text-zinc-400" />
              Shift Assignment Records
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Your official shift allocation history</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setAssignmentTab('active')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                assignmentTab === 'active' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Check size={12} className="text-emerald-500" />
              Active ({activeAssignmentsList.length})
            </button>
            <button
              onClick={() => setAssignmentTab('ended')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                assignmentTab === 'ended' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <History size={12} />
              Ended ({endedAssignmentsList.length})
            </button>
          </div>
        </div>

        {((assignmentTab === 'active' ? activeAssignmentsList : endedAssignmentsList).length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
              <Inbox size={22} className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              No {assignmentTab === 'active' ? 'active' : 'ended'} shift assignments
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              {assignmentTab === 'active' ? 'You currently do not have any active shift assignments.' : 'No ended or past shift records found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Shift Name</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Timing</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Working Days</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Assigned From Date</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Assigned To Date</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Location</th>
                  <th className="text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(assignmentTab === 'active' ? activeAssignmentsList : endedAssignmentsList).map((a, i) => {
                  const displayStatus = assignmentDisplayStatus(a, todayStr);
                  const timeLabel = formatShiftTimeRange(a.start_time, a.end_time);
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Briefcase size={14} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{a.shift_type_name}</p>
                            <p className="text-[10px] text-zinc-400">Assignment ID: #{a.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1 text-xs font-medium text-zinc-700">
                          <Clock size={12} className="text-zinc-400 shrink-0" />
                          {timeLabel || <span className="text-zinc-300">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.working_days.filter((d) => d !== 'sun').map(d => (
                            <span key={d} className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded uppercase">
                              {DAY_LABELS[d] || d}
                            </span>
                          ))}
                          {a.working_days.filter((d) => d !== 'sun').length === 0 && (
                            <span className="text-xs text-zinc-400">Mon–Sat</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-zinc-700">
                        {formatDateLabel(a.effective_from)}
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-zinc-700">
                        {a.effective_to ? (
                          <span className="text-amber-700 font-bold">{formatDateLabel(a.effective_to)}</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Ongoing (Permanent)</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <MapPin size={11} className="text-zinc-400" />
                          {a.location}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border capitalize ${STATUS_STYLES[displayStatus] || ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${displayStatus === 'active' ? 'bg-emerald-500' : displayStatus === 'pending' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                          {STATUS_LABELS[displayStatus] || displayStatus}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
