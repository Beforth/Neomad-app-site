import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { MapPin, Truck, Clock, AlertCircle } from 'lucide-react';

export default function Tracking() {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [locations, setLocations] = useState<Record<number, any>>({});

  useEffect(() => {
    if (socket) {
      socket.on('location_update', (data) => {
        setLocations(prev => ({
          ...prev,
          [data.user_id]: data
        }));
      });
    }
  }, [socket]);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Live Tracking</h1>
          <p className="text-zinc-500">Monitor all active delivery boys in real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-zinc-600">Live</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-zinc-100 shadow-sm relative overflow-hidden">
          {/* Map Placeholder */}
          <div className="absolute inset-0 bg-zinc-50 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
            <MapPin size={64} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Interactive Map View</h3>
            <p className="max-w-md">
              Real-time GPS tracking visualization would be integrated here using Google Maps or Leaflet. 
              Currently displaying active markers from WebSocket updates.
            </p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {Object.values(locations).map((loc: any) => (
                <div 
                  key={loc.user_id}
                  className="bg-white p-3 rounded-xl shadow-lg border border-zinc-100 flex items-center gap-3 animate-bounce"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <Truck size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-zinc-900">{loc.username}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">{loc.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900">Active Personnel</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {Object.values(locations).length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={32} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No active tracking data</p>
              </div>
            ) : Object.values(locations).map((loc: any) => (
              <div key={loc.user_id} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
                      {loc.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{loc.username}</p>
                      <p className="text-[10px] text-zinc-500">Boy #{loc.user_id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    loc.status === 'moving' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {loc.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Clock size={12} />
                    <span>Active: 4h 12m</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Truck size={12} />
                    <span>Tasks: 4/12</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
