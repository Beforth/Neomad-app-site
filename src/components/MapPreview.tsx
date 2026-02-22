
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
  html: `<div class="w-8 h-8 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16h6"/><path d="M15 16H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z"/><path d="M12 12V8"/><path d="M12 16v4"/><path d="M8 20h8"/></svg>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const riders = [
  { id: 1, name: 'Sagar Wagh', pos: [19.9975, 73.7898], status: 'Moving' },
  { id: 2, name: 'Rahul Patil', pos: [20.0050, 73.7800], status: 'Waiting' },
  { id: 3, name: 'Amit Shinde', pos: [19.9900, 73.8000], status: 'Delivering' },
  { id: 4, name: 'Pooja Kale', pos: [19.9850, 73.7750], status: 'Moving' },
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
              <div className="p-1">
                <p className="font-bold text-xs">{rider.name}</p>
                <p className="text-[10px] text-zinc-500">{rider.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
