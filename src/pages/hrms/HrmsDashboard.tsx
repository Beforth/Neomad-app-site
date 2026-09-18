import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users, Receipt, TrendingUp, TrendingDown,
  UserPlus, FileText, CalendarOff, CheckCircle2,
  ChevronRight, UserCheck, UserX
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';
import {
  getAttendanceWeekly, getStaffDepartments, getRecentActivity,
  type AttendanceWeeklyPointOut, type ActivityItemOut,
} from '../../lib/hrmsApi';
import { getExpenseSummary, listExpenses, expenseTotal, formatINR } from '../../lib/hrmsExpenses';
import { listLeaveRequests, type LeaveRequestOut } from '../../lib/hrmsLeave';

const CHART_STYLE = {
  contentStyle: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  cursor: { fill: '#f8fafc' },
};

/** Department names are user-defined, so colours are assigned by position. */
const DEPT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e'];
const UNASSIGNED_COLOR = '#d4d4d8';

const LEAVE_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-100',
  cancelled: 'bg-zinc-100 text-zinc-500 border border-zinc-200',
};

const ACTIVITY_STYLES: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  check_in: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  expense: { icon: FileText, color: 'bg-blue-50 text-blue-600' },
  leave: { icon: CalendarOff, color: 'bg-amber-50 text-amber-600' },
  join: { icon: UserPlus, color: 'bg-purple-50 text-purple-600' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/** "Jul 15 - Jul 16", or a single date when start and end match. */
function formatRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };
  return start === end ? fmt(start) : `${fmt(start)} - ${fmt(end)}`;
}

/** Clock time for today's events, otherwise a short date. */
function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/** Bucket a month's expenses into calendar weeks (1-7, 8-14, 15-21, 22+). */
function weeklyExpenseBuckets(rows: { date: string; total: number }[]) {
  const buckets = [0, 0, 0, 0];
  for (const row of rows) {
    const day = new Date(row.date).getDate();
    if (Number.isNaN(day)) continue;
    const idx = Math.min(3, Math.floor((day - 1) / 7));
    buckets[idx] += row.total;
  }
  return buckets.map((amount, i) => ({ week: `Week ${i + 1}`, amount }));
}

interface DeptSlice { name: string; value: number; color: string }

export default function HrmsDashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [pendingExpenses, setPendingExpenses] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<AttendanceWeeklyPointOut[]>([]);
  const [departments, setDepartments] = useState<DeptSlice[]>([]);
  const [expenseWeeks, setExpenseWeeks] = useState<{ week: string; amount: number }[]>([]);
  const [expenseDelta, setExpenseDelta] = useState<number | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestOut[]>([]);
  const [activity, setActivity] = useState<ActivityItemOut[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const [
      usersRes, weeklyRes, deptRes, expSummaryRes, expListRes, leaveRes, activityRes,
    ] = await Promise.allSettled([
      getUsers(token),
      getAttendanceWeekly(token, 7),
      getStaffDepartments(token),
      getExpenseSummary(token),
      listExpenses(token),
      listLeaveRequests(token),
      getRecentActivity(token, 6),
    ]);

    if (usersRes.status === 'fulfilled') {
      const data = usersRes.value;
      setStats({
        total: data.length,
        active: data.filter((u) => u.is_active).length,
        inactive: data.filter((u) => !u.is_active).length,
      });
    }

    if (weeklyRes.status === 'fulfilled') {
      setWeekly(weeklyRes.value.points);
      setAttendanceRate(weeklyRes.value.attendance_rate);
    }

    if (deptRes.status === 'fulfilled') {
      const slices: DeptSlice[] = deptRes.value.departments.map((d, i) => ({
        name: d.name,
        value: d.count,
        color: DEPT_COLORS[i % DEPT_COLORS.length],
      }));
      if (deptRes.value.unassigned > 0) {
        slices.push({ name: 'Unassigned', value: deptRes.value.unassigned, color: UNASSIGNED_COLOR });
      }
      setDepartments(slices);
    }

    if (expSummaryRes.status === 'fulfilled') setPendingExpenses(expSummaryRes.value.pending);

    if (expListRes.status === 'fulfilled') {
      const now = new Date();
      const thisMonth: { date: string; total: number }[] = [];
      let lastMonthTotal = 0;
      let thisMonthTotal = 0;
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      for (const e of expListRes.value) {
        const d = new Date(e.date);
        if (Number.isNaN(d.getTime())) continue;
        const total = expenseTotal(e);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          thisMonth.push({ date: e.date, total });
          thisMonthTotal += total;
        } else if (d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()) {
          lastMonthTotal += total;
        }
      }
      setExpenseWeeks(weeklyExpenseBuckets(thisMonth));
      setExpenseDelta(
        lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : null,
      );
    }

    if (leaveRes.status === 'fulfilled') setLeaveRequests(leaveRes.value.slice(0, 5));
    if (activityRes.status === 'fulfilled') setActivity(activityRes.value);

    const failed = [usersRes, weeklyRes, deptRes, expSummaryRes, expListRes, leaveRes, activityRes]
      .filter((r) => r.status === 'rejected').length;
    if (failed > 0) setError(`${failed} dashboard section${failed > 1 ? 's' : ''} could not be loaded.`);

    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const maxAttendance = Math.max(1, ...weekly.map((p) => p.present + p.absent));
  const hasExpenseData = expenseWeeks.some((w) => w.amount > 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">Overview of your workforce</p>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold hover:underline shrink-0">Retry</button>
        </div>
      )}

      {/* Compact Stat Cards */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactive', value: stats.inactive, icon: UserX, color: 'bg-zinc-100 text-zinc-500' },
          { label: 'Pending Exp.', value: pendingExpenses ?? '—', icon: Receipt, color: 'bg-rose-50 text-rose-600' },
          {
            label: 'Attend. Rate',
            value: attendanceRate === null ? '—' : `${attendanceRate}%`,
            icon: TrendingUp,
            color: 'bg-cyan-50 text-cyan-600',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-zinc-900 leading-none">
                {loading ? <span className="inline-block w-8 h-4 bg-zinc-100 rounded animate-pulse" /> : stat.value}
              </p>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1: Attendance + Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Attendance BarChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-900">Weekly Attendance</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Present vs absent, last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Present</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-200" />Absent</span>
            </div>
          </div>
          {weekly.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-zinc-400">
              {loading ? 'Loading…' : 'No attendance records yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} domain={[0, maxAttendance]} allowDecimals={false} />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="absent" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Department Distribution PieChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full flex flex-col"
        >
          <div className="mb-4">
            <h3 className="font-bold text-zinc-900">Department Distribution</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Active staff by department</p>
          </div>
          {departments.length === 0 ? (
            <div className="flex-1 min-h-[140px] flex items-center justify-center text-sm text-zinc-400">
              {loading ? 'Loading…' : 'No staff yet'}
            </div>
          ) : (
            <div className="flex items-center gap-6 flex-1">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={departments}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {departments.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {departments.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                      <span className="text-sm text-zinc-600 truncate">{dept.name}</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 shrink-0 ml-2">{dept.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Charts Row 2: Expenses + Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Expense Summary BarChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-900">Monthly Expenses</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Weekly breakdown for {MONTH_NAMES[new Date().getMonth()]}
              </p>
            </div>
            {expenseDelta !== null && (
              <div
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                  expenseDelta > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'
                }`}
              >
                {expenseDelta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{Math.abs(expenseDelta)}% vs last month</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[180px]">
            {!hasExpenseData ? (
              <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-zinc-400">
                {loading ? 'Loading…' : 'No expenses this month'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseWeeks}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...CHART_STYLE} formatter={(v: number) => [formatINR(v), 'Amount']} />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Leave Requests */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="font-bold text-zinc-900">Leave Requests</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Most recent requests</p>
            </div>
            <Link to="/hrms/leave" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          {leaveRequests.length === 0 ? (
            <div className="px-5 pb-5 text-sm text-zinc-400">
              {loading ? 'Loading…' : 'No leave requests yet'}
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {leaveRequests.map((req) => {
                const name = req.employee_name || req.employee_email || 'Unknown';
                return (
                  <div key={req.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{name}</p>
                        <p className="text-xs text-zinc-400 truncate">
                          {req.leave_type_name || 'Leave'} &middot; {formatRange(req.start_date, req.end_date)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-2 ${LEAVE_STATUS_STYLES[req.status] || LEAVE_STATUS_STYLES.cancelled}`}>
                      {req.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-zinc-900">Recent Activity</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Latest updates from your team</p>
          </div>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-zinc-400">{loading ? 'Loading…' : 'No recent activity'}</p>
        ) : (
          <div className="space-y-0 divide-y divide-zinc-50">
            {activity.map((item, i) => {
              const style = ACTIVITY_STYLES[item.kind] || ACTIVITY_STYLES.join;
              const Icon = style.icon;
              return (
                <div key={`${item.kind}-${i}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.color}`}>
                    <Icon size={14} />
                  </div>
                  <p className="text-sm text-zinc-700 flex-1 min-w-0 truncate">{item.text}</p>
                  <span className="text-xs text-zinc-400 shrink-0 ml-2">{formatActivityTime(item.at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
