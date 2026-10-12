import type { DeliveryCheckpointRow } from './api';
import { checkpointJobRef, checkpointTypeLabel } from './checkpointPaths';

export interface DayPoint { lat: number; lng: number; at: string }

export interface Trip {
  id: string;
  /** 1-based, in the order driven. */
  number: number;
  color: string;
  startAt: string;
  endAt: string;
  from: DeliveryCheckpointRow | null;
  to: DeliveryCheckpointRow | null;
  positions: [number, number][];
  distanceM: number;
  /** "Delivered · Invoice #12" etc. */
  title: string;
}

/** Distinct colours: two trips on the same road must be told apart at a glance. */
export const TRIP_COLORS = ['#2563eb', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#16a34a', '#dc2626'];

/** Checkpoints that are connection noise, not places the rider went. */
const NOISE = new Set(['ws_disconnect', 'segment_superseded']);

const R = 6371000;
export function haversineM(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function length(positions: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < positions.length; i++) d += haversineM(positions[i - 1], positions[i]);
  return d;
}

/**
 * Cut the day's path into trips at each checkpoint (accept, delivery, return, break …).
 * Every trip gets its own number and colour, so a road driven three times shows as three lines.
 */
export function splitIntoTrips(points: DayPoint[], checkpoints: DeliveryCheckpointRow[]): Trip[] {
  const pts = [...points].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const cps = checkpoints
    .filter((c) => !NOISE.has(c.checkpoint_type))
    .sort((a, b) => +new Date(a.recorded_at) - +new Date(b.recorded_at));
  if (pts.length < 2 || cps.length === 0) return [];

  const bounds: { at: string; cp: DeliveryCheckpointRow | null }[] = cps.map((c) => ({ at: c.recorded_at, cp: c }));
  const trips: Trip[] = [];
  const push = (from: DeliveryCheckpointRow | null, startAt: string, to: DeliveryCheckpointRow | null, endAt: string) => {
    const t0 = +new Date(startAt), t1 = +new Date(endAt);
    const positions = pts
      .filter((p) => +new Date(p.at) >= t0 && +new Date(p.at) <= t1)
      .map((p) => [p.lat, p.lng] as [number, number]);
    const dist = length(positions);
    if (positions.length < 2 || dist < 30) return;
    const n = trips.length + 1;
    trips.push({
      id: `${from?.id ?? 'start'}-${to?.id ?? 'now'}`,
      number: n,
      color: TRIP_COLORS[(n - 1) % TRIP_COLORS.length],
      startAt, endAt, from, to, positions, distanceM: dist,
      title: to ? [checkpointTypeLabel(to.checkpoint_type), checkpointJobRef(to)].filter((x) => x !== '—').join(' · ') : 'Since last stop',
    });
  };
  for (let i = 0; i < bounds.length - 1; i++) push(bounds[i].cp, bounds[i].at, bounds[i + 1].cp, bounds[i + 1].at);
  // Whatever was driven after the last checkpoint (heading back, or still on the way).
  push(bounds[bounds.length - 1].cp, bounds[bounds.length - 1].at, null, pts[pts.length - 1].at);
  return trips;
}
