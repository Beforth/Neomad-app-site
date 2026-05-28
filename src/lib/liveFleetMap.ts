import type { OnDutyDeliveryRow, SuspectedPowerOffRow } from './api';
import type { LocationUpdateMessage } from '../hooks/useSocket';

/** Default map center (Nashik area) when no GPS points exist yet. */
export const DEFAULT_MAP_CENTER: [number, number] = [19.9975, 73.7898];

function initialsFromName(name: string | null, email: string): string {
  const n = (name || '').trim();
  if (!n) return (email[0] || '?').toUpperCase();
  return n
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
}

function statusLabelFor(
  status: string,
  lat: number | null,
  lng: number | null,
  lastAt: string | null,
): string {
  if (lat == null || lng == null) return 'No GPS fix yet';
  if (lastAt) {
    const d = new Date(lastAt);
    if (!Number.isNaN(d.getTime())) {
      const stale = Date.now() - d.getTime() > 10 * 60 * 1000;
      if (stale) return `Disconnected since ${d.toLocaleString()}`;
    }
  }
  if (status === 'moving') return 'Moving';
  return 'Stationary / waiting';
}

export interface LiveFleetDisplayRider {
  id: number;
  name: string;
  initials: string;
  status: 'moving' | 'waiting' | 'disconnected';
  statusLabel: string;
  order: string | null;
  lat: number | null;
  lng: number | null;
  speedMps: number | null;
  lastLocationAt: string | null;
  batteryPercent: number | null;
  suspectedPowerOff: SuspectedPowerOffRow | null;
}

/** Merge REST on-duty snapshot with latest WebSocket locations (same logic as Live Fleet page). */
export function mergeOnDutySnapshotsWithLive(
  rows: OnDutyDeliveryRow[],
  live: Record<number, LocationUpdateMessage>,
): LiveFleetDisplayRider[] {
  return rows.map((s) => {
    const u = live[s.user_id];
    const lat = u?.lat ?? s.lat;
    const lng = u?.lng ?? s.lng;
    const rawStatus = (u?.status ?? s.status) as string;
    const lastAt = u?.last_location_at ?? s.last_location_at;
    let disconnected = false;
    if (lastAt) {
      const d = new Date(lastAt);
      disconnected = !Number.isNaN(d.getTime()) && Date.now() - d.getTime() > 10 * 60 * 1000;
    }
    const status: 'moving' | 'waiting' | 'disconnected' = disconnected
      ? 'disconnected'
      : rawStatus === 'moving'
        ? 'moving'
        : 'waiting';
    const speed = u?.speed_mps ?? s.speed_mps;
    const name = (u?.full_name ?? s.full_name)?.trim() || s.email;
    const battery = u?.battery_percent ?? s.battery_percent ?? null;
    return {
      id: s.user_id,
      name,
      initials: initialsFromName(u?.full_name ?? s.full_name, s.email),
      status,
      statusLabel: statusLabelFor(status, lat, lng, lastAt),
      order: null,
      lat,
      lng,
      speedMps: speed,
      lastLocationAt: lastAt,
      batteryPercent: battery,
      suspectedPowerOff: s.suspected_power_off,
    };
  });
}

/** Rider props for [MapPreview]. */
export function displayRidersToMapPreviewMarkers(riders: LiveFleetDisplayRider[]): Array<{
  id: number;
  name: string;
  pos: [number, number];
  status: string;
  motion: 'moving' | 'waiting';
  order: string;
  batteryPercent: number | null;
}> {
  return riders
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      pos: [r.lat!, r.lng!] as [number, number],
      status: r.statusLabel,
      motion: r.status === 'moving' ? 'moving' : 'waiting',
      order: 'N/A',
      batteryPercent: r.batteryPercent,
    }));
}

export function averageCenterForMarkers(
  markers: Array<{ pos: [number, number] }>,
  fallback: [number, number] = DEFAULT_MAP_CENTER,
): [number, number] {
  if (markers.length === 0) return fallback;
  const sum = markers.reduce(
    (acc, m) => ({ lat: acc.lat + m.pos[0], lng: acc.lng + m.pos[1] }),
    { lat: 0, lng: 0 },
  );
  return [sum.lat / markers.length, sum.lng / markers.length];
}
