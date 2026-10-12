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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/app-shell';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState } from '@/components/ui/empty-state';

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
  active:    'bg-accent text-accent-foreground border-primary/20',
  pending:   'bg-warning/10 text-warning border-warning/25',
  cancelled: 'bg-secondary text-muted-foreground border-border',
  ended:     'bg-secondary text-muted-foreground border-border',
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
          <h1 className="text-xl font-semibold tracking-tight text-foreground">My Shifts</h1>
          <p className="text-[13px] text-muted-foreground">Your shift schedule</p>
        </div>
        <Card className="p-12 text-center text-sm text-muted-foreground/70" >
          Loading your shifts…
        </Card>
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
            className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle2 size={16} className="text-primary" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <PageHeader title="My Shifts" description={`${user?.username} · Your assigned shift schedule`} />

      {/* Clean Theme Card: Assigned Shift Details */}
      {primaryActive ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent border border-primary/20 flex items-center justify-center">
                <Briefcase size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Current Assigned Shift</h2>
                <p className="text-xs text-muted-foreground font-medium">Official shift record assigned by Admin</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Active Assignment
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-muted/70 border border-border rounded-xl p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground/70">Shift Name</p>
              <p className="text-sm font-semibold text-foreground mt-1">{primaryActive.shift_type_name}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground/70">Shift Timings</p>
              <p className="text-xs font-semibold text-foreground/85 mt-1 flex items-center gap-1">
                <Clock size={13} className="text-primary" />
                {formatShiftTimeRange(primaryActive.start_time, primaryActive.end_time) || 'Standard Hours'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground/70">Assigned Period & End Date</p>
              <p className="text-xs font-semibold text-foreground mt-1 leading-relaxed">
                From: <span className="font-semibold text-foreground">{formatDateLabel(primaryActive.effective_from)}</span>
                <br />
                To: {primaryActive.effective_to ? (
                  <>
                    <span className="font-semibold text-warning">
                      {formatDateLabel(primaryActive.effective_to)} ({getDaysRemainingText(primaryActive.effective_to)})
                    </span>
                    <span className="block text-[11px] text-muted-foreground font-medium mt-0.5">
                      ↳ Returns to Default Morning shift after {formatDateLabel(primaryActive.effective_to)}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-accent-foreground">Ongoing (Permanent Shift)</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground/70">Working Days & Location</p>
              <p className="text-xs font-semibold text-foreground/85 mt-1 flex items-center gap-1">
                <MapPin size={12} className="text-muted-foreground/70" />
                {primaryActive.location} · Mon–Sat
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/25 flex items-center justify-center">
            <Info size={18} className="text-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No active shift assigned</p>
            <p className="text-xs text-muted-foreground mt-0.5">Contact your HR manager to assign your shift schedule.</p>
          </div>
        </motion.div>
      )}

      {/* Clean Theme Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-muted-foreground/70" />
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

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(n => (
            <div key={n} className="text-center text-xs font-medium text-muted-foreground/70 py-1">{n}</div>
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
              ? 'bg-destructive/10 text-destructive border-transparent'
              : isToday
                ? 'bg-primary text-white font-bold shadow-sm border-transparent'
                : isSelected
                  ? 'bg-card text-foreground ring-2 ring-ring/30 border-transparent'
                  : hasAllocation
                    ? isPast
                      ? 'bg-muted/60 text-muted-foreground border-border hover:bg-secondary'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                    : 'bg-muted/50 text-muted-foreground/70 border-transparent';

            return (
              <button key={ds} onClick={() => setSelectedDate(ds)}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-[48px] sm:min-h-[56px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${cellBg}  ${!inMonth ? 'opacity-30' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${isToday ? 'font-semibold text-white' : ''}`}>
                  {day.getDate()}
                </span>
                {isSunday ? (
                  <span className="text-[8px] font-semibold text-destructive uppercase tracking-wide">Off</span>
                ) : hasAllocation ? (
                  isPast ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 my-0.5" title={`Past Shift: ${allocs[0].shift_type_name} (Click date for details)`} />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className={`text-[11px] truncate max-w-[50px] hidden sm:inline ${isToday ? 'text-primary-foreground font-semibold' : 'text-foreground/85 font-semibold'}`}>
                        {allocs[0].shift_type_name?.split(' ')[0]}
                      </span>
                    </div>
                  )
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 pt-3 border-t border-border">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Shift Assigned
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Past Shift
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            Today
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span className="w-2 h-2 rounded-full bg-destructive/80" />
            Sunday · Weekly Off
          </span>
        </div>
      </motion.div>

      {/* Selected Day Details */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground/70">
              Selected Date · {formatDateLabel(selectedDate)}
            </p>
            <button onClick={() => setSelectedDate(null)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          {selectedDayAllocations.length > 0 ? (
            <div className="space-y-2">
              {selectedDayAllocations.map(a => {
                const isPastAlloc = a.date < todayStr;
                return (
                  <div key={`${a.id}-${a.date}`} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl p-3.5 ${isPastAlloc ? 'bg-muted/80 border-border' : 'bg-muted border-border'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${isPastAlloc ? 'bg-secondary border-border text-muted-foreground/70' : 'bg-accent border-primary/20 text-primary'}`}>
                        <Briefcase size={16} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${isPastAlloc ? 'text-foreground' : 'text-foreground'}`}>{a.shift_type_name}</p>
                          <Badge className={`${isPastAlloc ? 'text-muted-foreground bg-secondary border-border' : 'text-accent-foreground bg-accent border-primary/20'}`}>
                            {isPastAlloc ? 'Past Shift (Completed)' : a.status || 'Active Shift'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground/85">
                            <Clock size={13} className="text-muted-foreground/70" />
                            {formatShiftTimeRange(a.start_time, a.end_time) || 'Timing not set'}
                            {getShiftDurationHours(a.start_time, a.end_time) && (
                              <span className="text-muted-foreground/70 font-normal">({getShiftDurationHours(a.start_time, a.end_time)})</span>
                            )}
                          </span>
                          {a.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={13} className="text-muted-foreground/70" />
                              {a.location}
                            </span>
                          )}
                          {a.staff_name && (
                            <span className="flex items-center gap-1 text-muted-foreground/70">
                              Assigned to: <span className="font-semibold text-foreground/85">{a.staff_name}</span>
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
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Info size={18} className="text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/70">
                  {selectedIsSunday ? 'Weekly Off' : 'No shift allocated'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
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
        className="bg-card rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <CalendarDays size={16} className="text-muted-foreground/70" />
              Shift Assignment Records
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Your official shift allocation history</p>
          </div>

          {/* Filter Tabs */}
          <Segmented value={String(assignmentTab)} onValueChange={(v) => { ({ ['active']: (() => setAssignmentTab('active')), ['ended']: (() => setAssignmentTab('ended')) } as Record<string, () => void>)[v]?.(); }} options={[
  { value: 'active', label: <><Check size={12} className="text-primary" />
              Active ({activeAssignmentsList.length})</> },
  { value: 'ended', label: <><History size={12} />
              Ended ({endedAssignmentsList.length})</> }
]} />
        </div>

        {((assignmentTab === 'active' ? activeAssignmentsList : endedAssignmentsList).length === 0) ? (
          <EmptyState icon={<Inbox />} title={`No ${assignmentTab === 'active' ? 'active' : 'ended'} shift assignments`} description={assignmentTab === 'active' ? 'You currently do not have any active shift assignments.' : 'No ended or past shift records found.'} className="border-0" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left uppercase">Shift Name</TableHead>
                  <TableHead className="text-left uppercase">Timing</TableHead>
                  <TableHead className="text-left uppercase">Working Days</TableHead>
                  <TableHead className="text-left uppercase">Assigned From Date</TableHead>
                  <TableHead className="text-left uppercase">Assigned To Date</TableHead>
                  <TableHead className="text-left uppercase">Location</TableHead>
                  <TableHead className="text-left uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assignmentTab === 'active' ? activeAssignmentsList : endedAssignmentsList).map((a, i) => {
                  const displayStatus = assignmentDisplayStatus(a, todayStr);
                  const timeLabel = formatShiftTimeRange(a.start_time, a.end_time);
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/70"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                            <Briefcase size={14} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{a.shift_type_name}</p>
                            <p className="text-[11px] text-muted-foreground/70">Assignment ID: #{a.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs font-medium text-foreground/85">
                          <Clock size={12} className="text-muted-foreground/70 shrink-0" />
                          {timeLabel || <span className="text-muted-foreground/50">—</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {a.working_days.filter((d) => d !== 'sun').map(d => (
                            <Badge className="uppercase" key={d} >
                              {DAY_LABELS[d] || d}
                            </Badge>
                          ))}
                          {a.working_days.filter((d) => d !== 'sun').length === 0 && (
                            <span className="text-xs text-muted-foreground/70">Mon–Sat</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground/85">
                        {formatDateLabel(a.effective_from)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground/85">
                        {a.effective_to ? (
                          <span className="text-warning font-semibold">{formatDateLabel(a.effective_to)}</span>
                        ) : (
                          <span className="text-accent-foreground font-semibold">Ongoing (Permanent)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={11} className="text-muted-foreground/70" />
                          {a.location}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${STATUS_STYLES[displayStatus] || ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${displayStatus === 'active' ? 'bg-primary' : displayStatus === 'pending' ? 'bg-warning' : 'bg-muted-foreground/40'}`} />
                          {STATUS_LABELS[displayStatus] || displayStatus}
                        </span>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
