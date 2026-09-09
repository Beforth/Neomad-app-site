import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  CalendarCheck, Clock, Receipt, TrendingUp, FileText, LogIn,
  ChevronRight, Inbox,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getMyAttendanceRecords, getMyAttendanceSummary, type AttendanceRecordOut, type AttendanceMySummaryOut } from '../../lib/hrmsApi';
import { getMyExpenses, getExpenseSummary, type Expense, type ExpenseSummaryOut } from '../../lib/hrmsExpenses';
import { getMyLeaveBalances, type LeaveBalanceOut } from '../../lib/hrmsLeave';

const CHART_STYLE = {
  contentStyle: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  cursor: { fill: '#f8fafc' },
};

const TODAY_STATUS: Record<string, { label: string; color: string }> = {
  present:  { label: 'Present',  color: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  absent:   { label: 'Absent',   color: 'bg-rose-50 text-rose-700 border border-rose-100' },
  late:     { label: 'Late',     color: 'bg-amber-50 text-amber-700 border border-amber-100' },
  half_day: { label: 'Half Day', color: 'bg-blue-50 text-blue-700 border border-blue-100' },
  overtime: { label: 'Overtime', color: 'bg-violet-50 text-violet-700 border border-violet-100' },
};

const EXPENSE_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-100',
  draft:    'bg-zinc-50 text-zinc-600 border border-zinc-100',
};

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  pending:  '#f59e0b',
  approved: '#10b981',
  rejected: '#f43f5e',
  draft:    '#a1a1aa',
};

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

function getMonthPrefix(d: Date) {
  return `${d.getFullYear()}-${padZ(d.getMonth() + 1)}`;
}

function inr(n: number) {
  return `\u20B9${n.toLocaleString('en-IN')}`;
}

function shortDate(ds: string) {
  if (!ds) return '';
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleString('default', { day: 'numeric', month: 'short' });
}

export default function EmployeeDashboard() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);

  const [attendance, setAttendance] = useState<AttendanceRecordOut[]>([]);
  const [mySummary, setMySummary] = useState<AttendanceMySummaryOut | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummaryOut | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceOut[]>([]);

  const fetchData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = getMonday(now);
      const calFrom = toDateStr(weekStart);
      const calTo = toDateStr(addDays(weekStart, 41));

      const [attRecs, summary, expData, expSummary, balances] = await Promise.all([
        getMyAttendanceRecords(token, { from_date: calFrom, to_date: calTo }),
        getMyAttendanceSummary(token).catch(() => null),
        getMyExpenses(token).catch(() => []),
        getExpenseSummary(token).catch(() => null),
        getMyLeaveBalances(token).catch(() => []),
      ]);
      setAttendance(attRecs);
      setMySummary(summary);
      setExpenses(expData);
      setExpenseSummary(expSummary);
      setLeaveBalances(balances);
    } catch (e) {
      console.error('Dashboard fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayStr = toDateStr(new Date());
  const todayRecord = attendance.find(r => r.date === todayStr);
  const todayStatus = todayRecord && TODAY_STATUS[todayRecord.status]
    ? TODAY_STATUS[todayRecord.status]
    : { label: 'Not Marked', color: 'bg-zinc-100 text-zinc-500 border border-zinc-100' };

  const monthPrefix = getMonthPrefix(new Date());
  const monthRecords = attendance.filter(r => r.date.startsWith(monthPrefix));
  const presentDays = monthRecords.filter(r => r.status !== 'absent').length;
  const attendanceRate = mySummary?.attendance_rate ?? (monthRecords.length ? Math.round((presentDays / monthRecords.length) * 100) : 0);
  const monthHours = mySummary?.hours_worked_month ?? Math.round(monthRecords.reduce((s, r) => s + (r.hours_worked || 0), 0));

  const weekStart = getMonday(new Date());
  const weeklyAttendance = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const ds = toDateStr(d);
    const recs = attendance.filter(r => r.date === ds);
    return {
      day: i === 6 ? 'Today' : d.toLocaleString('default', { weekday: 'short' }),
      present: recs.filter(r => r.status !== 'absent').length,
      absent: recs.filter(r => r.status === 'absent').length,
    };
  });

  const pendingExpenses = expenseSummary?.pending ?? expenses.filter(e => e.status === 'pending').length;

  const expenseBreakdown = (() => {
    if (expenseSummary) {
      return [
        { name: 'Pending',  value: expenseSummary.pending,  color: EXPENSE_STATUS_COLORS.pending },
        { name: 'Approved', value: expenseSummary.approved, color: EXPENSE_STATUS_COLORS.approved },
        { name: 'Rejected', value: expenseSummary.rejected, color: EXPENSE_STATUS_COLORS.rejected },
        { name: 'Draft',    value: expenseSummary.draft,    color: EXPENSE_STATUS_COLORS.draft },
      ].filter(x => x.value > 0);
    }
    return [
      { name: 'Pending',  value: expenses.filter(e => e.status === 'pending').length,  color: EXPENSE_STATUS_COLORS.pending },
      { name: 'Approved', value: expenses.filter(e => e.status === 'approved').length, color: EXPENSE_STATUS_COLORS.approved },
      { name: 'Rejected', value: expenses.filter(e => e.status === 'rejected').length, color: EXPENSE_STATUS_COLORS.rejected },
      { name: 'Draft',    value: expenses.filter(e => e.status === 'draft').length,    color: EXPENSE_STATUS_COLORS.draft },
    ].filter(x => x.value > 0);
  })();

  const monthExpenses = expenses.filter(e => e.date?.startsWith(monthPrefix));
  const weeklyTotals = [0, 0, 0, 0];
  monthExpenses.forEach(e => {
    const day = parseInt((e.date || '').slice(8, 10), 10);
    if (!isNaN(day)) weeklyTotals[Math.min(3, Math.floor((day - 1) / 7))] += e.total ?? e.amount ?? 0;
  });
  const monthlyExpenses = weeklyTotals.map((amount, i) => ({ week: `Week ${i + 1}`, amount }));

  const recentExpenses = [...expenses]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  const activity = [
    ...attendance
      .filter(r => r.check_in)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map(r => ({
        icon: LogIn, color: 'bg-emerald-50 text-emerald-600',
        text: `You checked in at ${r.check_in}`, time: shortDate(r.date),
      })),
    ...expenses
      .filter(e => e.status !== 'draft')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 3)
      .map(e => ({
        icon: FileText, color: 'bg-blue-50 text-blue-600',
        text: `You submitted an expense claim (${e.category || 'Expense'})`, time: shortDate(e.date || ''),
      })),
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);

  const monthLabel = new Date().toLocaleString('default', { month: 'long' });

  const totalLeaveRemaining = leaveBalances.reduce((s, b) => s + b.remaining, 0);
  const totalLeaveUsed = leaveBalances.reduce((s, b) => s + b.used, 0);

  const stats = [
    { label: 'Today', value: todayStatus.label, icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600', badge: todayStatus.color, link: '/hrms/attendance' },
    { label: 'Attend. Rate', value: `${attendanceRate}%`, icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600', link: '/hrms/attendance' },
    { label: 'Hours / Month', value: `${monthHours}h`, icon: Clock, color: 'bg-blue-50 text-blue-600', link: '/hrms/attendance' },
    { label: 'Pending Expenses', value: pendingExpenses, icon: Receipt, color: 'bg-amber-50 text-amber-600', link: '/hrms/expenses' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Overview of your work</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-12 text-center text-sm text-zinc-400">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of your work</p>
      </div>

      {/* Compact Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stats.map((stat, i) => (
          <Link to={stat.link} key={stat.label} className="block">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div className="min-w-0">
              {stat.badge ? (
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${stat.badge}`}>
                  {stat.value}
                </span>
              ) : (
                <p className="text-lg font-extrabold text-zinc-900 leading-none truncate">{stat.value}</p>
              )}
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1 truncate">{stat.label}</p>
            </div>
          </motion.div>
          </Link>
        ))}
      </div>

      {/* Leave Balance Card */}
      {leaveBalances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-100 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Leave Balance</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{totalLeaveRemaining} days remaining &middot; {totalLeaveUsed} used</p>
            </div>
            <Link to="/hrms/leave" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {leaveBalances.map(b => (
              <span key={b.leave_type_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] font-semibold text-zinc-600">
                {b.leave_type_name}
                <span className="font-bold text-zinc-900">{b.remaining}/{b.total}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts Row 1: Weekly Attendance + Expense Breakdown */}
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
              <h3 className="font-bold text-zinc-900">My Weekly Attendance</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Present vs absent this week</p>
            </div>
            <Link to="/hrms/attendance" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyAttendance} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} domain={[0, 1]} allowDecimals={false} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="absent" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Expense Breakdown PieChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full flex flex-col"
        >
          <div className="mb-4">
            <h3 className="font-bold text-zinc-900">My Expense Breakdown</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Your claims by status</p>
          </div>
          <div className="flex items-center gap-6 flex-1">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={expenseBreakdown.length ? expenseBreakdown : [{ name: 'No claims', value: 1, color: '#e4e4e7' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {expenseBreakdown.length
                    ? expenseBreakdown.map((entry, idx) => <Cell key={idx} fill={entry.color} />)
                    : <Cell key={0} fill="#e4e4e7" />}
                </Pie>
                <Tooltip {...CHART_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {expenseBreakdown.length ? expenseBreakdown.map((x) => (
                <div key={x.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: x.color }} />
                    <span className="text-sm text-zinc-600">{x.name}</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">{x.value}</span>
                </div>
              )) : (
                <p className="text-sm text-zinc-400">No expense claims yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2: Monthly Expenses + Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Expenses BarChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-900">My Monthly Expenses</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Weekly breakdown for {monthLabel}</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...CHART_STYLE} formatter={(v: number) => [inr(v), 'Amount']} />
                <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="font-bold text-zinc-900">Recent Expenses</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Your latest claims</p>
            </div>
            <Link to="/hrms/expenses" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {recentExpenses.length ? recentExpenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {(exp.category || 'E')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{exp.category || 'Expense'}</p>
                    <p className="text-xs text-zinc-400">{shortDate(exp.date || '')} &middot; {inr(exp.total ?? exp.amount ?? 0)}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-2 ${EXPENSE_STATUS_STYLES[exp.status] || ''}`}>
                  {exp.status}
                </span>
              </div>
            )) : (
              <p className="px-5 py-6 text-sm text-zinc-400">No expenses yet. Submit your first claim.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* My Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-zinc-900">My Activity</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Your recent check-ins and submissions</p>
          </div>
        </div>
        <div className="space-y-0 divide-y divide-zinc-50">
          {activity.length ? activity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon size={14} />
              </div>
              <p className="text-sm text-zinc-700 flex-1 min-w-0 truncate">{item.text}</p>
              <span className="text-xs text-zinc-400 shrink-0 ml-2">{item.time}</span>
            </div>
          )) : (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Inbox size={16} className="text-zinc-300" />
              <p className="text-sm text-zinc-400">No recent activity</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
