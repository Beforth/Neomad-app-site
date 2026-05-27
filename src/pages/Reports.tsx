import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Download, Clock, TrendingUp, Users, AlertCircle, TrendingDown, CheckCircle2, Package, BarChart3, Search, Filter } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { motion, AnimatePresence } from 'motion/react';
import { appApi } from '../lib/appApi';

const CHART_STYLE = {
  contentStyle: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  cursor: { fill: '#f8fafc' },
};

export default function Reports() {
  const [tab, setTab] = useState<'delivery' | 'availability'>('delivery');
  const [dateRange, setDateRange] = useState('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [boyFilter, setBoyFilter] = useState('All');

  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalBoys: 0, totalDelivered: 0 });
  const [boyStats, setBoyStats] = useState({ delivered: 0 });
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([appApi.getUsers(), appApi.getStats(), appApi.getInvoices()])
      .then(([users, s, invoices]) => {
      const boys = users.filter((u: any) => u.role === 'delivery_boy');
      setDeliveryBoys(boys);
      setGlobalStats(prev => ({ ...prev, totalBoys: boys.length }));
      setGlobalStats(prev => ({ ...prev, totalDelivered: s.delivered.count }));

      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const byDay = new Map<string, { deliveries: number; assigned: number; pending: number }>();
      weekdayNames.forEach((day) => byDay.set(day, { deliveries: 0, assigned: 0, pending: 0 }));

      invoices.forEach((inv: any) => {
        const dateStr = inv.delivered_at || inv.accepted_at || inv.created_at;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return;
        const day = weekdayNames[d.getDay()];
        const row = byDay.get(day);
        if (!row) return;
        if (inv.status === 'delivered') row.deliveries += 1;
        if (inv.status === 'assigned') row.assigned += 1;
        if (inv.status === 'pending') row.pending += 1;
      });

      setDeliveryData(
        weekdayNames.map((day) => {
          const row = byDay.get(day)!;
          return {
            name: day,
            deliveries: row.deliveries,
            time: row.assigned,
            waiting: row.pending,
          };
        })
      );

      const total = Math.max(1, invoices.length);
      const delivered = invoices.filter((x: any) => x.status === 'delivered').length;
      const pending = invoices.filter((x: any) => x.status === 'pending').length;
      const cancelled = invoices.filter((x: any) => x.status === 'cancelled').length;
      setPieData([
        { name: 'Delivered', value: Math.round((delivered / total) * 100), color: '#10b981' },
        { name: 'Pending', value: Math.round((pending / total) * 100), color: '#f59e0b' },
        { name: 'Cancelled', value: Math.round((cancelled / total) * 100), color: '#ef4444' },
      ]);

      const byBoy = boys.map((boy: any) => {
        const mine = invoices.filter((i: any) => i.assigned_to === boy.id);
        const completed = mine.filter((i: any) => i.status === 'delivered').length;
        const inProgress = mine.filter((i: any) => i.status === 'assigned').length;
        const queued = mine.filter((i: any) => i.status === 'pending').length;
        return {
          name: boy.username,
          available: mine.length,
          delivery: completed + inProgress,
          waiting: queued,
        };
      });
      setAvailabilityData(byBoy);
    })
      .catch(() => {
        setDeliveryData([]);
        setAvailabilityData([]);
        setPieData([]);
      });
  }, []);

  useEffect(() => {
    if (boyFilter !== 'All') {
      const boyId = Number(boyFilter);
      appApi.getDeliveryBoyStats(boyId).then((s) => {
        setBoyStats({ delivered: s.total_delivered });
      });
    } else {
      setBoyStats({ delivered: 0 });
    }
  }, [boyFilter, dateRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input type="text" placeholder="Search Entity..." className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold" />
            </div>

            {/* Date Range Group */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <Calendar size={14} className="text-zinc-400" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Period</span>
              </div>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="bg-white border border-zinc-100 px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-600 outline-none focus:border-emerald-500"
              />
              <span className="text-zinc-300">→</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="bg-white border border-zinc-100 px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-600 outline-none focus:border-emerald-500"
              />
              <SearchableSelect
                value={dateRange}
                onChange={setDateRange}
                className="min-w-[140px]"
                options={[
                  { value: 'custom', label: 'Custom' },
                  { value: 'today', label: 'Today' },
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' },
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
              <Filter size={14} className="text-zinc-400" />
              <SearchableSelect
                value={statusFilter}
                onChange={setStatusFilter}
                className="min-w-[130px]"
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>

            {/* Boy Filter */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
              <Users size={14} className="text-zinc-400" />
              <SearchableSelect
                value={boyFilter}
                onChange={setBoyFilter}
                className="min-w-[170px]"
                options={[
                  { value: 'All', label: 'All Delivery Boys' },
                  ...deliveryBoys.map((b) => ({ value: String(b.id), label: b.username })),
                ]}
              />
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-md active:scale-95 shrink-0">
            <Download size={14} /> EXPORT DATA
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {(['delivery', 'availability'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            <div className="flex items-center gap-1.5">
              {t === 'delivery' ? <Package size={14} /> : <BarChart3 size={14} />}
              {t === 'delivery' ? 'Delivery Duration' : 'Availability'}
            </div>
          </button>
        ))}
      </div>

      {/* DELIVERY DURATION TAB */}
      {tab === 'delivery' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Delivery Boys', value: globalStats.totalBoys.toString(), icon: Users, color: 'blue', delta: 'Active' },
              { label: 'Orders Delivered', value: globalStats.totalDelivered.toString(), icon: CheckCircle2, color: 'emerald', delta: 'All time' },
              { label: 'Boy Orders Delivered', value: boyFilter === 'All' ? '-' : boyStats.delivered.toString(), icon: TrendingUp, color: 'emerald', delta: boyFilter === 'All' ? 'Select a boy' : 'All time' },
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
              <h3 className="font-bold text-zinc-900 mb-6">
                Delivery Volume vs Avg. Time
              </h3>
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
                <h3 className="font-bold text-zinc-900 mb-6">Pending Tasks per Day</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <Tooltip {...CHART_STYLE} />
                    <Line type="monotone" dataKey="waiting" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} name="Pending" />
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
              {
                label: 'Total Assigned',
                value: `${availabilityData.reduce((s, r) => s + (r.available || 0), 0)}`,
                icon: Clock,
                color: 'blue',
                sub: 'Tasks across riders',
              },
              {
                label: 'In Progress/Done',
                value: `${availabilityData.reduce((s, r) => s + (r.delivery || 0), 0)}`,
                icon: TrendingUp,
                color: 'emerald',
                sub: 'Assigned + delivered',
              },
              {
                label: 'Pending',
                value: `${availabilityData.reduce((s, r) => s + (r.waiting || 0), 0)}`,
                icon: AlertCircle,
                color: 'amber',
                sub: 'Pending tasks',
              },
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
            <h3 className="font-bold text-zinc-900 mb-6">Task Breakdown per Rider (counts)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={availabilityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={48} />
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="available" stackId="a" fill="#6366f1" name="Assigned" />
                  <Bar dataKey="delivery" stackId="a" fill="#10b981" name="In Progress/Done" />
                  <Bar dataKey="waiting" stackId="a" fill="#f59e0b" name="Pending" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {[['Assigned', '#6366f1'], ['In Progress/Done', '#10b981'], ['Pending', '#f59e0b']].map(([l, c]) => (
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
                  {['Rider', 'Assigned', 'In Progress/Done', 'Pending', 'Efficiency'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {availabilityData.map(r => (
                  <tr key={r.name} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-sm font-bold text-zinc-900">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{r.available}</td>
                    <td className="px-4 py-3 text-xs text-emerald-600 font-medium">{r.delivery}</td>
                    <td className="px-4 py-3 text-xs text-amber-600 font-medium">{r.waiting}</td>
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
