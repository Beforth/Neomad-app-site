import { useEffect, useState } from 'react';
import { 
  FileText, Clock, CheckCircle2, XCircle, Truck,
  ArrowUpRight, TrendingUp, IndianRupee, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../lib/mockApi';
import MapPreview from '../components/MapPreview';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    mockApi.getStats().then(setStats);
  }, []);

  const allCards = [
    { label: 'Total Today', value: stats?.total_today?.count || 0, icon: FileText, color: 'blue', roles: ['admin', 'manager'] },
    { label: 'Pending', value: stats?.pending?.count || 0, icon: Clock, color: 'amber', roles: ['admin', 'manager'] },
    { label: 'Assigned', value: stats?.assigned?.count || 0, icon: Truck, color: 'indigo', roles: ['admin', 'manager'] },
    { label: 'Delivered', value: stats?.delivered?.count || 0, icon: CheckCircle2, color: 'emerald', roles: ['admin', 'manager'] },
    { label: 'Cancelled', value: stats?.cancelled?.count || 0, icon: XCircle, color: 'red', roles: ['admin', 'manager'] },
    { label: 'Cash Pending', value: stats?.cash_pending?.count || 0, icon: IndianRupee, color: 'orange', roles: ['admin'] },
  ];

  const cards = allCards.filter(c => c.roles.includes(user?.role || ''));

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 shadow-sm">
          <Clock size={16} className="text-zinc-400" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </header>

      {user?.role === 'manager' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-800"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">⚠️ Waiting Alert</p>
            <p className="text-xs">Delivery Boy #104 has been waiting at City Hospital for over 15 minutes.</p>
          </div>
          <button className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors">
            View Tracking
          </button>
        </motion.div>
      )}

      <div className={`grid grid-cols-2 ${cards.length >= 6 ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-3 lg:grid-cols-5'} gap-4`}>
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg bg-${card.color}-50 text-${card.color}-600 group-hover:scale-110 transition-transform`}>
                <card.icon size={16} />
              </div>
              <ArrowUpRight size={14} className="text-zinc-300" />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{card.label}</p>
            <div className="flex items-end justify-between mt-0.5">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{card.value}</h3>
              <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-0.5 mb-1">
                <TrendingUp size={10} />+12%
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900">Recent Deliveries</h3>
            <button className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200 shadow-sm">
                    <Truck size={14} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">INV-2024-00{i + 1}</p>
                    <p className="text-[10px] text-zinc-500">City Hospital • 2.4km</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-900">₹4,500</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    Delivered
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">Live Map Preview (Nashik)</h3>
          <div className="h-64 md:h-72 lg:aspect-square lg:h-auto bg-zinc-50 rounded-lg relative overflow-hidden border border-zinc-100">
            <MapPreview />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 font-medium">Active Delivery Boys</span>
              <span className="font-bold text-zinc-900">12</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 font-medium">Avg. Delivery Time</span>
              <span className="font-bold text-zinc-900">24 mins</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 font-medium">Efficiency Rate</span>
              <span className="font-bold text-emerald-600">98.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
