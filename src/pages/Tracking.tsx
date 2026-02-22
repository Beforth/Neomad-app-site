import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Truck, Clock, AlertCircle, RefreshCw, Navigation, Timer } from 'lucide-react';
import MapPreview from '../components/MapPreview';

const MOCK_RIDERS = [
  { id: 1, name: 'Sagar Wagh', initials: 'SW', status: 'moving', statusLabel: 'Heading to City Hospital', order: 'INV-2024-001', acceptedMinsAgo: 18, waitingSecs: 0, tasks: '4/12' },
  { id: 2, name: 'Rahul Patil', initials: 'RP', status: 'waiting', statusLabel: 'Waiting at Metro Clinic', order: 'INV-2024-002', acceptedMinsAgo: 32, waitingSecs: 720, tasks: '3/8' },
  { id: 3, name: 'Amit Shinde', initials: 'AS', status: 'moving', statusLabel: 'Pick-up from Warehouse', order: null, acceptedMinsAgo: 9, waitingSecs: 0, tasks: '2/6' },
  { id: 4, name: 'Pooja Kale', initials: 'PK', status: 'moving', statusLabel: 'Delivering to Apollo', order: 'INV-2024-004', acceptedMinsAgo: 45, waitingSecs: 240, tasks: '5/10' },
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
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            rider.status === 'moving' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            {rider.initials}
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900 leading-tight">{rider.name}</p>
            <p className="text-[10px] text-zinc-500">Boy #{rider.id}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
          rider.status === 'moving' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {rider.status}
        </span>
      </div>

      <p className="text-[10px] text-zinc-500 mb-2 leading-snug">{rider.statusLabel}</p>

      {rider.order && (
        <p className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mb-2">
          {rider.order}
        </p>
      )}

      {/* Live timers */}
      <div className="grid grid-cols-2 gap-1 mt-1">
        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
          <Timer size={10} />
          <span className="font-mono font-bold text-zinc-700">{fmt(deliverySecs)}</span>
        </div>
        {rider.waitingSecs > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-500">
            <Clock size={10} />
            <span className="font-mono font-bold">{fmt(waitSecs)}</span>
            <span>wait</span>
          </div>
        )}
      </div>

      {/* Accepted time */}
      <div className="text-[9px] text-zinc-400 mt-1">
        Accepted: {new Date(Date.now() - rider.acceptedMinsAgo * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>

      {selected && (
        <button className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-colors">
          <Navigation size={11} /> Focus on Map
        </button>
      )}
    </button>
  );
}

export default function Tracking() {
  const { socket } = useSocket();
  const [liveLocations, setLiveLocations] = useState<Record<number, any>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (socket) {
      socket.on('location_update', (data: any) => {
        setLiveLocations(prev => ({ ...prev, [data.user_id]: data }));
        setLastRefresh(new Date());
      });
    }
  }, [socket]);

  const riders = MOCK_RIDERS.map(r => {
    const live = liveLocations[r.id];
    return live ? { ...r, status: live.status } : r;
  });

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Live Tracking</h1>
          <p className="text-zinc-500 text-sm">Monitor all active delivery boys in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />Live
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <RefreshCw size={12} />{lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden min-h-[300px] lg:min-h-0">
          <MapPreview />
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-zinc-100 flex-shrink-0">
            <h3 className="font-bold text-zinc-900">Active Riders</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">{riders.length} on duty</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {riders.map(rider => (
              <RiderCard
                key={rider.id}
                rider={rider}
                selected={selected === rider.id}
                onClick={() => setSelected(selected === rider.id ? null : rider.id)}
              />
            ))}
          </div>

          <div className="p-4 border-t border-zinc-100 flex-shrink-0 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-500">Moving</span>
              <span className="font-bold text-blue-600">{riders.filter(r => r.status === 'moving').length}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-500">Waiting</span>
              <span className="font-bold text-amber-600">{riders.filter(r => r.status === 'waiting').length}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-500">With Orders</span>
              <span className="font-bold text-zinc-900">{riders.filter(r => r.order).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
