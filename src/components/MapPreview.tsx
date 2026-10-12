import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';

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

const createRiderIcon = (
  name: string,
  isCheckpoint = false,
  status: 'completed' | 'active' = 'completed',
  motion: 'moving' | 'waiting' = 'moving',
) => {
  if (isCheckpoint) {
    return L.divIcon({
      className: 'custom-checkpoint-icon',
      html: `
        <div class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-card shadow-md font-bold text-[10px] text-white" 
             style="background: ${status === 'active' ? '#3b82f6' : '#10b981'};">
          ${status === 'active'
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const bg =
    motion === 'waiting'
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  return L.divIcon({
    className: 'custom-rider-icon',
    html: `
      <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-card shadow-lg font-bold text-xs text-white" 
           style="background: ${bg}; min-width: 40px;">
        ${initials}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};


/** One trip (a leg between two checkpoints) drawn as its own coloured line with direction arrows. */
export interface MapTrip {
  id: number | string;
  number: number;
  color: string;
  positions: [number, number][];
  /** Everything else dims while one trip is highlighted. */
  dimmed?: boolean;
  highlighted?: boolean;
  label?: string;
}

const toRad = (d: number) => (d * Math.PI) / 180;
function bearingDeg(a: [number, number], b: [number, number]): number {
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
  return (Math.atan2(y, x) * 180) / Math.PI;
}
function stepM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dp = toRad(b[0] - a[0]);
  const dl = toRad(b[1] - a[1]);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Points along the line (by distance) where a direction arrow is drawn. */
function arrowSpots(positions: [number, number][]): { pos: [number, number]; angle: number }[] {
  if (positions.length < 2) return [];
  const cum: number[] = [0];
  for (let i = 1; i < positions.length; i++) cum.push(cum[i - 1] + stepM(positions[i - 1], positions[i]));
  const total = cum[cum.length - 1];
  if (total < 120) return [];
  const count = Math.min(6, Math.max(1, Math.floor(total / 400)));
  const out: { pos: [number, number]; angle: number }[] = [];
  for (let k = 1; k <= count; k++) {
    const target = (total * k) / (count + 1);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < target) i++;
    out.push({ pos: positions[i], angle: bearingDeg(positions[i - 1], positions[i]) });
  }
  return out;
}

const arrowIcon = (color: string, angle: number, faded: boolean) =>
  L.divIcon({
    className: 'trip-arrow',
    html: `<div style="transform:rotate(${angle}deg);opacity:${faded ? 0.25 : 1};width:16px;height:16px;display:flex;align-items:center;justify-content:center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2.5" stroke-linejoin="round"><path d="M12 2 20 21 12 16 4 21z"/></svg></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const tripBadgeIcon = (n: number, color: string, faded: boolean) =>
  L.divIcon({
    className: 'trip-badge',
    html: `<div style="background:${color};opacity:${faded ? 0.35 : 1}" class="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white shadow font-semibold text-[10px] text-white">${n}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

/** Zoom the map to fit these points whenever `fitKey` changes. */
function FitBounds({ points, fitKey }: { points: [number, number][]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 16); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
  return null;
}

export const DEFAULT_RIDERS = [
  { id: 1, name: 'Sagar Wagh', pos: [19.9975, 73.7898] as [number, number], status: 'Heading to City Hospital', motion: 'moving' as const, order: 'INV-2024-001' },
  { id: 2, name: 'Rahul Patil', pos: [20.0050, 73.7800] as [number, number], status: 'Waiting at Metro Clinic', motion: 'waiting' as const, order: 'INV-2024-002' },
  { id: 3, name: 'Amit Shinde', pos: [19.9900, 73.8000] as [number, number], status: 'Pick-up from Warehouse', motion: 'moving' as const, order: 'N/A' },
  { id: 4, name: 'Pooja Kale', pos: [19.9850, 73.7750] as [number, number], status: 'Delivering to Apollo', motion: 'moving' as const, order: 'INV-2024-004' },
];

export interface RouteSegmentLine {
  positions: [number, number][];
  color: string;
  weight?: number;
  opacity?: number;
}

interface MapPreviewProps {
  riders?: any[];
  route?: [number, number][];
  /** Colored path segments (e.g. moving/slow/idle in reports). When set, overrides single `route` color. */
  routeSegments?: RouteSegmentLine[];
  checkpoints?: { pos: [number, number]; label: string; time: string; status: 'completed' | 'active' }[];
  center?: [number, number];
  zoom?: number;
  /** Coloured, numbered trips with arrows. Use this when the same road may be driven several times. */
  trips?: MapTrip[];
  /** When set, the map zooms to these points whenever `fitKey` changes. */
  fitPoints?: [number, number][];
  fitKey?: string;
  /** Fill the parent without the framed border (full-bleed maps). */
  bare?: boolean;
}

export default function MapPreview({
  riders = DEFAULT_RIDERS,
  route = [],
  routeSegments = [],
  checkpoints = [],
  center = [19.9975, 73.7898],
  zoom = 13,
  trips = [],
  fitPoints,
  fitKey,
  bare = false,
}: MapPreviewProps) {
  const arrows = useMemo(() => trips.map((t) => ({ id: t.id, spots: arrowSpots(t.positions) })), [trips]);
  return (
    <div className={bare ? 'w-full h-full bg-muted' : 'w-full h-full rounded-lg overflow-hidden border border-border shadow-inner bg-muted'}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        minZoom={3}
        maxZoom={19}
        zoomSnap={0.25}
        zoomDelta={0.5}
      >
        <ResizeHandler center={center} zoom={zoom} />
        {fitPoints && <FitBounds points={fitPoints} fitKey={fitKey ?? String(fitPoints.length)} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          maxNativeZoom={19}
        />

        {/* Render Route Polyline(s) */}
        {routeSegments.length > 0
          ? routeSegments.map((seg, idx) =>
              seg.positions.length > 1 ? (
                <Polyline
                  key={`seg-${idx}`}
                  positions={seg.positions}
                  color={seg.color}
                  weight={seg.weight ?? 5}
                  opacity={seg.opacity ?? 0.85}
                />
              ) : null
            )
          : route.length > 0 && (
              <Polyline positions={route} color="#10b981" weight={4} opacity={0.6} dashArray="8, 8" />
            )}

        {/* Trips: white casing under a coloured line so overlapping trips stay readable */}
        {trips.map((t) =>
          t.positions.length > 1 ? (
            <Polyline key={`trip-casing-${t.id}`} positions={t.positions} pathOptions={{ color: '#ffffff', weight: t.highlighted ? 10 : 8, opacity: t.dimmed ? 0.25 : 0.9 }} />
          ) : null,
        )}
        {trips.map((t) =>
          t.positions.length > 1 ? (
            <Polyline key={`trip-${t.id}`} positions={t.positions} pathOptions={{ color: t.color, weight: t.highlighted ? 6 : 4, opacity: t.dimmed ? 0.3 : 0.95 }}>
              {t.label && <Tooltip sticky>{t.label}</Tooltip>}
            </Polyline>
          ) : null,
        )}
        {arrows.map((a) => {
          const t = trips.find((x) => x.id === a.id)!;
          return a.spots.map((sp, i) => (
            <Marker key={`arrow-${a.id}-${i}`} position={sp.pos} icon={arrowIcon(t.color, sp.angle, !!t.dimmed)} interactive={false} />
          ));
        })}
        {trips.map((t) =>
          t.positions.length > 0 ? (
            <Marker key={`badge-${t.id}`} position={t.positions[0]} icon={tripBadgeIcon(t.number, t.color, !!t.dimmed)} interactive={false} zIndexOffset={500} />
          ) : null,
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
                <div className="font-semibold text-foreground text-xs">{cp.label}</div>
                <div className="text-[11px] text-muted-foreground font-medium">{cp.time}</div>
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* Render Riders */}
        {riders.map((rider) => {
          const motion: 'moving' | 'waiting' =
            rider.motion === 'waiting' || rider.status?.includes?.('Waiting')
              ? 'waiting'
              : 'moving';
          return (
          <Marker
            key={rider.id}
            position={rider.pos as [number, number]}
            icon={createRiderIcon(rider.name, false, 'completed', motion)}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="p-2 min-w-[140px] space-y-1">
                <div className="font-semibold text-foreground text-sm border-b border-border pb-1">{rider.name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className={`w-1.5 h-1.5 rounded-full ${motion === 'waiting' ? 'bg-warning' : 'bg-primary'}`}></div>
                  <span className="font-medium">{rider.status}</span>
                </div>
                <div className="text-[11px] font-semibold text-violet-700 tabular-nums">
                  Battery{' '}
                  {typeof rider.batteryPercent === 'number' ? `${rider.batteryPercent}%` : '—'}
                </div>
                {rider.order !== 'N/A' && (
                  <div className="text-[11px] font-semibold text-primary bg-accent px-1.5 py-0.5 rounded inline-block">
                    {rider.order}
                  </div>
                )}
              </div>
            </Tooltip>
            <Popup>
              <div className="p-1 min-w-[120px]">
                <p className="font-semibold text-foreground text-sm mb-1">{rider.name}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${motion === 'waiting' ? 'bg-warning' : 'bg-primary'}`}></div>
                  <span>{rider.status}</span>
                </div>
                <p className="text-[11px] font-semibold text-violet-700 tabular-nums mb-1">
                  Battery{' '}
                  {typeof rider.batteryPercent === 'number' ? `${rider.batteryPercent}%` : '—'}
                </p>
                {rider.order !== 'N/A' && (
                  <p className="text-[11px] font-semibold text-primary bg-accent px-1.5 py-0.5 rounded inline-block">
                    {rider.order}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

