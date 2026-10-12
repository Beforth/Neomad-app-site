import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { appApi } from '../lib/appApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
        } else {
          setIsOutside(false);
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
    <div className="min-h-full bg-muted flex flex-col relative w-full">
      {/* Redundant header removed - using global TopBar */}
      <header className="flex items-center justify-between p-4 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-info flex items-center justify-center text-white font-semibold">
          {user?.username[0].toUpperCase()}
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{user?.username}</h2>
          <p className="text-xs text-muted-foreground font-medium">Staff Member</p>
        </div>
      </div>
      <Button variant="secondary" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={logout} >
        <LogOut size={18} />
      </Button>
    </header>

      {/* Main Content */ }
  <main className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center space-y-6">
    <div className="text-center space-y-2">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Workspace Status</h1>
      <p className="text-[13px] text-muted-foreground">Live geolocation tracking enabled.</p>
    </div>

    {locationError ? (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 w-full">
        <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-semibold text-destructive">Location Error</p>
          <p className="text-xs text-destructive mt-1">{locationError}</p>
        </div>
      </div>
    ) : (
      <div className={`w-full p-6 rounded-xl border-2 transition-all duration-500 ${isOutside ? 'bg-destructive/10 border-destructive/20' : 'bg-accent border-primary/20'}`}>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${isOutside ? 'bg-destructive shadow-destructive/20' : 'bg-primary shadow-primary/20'}`}>
            {isOutside ? <AlertTriangle className="text-white" size={32} /> : <CheckCircle2 className="text-white" size={32} />}
          </div>

          <div>
            <h3 className={`text-xl font-semibold ${isOutside ? 'text-destructive' : 'text-accent-foreground'}`}>
              {isOutside ? 'Outside Premises' : 'Inside Premises'}
            </h3>
            {distance !== null && (
              <p className={`text-sm font-medium mt-1 ${isOutside ? 'text-destructive' : 'text-primary'}`}>
                Distance from office: {distance}m
              </p>
            )}
          </div>

          {isOutside && (
            <p className="text-xs text-destructive bg-card px-3 py-2 rounded-lg border border-destructive/20 shadow-[0_1px_2px_rgb(0_0_0/0.03)] font-medium">
              An alert has been sent to the administrators. Please return to the office immediately.
            </p>
          )}
        </div>
      </div>
    )}

    <Card className="p-4 w-full flex items-center gap-3" >
      <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info shrink-0">
        <MapPin size={18} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground/70">Office Location</p>
        <p className="text-sm font-semibold text-foreground">Neomed Headquarters</p>
        <p className="text-xs text-muted-foreground">Radius: {GEOFENCE_RADIUS_METERS}m</p>
      </div>
    </Card>
  </main>
    </div >
  );
}
