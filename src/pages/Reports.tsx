import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Calendar, 
  Filter, 
  Download, 
  Clock, 
  TrendingUp, 
  Users 
} from 'lucide-react';
import { motion } from 'motion/react';

const data = [
  { name: 'Mon', deliveries: 45, time: 22 },
  { name: 'Tue', deliveries: 52, time: 25 },
  { name: 'Wed', deliveries: 38, time: 20 },
  { name: 'Thu', deliveries: 65, time: 28 },
  { name: 'Fri', deliveries: 48, time: 24 },
  { name: 'Sat', deliveries: 30, time: 18 },
  { name: 'Sun', deliveries: 25, time: 15 },
];

const pieData = [
  { name: 'On Time', value: 85, color: '#10b981' },
  { name: 'Delayed', value: 10, color: '#f59e0b' },
  { name: 'Cancelled', value: 5, color: '#ef4444' },
];

export default function Reports() {
  const [dateRange, setDateRange] = useState('7d');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Reports</h1>
          <p className="text-xs text-zinc-500 font-medium">Analyze delivery efficiency and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-600 shadow-sm">
            <Calendar size={14} className="text-zinc-400" />
            <select 
              className="bg-transparent outline-none cursor-pointer"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avg. Time</p>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">24.5 min</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <TrendingUp size={12} />
            <span>-2.4 min</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Success Rate</p>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">98.2%</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <TrendingUp size={12} />
            <span>+0.5%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Longest / Shortest</p>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">42m / 12m</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
            <span>Extreme values</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-6">Delivery Volume vs Time</h3>
          <div className="h-[250px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-6">Delivery Status Distribution</h3>
          <div className="h-[250px] md:h-[300px] flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                  <span className="text-xs md:text-sm text-zinc-600">{item.name}</span>
                  <span className="text-xs md:text-sm font-bold text-zinc-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
