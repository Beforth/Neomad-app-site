import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Download, Clock, TrendingUp, Users, AlertCircle, TrendingDown, Gauge, CheckCircle2, Map as MapIcon, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockApi } from '../lib/mockApi';
import MapPreview, { DEFAULT_RIDERS } from '../components/MapPreview';

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



const CHART_STYLE = {
  contentStyle: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  cursor: { fill: '#f8fafc' },
};

export default function Reports() {
  const [tab, setTab] = useState<'delivery' | 'availability'>('delivery');
  const [dateRange, setDateRange] = useState('7d');
  const [boyFilter, setBoyFilter] = useState('All');
  
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalBoys: 0, totalDelivered: 0 });
  const [boyStats, setBoyStats] = useState({ delivered: 0, kmDriven: '0.0', daily_distance: [] as any[] });
  const [boyRoute, setBoyRoute] = useState<{ path: [number, number][], checkpoints: any[] }>({ path: [], checkpoints: [] });
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    mockApi.getUsers().then(users => {
      const boys = users.filter((u: any) => u.role === 'delivery_boy');
      setDeliveryBoys(boys);
      setGlobalStats(prev => ({ ...prev, totalBoys: boys.length }));
    });
    mockApi.getStats().then(s => {
      setGlobalStats(prev => ({ ...prev, totalDelivered: s.delivered.count }));
    });
  }, []);

  useEffect(() => {
    if (boyFilter !== 'All') {
      const boyId = Number(boyFilter);
      setLoadingRoute(true);
      Promise.all([
        mockApi.getDeliveryBoyStats(boyId),
        mockApi.getBoyRoute(boyId, dateRange)
      ]).then(([s, r]) => {
        setBoyStats({ delivered: s.total_delivered, kmDriven: s.km_driven, daily_distance: s.daily_distance });
        setBoyRoute(r);
        setLoadingRoute(false);
      });
    } else {
      setBoyStats({ delivered: 0, kmDriven: '0.0', daily_distance: [] });
      setBoyRoute({ path: [], checkpoints: [] });
    }
  }, [boyFilter, dateRange]);

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
              <option value="All">All Boys</option>
              {deliveryBoys.map(b => <option key={b.id} value={b.id}>{b.username}</option>)}
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
              { label: 'Total Delivery Boys', value: globalStats.totalBoys.toString(), icon: Users, color: 'blue', delta: 'Active' },
              { label: 'Total Orders Delivered', value: globalStats.totalDelivered.toString(), icon: CheckCircle2, color: 'emerald', delta: 'All time' },
              { label: 'Boy Orders Delivered', value: boyFilter === 'All' ? '-' : boyStats.delivered.toString(), icon: TrendingUp, color: 'emerald', delta: boyFilter === 'All' ? 'Select a boy' : 'All time' },
              { label: 'Boy Km Driven', value: boyFilter === 'All' ? '-' : `${boyStats.kmDriven} km`, icon: Gauge, color: 'purple', delta: boyFilter === 'All' ? 'Select a boy' : 'Estimated distance' },
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

          {/* Delivery Route / Fleet Map */}
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                 <MapIcon size={18} className="text-zinc-400" />
                 <h3 className="font-bold text-zinc-900">
                   {boyFilter === 'All' ? 'Fleet Locations' : "Today's Delivery Route"}
                 </h3>
              </div>
              {boyFilter !== 'All' && boyRoute.path.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">
                   {boyRoute.checkpoints.filter(c => c.status === 'completed').length} Checkpoints Completed
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className={boyFilter === 'All' ? "lg:col-span-4 h-[400px] rounded-xl overflow-hidden relative" : "lg:col-span-3 h-[400px] rounded-xl overflow-hidden relative"}>
                {loadingRoute ? (
                  <div className="absolute inset-0 bg-zinc-50 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
                  </div>
                ) : null}
                <MapPreview 
                  riders={boyFilter === 'All' ? DEFAULT_RIDERS : DEFAULT_RIDERS.filter(r => r.id === Number(boyFilter))}
                  route={boyRoute.path} 
                  checkpoints={boyRoute.checkpoints}
                  center={boyRoute.path[0] || [19.9975, 73.7898]}
                  zoom={boyFilter === 'All' ? 12 : 14}
                />
              </div>
              
              {boyFilter !== 'All' && (
                <div className="space-y-4">
                   <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Timeline</h4>
                   <div className="space-y-4 relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-zinc-100" />
                      {boyRoute.checkpoints.map((cp, i) => (
                        <div key={i} className="flex gap-3 relative z-10">
                           <div className={`w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0 ${
                             cp.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                           }`}>
                             {cp.status === 'completed' ? <CheckCircle2 size={12} className="text-white" /> : <Navigation size={12} className="text-white" />}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-zinc-900 leading-tight">{cp.label}</p>
                             <p className="text-[10px] text-zinc-500">{cp.time}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-6">
                {boyFilter === 'All' ? 'Delivery Volume vs Avg. Time' : 'Daily Distance Covered (km)'}
              </h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  {boyFilter === 'All' ? (
                    <BarChart data={deliveryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                      <Tooltip {...CHART_STYLE} />
                      <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Deliveries" />
                      <Bar dataKey="time" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} name="Avg Time (min)" />
                    </BarChart>
                  ) : (
                    <BarChart data={boyStats.daily_distance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                      <Tooltip {...CHART_STYLE} />
                      <Bar dataKey="km" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} name="Distance (km)" />
                    </BarChart>
                  )}
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
