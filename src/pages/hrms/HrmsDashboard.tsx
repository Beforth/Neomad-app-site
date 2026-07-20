import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users, CalendarCheck, Clock, Receipt, TrendingUp,
  UserPlus, FileText, CalendarOff, AlertCircle, CheckCircle2,
  ChevronRight, LayoutDashboard, UserCheck, UserX
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getUsers } from '../../lib/api';

const CHART_STYLE = {
  contentStyle: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  cursor: { fill: '#f8fafc' },
};

const WEEKLY_ATTENDANCE = [
  { day: 'Mon', present: 22, absent: 2 },
  { day: 'Tue', present: 20, absent: 4 },
  { day: 'Wed', present: 23, absent: 1 },
  { day: 'Thu', present: 21, absent: 3 },
  { day: 'Fri', present: 19, absent: 5 },
  { day: 'Sat', present: 18, absent: 6 },
  { day: 'Today', present: 20, absent: 4 },
];

const DEPARTMENT_DATA = [
  { name: 'Delivery', value: 8, color: '#10b981' },
  { name: 'Operations', value: 6, color: '#3b82f6' },
  { name: 'Warehouse', value: 5, color: '#f59e0b' },
  { name: 'Office Admin', value: 5, color: '#a855f7' },
];

const MONTHLY_EXPENSES = [
  { week: 'Week 1', amount: 42500 },
  { week: 'Week 2', amount: 38200 },
  { week: 'Week 3', amount: 51800 },
  { week: 'Week 4', amount: 33100 },
];

const LEAVE_REQUESTS = [
  { id: 1, staff: 'Amit Tandon', type: 'Sick Leave', dates: 'Jul 15 - Jul 16', status: 'pending' },
  { id: 2, staff: 'Meena Devi', type: 'Casual Leave', dates: 'Jul 18 - Jul 19', status: 'approved' },
  { id: 3, staff: 'Ravi Kumar', type: 'Earned Leave', dates: 'Jul 20 - Jul 22', status: 'approved' },
  { id: 4, staff: 'Sneha Patil', type: 'Sick Leave', dates: 'Jul 14', status: 'rejected' },
  { id: 5, staff: 'Vikram Joshi', type: 'Casual Leave', dates: 'Jul 21 - Jul 22', status: 'pending' },
];

const LEAVE_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const RECENT_ACTIVITY = [
  { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', text: 'Ravi Kumar checked in', time: '9:02 AM' },
  { icon: FileText, color: 'bg-blue-50 text-blue-600', text: 'Priya Sharma submitted expense report', time: '10:15 AM' },
  { icon: CalendarOff, color: 'bg-amber-50 text-amber-600', text: 'Amit Tandon requested sick leave', time: '11:30 AM' },
  { icon: UserPlus, color: 'bg-purple-50 text-purple-600', text: 'Kavita Reddy joined the team', time: 'Yesterday' },
  { icon: AlertCircle, color: 'bg-rose-50 text-rose-600', text: 'Meena Devi marked inactive', time: 'Yesterday' },
  { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', text: 'Arjun Nair completed shift', time: 'Yesterday' },
];

export default function HrmsDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      if (token) {
        const data = await getUsers(token);
        setStats({
          total: data.length,
          active: data.filter((u: any) => u.is_active).length,
          inactive: data.filter((u: any) => !u.is_active).length,
        });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">HRMS Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of your workforce</p>
      </div>

      {/* Compact Stat Cards */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactive', value: stats.inactive, icon: UserX, color: 'bg-zinc-100 text-zinc-500' },
          { label: 'Pending Exp.', value: '—', icon: Receipt, color: 'bg-rose-50 text-rose-600' },
          { label: 'Attend. Rate', value: '92%', icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600' },
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
              <p className="text-lg font-extrabold text-zinc-900 leading-none">{stat.value}</p>
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
              <p className="text-xs text-zinc-400 mt-0.5">Present vs absent this week</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Present</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-200" />Absent</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY_ATTENDANCE} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} domain={[0, 25]} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="absent" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
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
            <p className="text-xs text-zinc-400 mt-0.5">Staff count by department</p>
          </div>
          <div className="flex items-center gap-6 flex-1">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={DEPARTMENT_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {DEPARTMENT_DATA.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...CHART_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {DEPARTMENT_DATA.map((dept) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-sm text-zinc-600">{dept.name}</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">{dept.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2: Expenses + Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Expense Summary BarChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-900">Monthly Expenses</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Weekly breakdown for July</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={12} />
              <span>12% vs last month</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_EXPENSES}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...CHART_STYLE} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']} />
              <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
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
              <p className="text-xs text-zinc-400 mt-0.5">Recent requests this month</p>
            </div>
            <Link to="/hrms/leave" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {LEAVE_REQUESTS.map((req) => (
              <div key={req.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {req.staff.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{req.staff}</p>
                    <p className="text-xs text-zinc-400">{req.type} &middot; {req.dates}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-2 ${LEAVE_STATUS_STYLES[req.status]}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
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
        <div className="space-y-0 divide-y divide-zinc-50">
          {RECENT_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon size={14} />
              </div>
              <p className="text-sm text-zinc-700 flex-1 min-w-0 truncate">{item.text}</p>
              <span className="text-xs text-zinc-400 shrink-0 ml-2">{item.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
