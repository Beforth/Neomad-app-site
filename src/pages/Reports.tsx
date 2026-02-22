import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Download, Clock, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const deliveryData = [
  { name: 'Mon', deliveries: 45, time: 22, waiting: 8 },
  { name: 'Tue', deliveries: 52, time: 25, waiting: 10 },
  { name: 'Wed', deliveries: 38, time: 20, waiting: 5 },
  { name: 'Thu', deliveries: 65, time: 28, waiting: 14 },
  { name: 'Fri', deliveries: 48, time: 24, waiting: 9 },
  { name: 'Sat', deliveries: 30, time: 18, waiting: 4 },
  { name: 'Sun', deliveries: 25, time: 15, waiting: 3 },
];

const availabilityData = [
  { name: 'Sagar', available: 480, delivery: 210, waiting: 90 },
  { name: 'Rahul', available: 420, delivery: 185, waiting: 65 },
  { name: 'Amit', available: 390, delivery: 160, waiting: 50 },
  { name: 'Pooja', available: 450, delivery: 230, waiting: 80 },
];

const pieData = [
  { name: 'On Time', value: 85, color: '#10b981' },
  { name: 'Delayed', value: 10, color: '#f59e0b' },
  { name: 'Cancelled', value: 5, color: '#ef4444' },
];

const DELIVERY_BOYS = ['All Boys', 'Sagar Wagh', 'Rahul Patil', 'Amit Shinde', 'Pooja Kale'];

const CHART_STYLE = {
  contentStyle: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  cursor: { fill: '#f8fafc' },
};

export default function Reports() {
  const [tab, setTab] = useState<'delivery' | 'availability'>('delivery');
  const [dateRange, setDateRange] = useState('7d');
  const [boyFilter, setBoyFilter] = useState('All Boys');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Reports</h1>
          <p className="text-xs text-zinc-500 font-medium">Analyze delivery efficiency and performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-600 shadow-sm">
            <Calendar size={14} className="text-zinc-400" />
            <select className="bg-transparent outline-none cursor-pointer" value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-600 shadow-sm">
            <Users size={14} className="text-zinc-400" />
            <select className="bg-transparent outline-none cursor-pointer" value={boyFilter} onChange={e => setBoyFilter(e.target.value)}>
              {DELIVERY_BOYS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <Download size={14} />Export
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {(['delivery', 'availability'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'delivery' ? '📦 Delivery Duration' : '📊 Availability'}
          </button>
        ))}
      </div>

      {/* DELIVERY DURATION TAB */}
      {tab === 'delivery' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg. Delivery Time', value: '24.5 min', icon: Clock, color: 'emerald', delta: '-2.4 min' },
              { label: 'Longest Delivery', value: '42 min', icon: TrendingUp, color: 'red', delta: 'Max' },
              { label: 'Shortest Delivery', value: '12 min', icon: TrendingUp, color: 'blue', delta: 'Min' },
              { label: 'Total Waiting Time', value: '53 min', icon: AlertCircle, color: 'amber', delta: 'This week' },
            ].map(card => (
              <div key={card.label} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center`}>
                    <card.icon size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-tight">{card.label}</p>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{card.value}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{card.delta}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-6">Delivery Volume vs Avg. Time</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <Tooltip {...CHART_STYLE} />
                    <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Deliveries" />
                    <Bar dataKey="time" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} name="Avg Time (min)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-6">Waiting Time per Day (mins)</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <Tooltip {...CHART_STYLE} />
                    <Line type="monotone" dataKey="waiting" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} name="Waiting (min)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Delivery status pie */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-6">Delivery Status Distribution</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-zinc-600">{item.name}</span>
                    <span className="text-sm font-bold text-zinc-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* AVAILABILITY TAB */}
      {tab === 'availability' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Available', value: '28.5 hrs', icon: Clock, color: 'blue', sub: 'Across all boys' },
              { label: 'Total On Delivery', value: '13.0 hrs', icon: TrendingUp, color: 'emerald', sub: 'Active time' },
              { label: 'Total Waiting', value: '4.8 hrs', icon: AlertCircle, color: 'amber', sub: 'At hospitals' },
            ].map(card => (
              <div key={card.label} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center`}>
                    <card.icon size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{card.label}</p>
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{card.value}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Stacked bar — availability breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-6">Availability Breakdown per Rider (mins)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={availabilityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={48} />
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="available" stackId="a" fill="#6366f1" name="Available (min)" />
                  <Bar dataKey="delivery" stackId="a" fill="#10b981" name="On Delivery (min)" />
                  <Bar dataKey="waiting" stackId="a" fill="#f59e0b" name="Waiting (min)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {[['Available', '#6366f1'], ['On Delivery', '#10b981'], ['Waiting', '#f59e0b']].map(([l, c]) => (
                <div key={l} className="flex items-center gap-2 text-xs text-zinc-600">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Per-rider table */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Rider Summary</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  {['Rider', 'Available', 'On Delivery', 'Waiting', 'Efficiency'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {availabilityData.map(r => (
                  <tr key={r.name} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-sm font-bold text-zinc-900">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{r.available} min</td>
                    <td className="px-4 py-3 text-xs text-emerald-600 font-medium">{r.delivery} min</td>
                    <td className="px-4 py-3 text-xs text-amber-600 font-medium">{r.waiting} min</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-zinc-900">{Math.round(r.delivery / r.available * 100)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
