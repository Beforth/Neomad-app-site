import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { mockApi } from '../lib/mockApi';

const OFFICE_LOCATION = { lat: 19.9975, lng: 73.7898 };
const GEOFENCE_RADIUS_METERS = 100;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function StaffApp() {
  const { user, logout } = useAuth();
  const [locationError, setLocationError] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [isOutside, setIsOutside] = useState(false);

  const alertSentRef = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = getDistance(OFFICE_LOCATION.lat, OFFICE_LOCATION.lng, latitude, longitude);
        setDistance(Math.round(dist));

        if (dist > GEOFENCE_RADIUS_METERS) {
          setIsOutside(true);
          if (!alertSentRef.current) {
            // Trigger system alert
            mockApi.saveNotification({
              title: 'Staff Member Left Office Premises',
              message: `${user?.username} has moved ${Math.round(dist)} meters away from the office.`,
              targets: ['admin', 'manager'],
              priority: 'important'
            });
            alertSentRef.current = true;
          }
        } else {
          setIsOutside(false);
          alertSentRef.current = false;
        }
      },
      (err) => {
        setLocationError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  return (
    <div className="min-h-full bg-zinc-50 flex flex-col relative w-full">
      {/* Redundant header removed - using global TopBar */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
          {user?.username[0].toUpperCase()}
        </div>
        <div>
          <h2 className="font-bold text-zinc-900">{user?.username}</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Staff Member</p>
        </div>
      </div>
      <button onClick={logout} className="p-2 rounded-xl text-zinc-400 hover:text-red-500 transition-colors bg-zinc-100 hover:bg-red-50">
        <LogOut size={18} />
      </button>
    </header>

      {/* Main Content */ }
  <main className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center space-y-6">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold text-zinc-900">Workspace Status</h1>
      <p className="text-sm text-zinc-500">Live geolocation tracking enabled.</p>
    </div>

    {locationError ? (
      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 w-full">
        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-red-800">Location Error</p>
          <p className="text-xs text-red-600 mt-1">{locationError}</p>
        </div>
      </div>
    ) : (
      <div className={`w-full p-6 rounded-3xl border-2 transition-all duration-500 ${isOutside ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${isOutside ? 'bg-red-500 shadow-red-200' : 'bg-emerald-500 shadow-emerald-200'}`}>
            {isOutside ? <AlertTriangle className="text-white" size={32} /> : <CheckCircle2 className="text-white" size={32} />}
          </div>

          <div>
            <h3 className={`text-xl font-bold ${isOutside ? 'text-red-700' : 'text-emerald-700'}`}>
              {isOutside ? 'Outside Premises' : 'Inside Premises'}
            </h3>
            {distance !== null && (
              <p className={`text-sm font-medium mt-1 ${isOutside ? 'text-red-600' : 'text-emerald-600'}`}>
                Distance from office: {distance}m
              </p>
            )}
          </div>

          {isOutside && (
            <p className="text-xs text-red-500 bg-white px-3 py-2 rounded-lg border border-red-100 shadow-sm font-medium">
              An alert has been sent to the administrators. Please return to the office immediately.
            </p>
          )}
        </div>
      </div>
    )}

    <div className="bg-white p-4 rounded-xl border border-zinc-200 w-full flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
        <MapPin size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Office Location</p>
        <p className="text-sm font-bold text-zinc-900">Neomed Headquarters</p>
        <p className="text-xs text-zinc-500">Radius: {GEOFENCE_RADIUS_METERS}m</p>
      </div>
    </div>
  </main>
    </div >
  );
}
