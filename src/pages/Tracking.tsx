import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Truck, Clock, AlertCircle, RefreshCw, Navigation, Timer, Plus, X, CheckCircle2, Gauge, TrendingUp, MapPin, ExternalLink, User, Battery, Signal, BellRing, MessageSquare, History, Package, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapPreview from '../components/MapPreview';
import { mockApi } from '../lib/mockApi';

const MOCK_RIDERS = [
  { id: 1, name: 'Sagar Wagh', initials: 'SW', status: 'moving', statusLabel: 'Heading to City Hospital', order: 'INV-2024-001', acceptedMinsAgo: 18, waitingSecs: 0, tasks: '4/12', shiftStart: '09:00 AM', battery: 85, signal: 'strong' },
  { id: 2, name: 'Rahul Patil', initials: 'RP', status: 'waiting', statusLabel: 'Waiting at Metro Clinic', order: 'INV-2024-002', acceptedMinsAgo: 32, waitingSecs: 720, tasks: '3/8', shiftStart: '08:30 AM', battery: 42, signal: 'medium' },
  { id: 3, name: 'Amit Shinde', initials: 'AS', status: 'moving', statusLabel: 'Pick-up from Warehouse', order: null, acceptedMinsAgo: 9, waitingSecs: 0, tasks: '2/6', shiftStart: '10:15 AM', battery: 98, signal: 'strong' },
  { id: 4, name: 'Pooja Kale', initials: 'PK', status: 'moving', statusLabel: 'Delivering to Apollo', order: 'INV-2024-004', acceptedMinsAgo: 45, waitingSecs: 240, tasks: '5/10', shiftStart: '07:45 AM', battery: 24, signal: 'weak' },
];

function useLiveSecs(startSecs: number) {
  const [secs, setSecs] = useState(startSecs);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return secs;
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function RiderCard({ rider, selected, onClick }: any) {
  const deliverySecs = useLiveSecs(rider.acceptedMinsAgo * 60);
  const waitSecs = useLiveSecs(rider.waitingSecs);

  return (
    <button onClick={onClick}
      className={`w-full text-left p-3 rounded-2xl border transition-all duration-300 ${selected ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/10' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'
        }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white transition-all ${selected ? 'scale-105' : ''} ${rider.status === 'moving' ? 'bg-emerald-500 shadow-md shadow-emerald-200' : 'bg-amber-500 shadow-md shadow-amber-200'}`}>
            {rider.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate leading-tight">{rider.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${rider.status === 'moving' ? 'bg-blue-500' : 'bg-amber-500'} ${rider.status === 'moving' ? 'animate-pulse' : ''}`} />
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{rider.status}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
           {rider.battery <= 20 && <Battery size={12} className="text-red-500 animate-pulse" />}
           <ChevronRight size={14} className={`text-zinc-300 transition-transform duration-300 ${selected ? 'rotate-90 text-emerald-500' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1 border-t border-emerald-100/30">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-500 leading-tight">{rider.statusLabel}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase">Boy #{rider.id}</p>
              </div>

              {rider.order && (
                <div className="flex items-center justify-between bg-emerald-100/30 px-2 py-1.5 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-1.5">
                    <Package size={12} className="text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase">{rider.order}</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600/70">In Transit</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col bg-blue-50/50 p-2 rounded-xl">
                  <span className="text-[8px] font-bold text-blue-400 uppercase mb-0.5">Route Time</span>
                  <div className="flex items-center gap-1">
                    <Timer size={10} className="text-blue-500" />
                    <span className="text-[11px] font-bold text-zinc-600 font-mono">{fmt(deliverySecs)}</span>
                  </div>
                </div>
                {rider.waitingSecs > 0 && (
                  <div className="flex flex-col bg-amber-50/30 p-2 rounded-xl">
                    <span className="text-[8px] font-bold text-amber-400 uppercase mb-0.5">Clinic Wait</span>
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-amber-600" />
                      <span className="text-[11px] font-bold text-amber-600 font-mono">{fmt(waitSecs)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 bg-white/50 p-2 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 ${rider.battery > 30 ? 'text-zinc-600' : 'text-red-500 animate-pulse'}`}>
                    <Battery size={12} /> {rider.battery}%
                  </div>
                  <div className="flex items-center gap-1">
                    <Signal size={12} className="text-zinc-400" /> {rider.signal}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <History size={12} className="text-zinc-400" /> {rider.shiftStart}
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-1.5 bg-emerald-500 text-white rounded-xl text-[11px] font-black hover:bg-emerald-600 transition-all shadow-sm active:scale-[0.98]">
                <Navigation size={12} /> FOCUS RIDER
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default function Tracking() {
  const { socket } = useSocket();
  const [liveLocations, setLiveLocations] = useState<Record<number, any>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedStats, setSelectedStats] = useState<any>(null);

  useEffect(() => {
    if (selected) {
      mockApi.getDeliveryBoyStats(selected).then(setSelectedStats);
    } else {
      setSelectedStats(null);
    }
  }, [selected]);

  useEffect(() => {
    // No users needed for task creation anymore
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('location_update', (data: any) => {
        setLiveLocations(prev => ({ ...prev, [data.user_id]: data }));
        setLastRefresh(new Date());
      });
    }
  }, [socket]);

  const allRiders = MOCK_RIDERS.map(r => {
    const live = liveLocations[r.id];
    return live ? { ...r, status: live.status } : r;
  });

  const riders = selected ? allRiders.filter(r => r.id === selected) : allRiders;

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Live Fleet</h1>
            <p className="text-zinc-500 text-sm">Real-time command center</p>
          </div>
          <div className="h-10 w-px bg-zinc-200 mx-2 hidden md:block" />
          <div className="hidden md:flex flex-col">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Select Rider</label>
            <select
              value={selected || ''}
              onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : null)}
              className="bg-white border border-zinc-200 rounded-lg px-3 py-1 text-xs font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer min-w-[160px]"
            >
              <option value="">All Fleet View</option>
              {allRiders.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-wider">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Tracking
             </div>
             <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
               <RefreshCw size={10} className="animate-spin-slow" /> {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        {[
          { label: 'Total Active', value: riders.length, icon: Users, color: 'blue' },
          { label: 'In-Transit', value: riders.filter(r => r.status === 'moving').length, icon: Truck, color: 'emerald' },
          { label: 'Waiting', value: riders.filter(r => r.status === 'waiting').length, icon: Clock, color: 'amber' },
          { label: 'With Orders', value: riders.filter(r => r.order).length, icon: Package, color: 'indigo' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-3.5 rounded-2xl border border-zinc-100 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg bg-${card.color}-50 text-${card.color}-600`}>
                <card.icon size={16} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{card.label}</p>
              <h3 className="text-xl font-black text-zinc-900 mt-1.5">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        <div className="lg:col-span-3 bg-white rounded-3xl border border-zinc-100 shadow-inner overflow-hidden min-h-[300px] lg:min-h-0 relative">
          <MapPreview />
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-zinc-100 shrink-0">
            <h3 className="font-bold text-zinc-900">Active Riders</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">{riders.length} on duty</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {riders.map(rider => (
              <RiderCard
                key={rider.id}
                rider={rider}
                selected={selected === rider.id}
                onClick={() => setSelected(selected === rider.id ? null : rider.id)}
              />
            ))}
            {riders.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 silver-gradient rounded-3xl">
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-bold">No riders on duty</p>
              </div>
            )}
          </div>

          {selected && (
            <div className="p-4 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
              <button 
                onClick={() => setSelected(null)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <X size={12} /> Clear Rider Filter
                </div>
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
