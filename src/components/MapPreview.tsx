import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with Webpack/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to fix the "gray map" issue by invalidating size on mount and changes
function ResizeHandler({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    // Small delay to ensure container transition/animation is complete
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map, center, zoom]);

  return null;
}

const createRiderIcon = (name: string, isCheckpoint = false, status: 'completed' | 'active' = 'completed') => {
  if (isCheckpoint) {
    return L.divIcon({
      className: 'custom-checkpoint-icon',
      html: `
        <div class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-md font-bold text-[10px] text-white" 
             style="background: ${status === 'active' ? '#3b82f6' : '#10b981'};">
          ${status === 'active' ? '📍' : '✓'}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  return L.divIcon({
    className: 'custom-rider-icon',
    html: `
      <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-lg font-bold text-xs text-white" 
           style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); min-width: 40px;">
        ${initials}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export const DEFAULT_RIDERS = [
  { id: 1, name: 'Sagar Wagh', pos: [19.9975, 73.7898], status: 'Heading to City Hospital', order: 'INV-2024-001' },
  { id: 2, name: 'Rahul Patil', pos: [20.0050, 73.7800], status: 'Waiting at Metro Clinic', order: 'INV-2024-002' },
  { id: 3, name: 'Amit Shinde', pos: [19.9900, 73.8000], status: 'Pick-up from Warehouse', order: 'N/A' },
  { id: 4, name: 'Pooja Kale', pos: [19.9850, 73.7750], status: 'Delivering to Apollo', order: 'INV-2024-004' },
];

interface MapPreviewProps {
  riders?: any[];
  route?: [number, number][];
  checkpoints?: { pos: [number, number]; label: string; time: string; status: 'completed' | 'active' }[];
  center?: [number, number];
  zoom?: number;
}

export default function MapPreview({ riders = DEFAULT_RIDERS, route = [], checkpoints = [], center = [19.9975, 73.7898], zoom = 13 }: MapPreviewProps) {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-100 shadow-inner bg-zinc-50">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <ResizeHandler center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render Route Polyline */}
        {route.length > 0 && (
          <Polyline positions={route} color="#10b981" weight={4} opacity={0.6} dashArray="8, 8" />
        )}

        {/* Render Checkpoints */}
        {checkpoints.map((cp, idx) => (
          <Marker 
            key={`cp-${idx}`} 
            position={cp.pos} 
            icon={createRiderIcon('', true, cp.status)}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="p-2 min-w-[100px] space-y-1">
                <div className="font-bold text-zinc-900 text-xs">{cp.label}</div>
                <div className="text-[10px] text-zinc-500 font-medium">{cp.time}</div>
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* Render Riders */}
        {riders.map((rider) => (
          <Marker 
            key={rider.id} 
            position={rider.pos as [number, number]} 
            icon={createRiderIcon(rider.name)}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="p-2 min-w-[140px] space-y-1">
                <div className="font-bold text-zinc-900 text-sm border-b border-zinc-100 pb-1">{rider.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <div className={`w-1.5 h-1.5 rounded-full ${rider.status.includes('Waiting') ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                  <span className="font-medium">{rider.status}</span>
                </div>
                {rider.order !== 'N/A' && (
                  <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                    {rider.order}
                  </div>
                )}
              </div>
            </Tooltip>
            <Popup>
              <div className="p-1 min-w-[120px]">
                <p className="font-bold text-zinc-900 text-sm mb-1">{rider.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${rider.status.includes('Waiting') ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                  <span>{rider.status}</span>
                </div>
                {rider.order !== 'N/A' && (
                  <p className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                    {rider.order}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

