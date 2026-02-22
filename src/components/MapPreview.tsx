
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Custom rider icon
const riderIcon = L.divIcon({
  className: 'custom-rider-icon',
  html: `<div class="relative group">
          <div class="w-10 h-10 bg-emerald-500 rounded-2xl border-2 border-white shadow-lg flex items-center justify-center text-white transform -rotate-45 group-hover:bg-zinc-900 transition-colors">
            <div class="rotate-45">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
              </svg>
            </div>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white shadow-sm ring-4 ring-emerald-500/20"></div>
        </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

const riders = [
  { id: 1, name: 'Sagar Wagh', pos: [19.9975, 73.7898], status: 'Heading to City Hospital', order: 'INV-2024-001' },
  { id: 2, name: 'Rahul Patil', pos: [20.0050, 73.7800], status: 'Waiting at Metro Clinic', order: 'INV-2024-002' },
  { id: 3, name: 'Amit Shinde', pos: [19.9900, 73.8000], status: 'Pick-up from Warehouse', order: 'N/A' },
  { id: 4, name: 'Pooja Kale', pos: [19.9850, 73.7750], status: 'Delivering to Apollo', order: 'INV-2024-004' },
];

export default function MapPreview() {
  const center: [number, number] = [19.9975, 73.7898]; // Nashik Center

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-100 shadow-inner">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {riders.map((rider) => (
          <Marker 
            key={rider.id} 
            position={rider.pos as [number, number]} 
            icon={riderIcon}
          >
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
