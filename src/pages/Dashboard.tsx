import { useEffect, useState } from 'react';
import {
  FileText, Clock, CheckCircle2, XCircle, Truck,
  ArrowUpRight, TrendingUp, IndianRupee, AlertCircle, Users,
  ShieldCheck, Wallet
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../lib/mockApi';
import MapPreview from '../components/MapPreview';

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedBoyId, setSelectedBoyId] = useState<string>('all');
  const [customBoyName, setCustomBoyName] = useState<string>('');
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);

  useEffect(() => {
    mockApi.getUsers().then(users => {
      setDeliveryBoys(users.filter((u: any) => u.role === 'delivery_boy'));
    });
    mockApi.getStats().then(setStats);
    mockApi.getInvoices(user).then(invoices => {
      const delivered = invoices
        .filter((i: any) => i.status === 'delivered')
        .sort((a, b) => new Date(b.delivered_at || b.created_at).getTime() - new Date(a.delivered_at || a.created_at).getTime())
        .slice(0, 5);
      setRecentDeliveries(delivered);
    });
  }, [user]);
  const allCards = [
    { label: 'Total Boys', value: stats?.total_boys?.count || 0, icon: Users, color: 'blue', roles: ['admin', 'manager'], hideIfBoySelected: true },
    { label: 'Pending', value: stats?.pending?.count || 0, icon: Clock, color: 'amber', roles: ['admin', 'manager'] },
    { label: 'Assigned', value: stats?.assigned?.count || 0, icon: Truck, color: 'indigo', roles: ['admin', 'manager'] },
    { label: 'Delivered', value: stats?.delivered?.count || 0, icon: CheckCircle2, color: 'emerald', roles: ['admin', 'manager'] },
    { label: 'Cancelled', value: stats?.cancelled?.count || 0, icon: XCircle, color: 'red', roles: ['admin', 'manager'] },
    { label: 'Total Collection', value: `₹${(stats?.total_collected?.count || 0).toLocaleString()}`, icon: Wallet, color: 'purple', roles: ['admin'] },
  ];

  const cards = allCards.filter(c => 
    c.roles.includes(user?.role || '') && 
    !(c.hideIfBoySelected && selectedBoyId !== 'all')
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                <select 
                  value={selectedBoyId} 
                  onChange={e => setSelectedBoyId(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="all">Total Delivery Boys</option>
                  {deliveryBoys.map(b => <option key={b.id} value={b.id}>{b.username}</option>)}
                  <option value="custom">Custom...</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ArrowUpRight size={12} className="rotate-90" />
                </div>
              </div>
              
              {selectedBoyId === 'custom' && (
                <motion.input 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  type="text" 
                  placeholder="Enter Name..." 
                  value={customBoyName}
                  onChange={e => setCustomBoyName(e.target.value)}
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm w-32"
                />
              )}
            </div>
          )}

          {user?.role === 'admin' && (
            <button onClick={async () => { await mockApi.seedDemoData(); window.location.reload(); }}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-100">
              <CheckCircle2 size={14} /> Reset Demo Data
            </button>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 shadow-sm">
            <Clock size={16} className="text-zinc-400" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>



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
            <div className="flex items-end justify-between mt-1">
              <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{card.value}</h3>
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
            {recentDeliveries.length > 0 ? (
              recentDeliveries.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200 shadow-sm">
                      <Truck size={14} className="text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{inv.invoice_number}</p>
                      <p className="text-[10px] text-zinc-500">{inv.hospital_name} • {new Date(inv.delivered_at || inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-900">₹{inv.amount.toLocaleString()}</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Delivered
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-400 text-xs silver-gradient rounded-2xl">
                No deliveries recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">Live Map Preview (Nashik)</h3>
          <div className="h-64 md:h-72 lg:aspect-square lg:h-auto bg-white rounded-lg relative overflow-hidden border border-zinc-100 shadow-inner">
            <MapPreview />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 font-medium whitespace-nowrap">Active Team Density</span>
              <div className="h-1.5 flex-1 bg-zinc-100 mx-4 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
              </div>
              <span className="font-bold text-zinc-900">High</span>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
