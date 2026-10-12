import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Battery, MapPin, Power, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrackingSocket } from '../hooks/useSocket';
import MapPreview, { type MapTrip } from '../components/MapPreview';
import { formatDateTimeIST } from '../lib/timeUtils';
import {
  getDeliveryCheckpoints,
  getDeliveryDayPath,
  getInvoices,
  getOnDutyDeliveries,
  normalizeFetchError,
  type ApiInvoice,
  type DeliveryCheckpointRow,
  type OnDutyDeliveryRow,
} from '../lib/api';
import { checkpointsToMapMarkers } from '../lib/checkpointPaths';
import { DEFAULT_MAP_CENTER, displayRidersToMapPreviewMarkers, mergeOnDutySnapshotsWithLive, type LiveFleetDisplayRider } from '../lib/liveFleetMap';
import { splitIntoTrips, type DayPoint } from '../lib/trips';
import type { LocationUpdateMessage } from '../hooks/useSocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';

const todayIso = () => new Date().toISOString().slice(0, 10);

const ago = (iso: string | null): string => {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${m % 60}m ago` : `${Math.floor(h / 24)}d ago`;
};

const STATUS_ORDER: Record<LiveFleetDisplayRider['status'], number> = { disconnected: 0, moving: 1, waiting: 2 };

const dot: Record<LiveFleetDisplayRider['status'], string> = {
  moving: 'bg-success',
  waiting: 'bg-warning',
  disconnected: 'bg-destructive',
};

function statusText(r: LiveFleetDisplayRider): string {
  if (r.status === 'moving') return r.speedMps != null ? `Moving · ${(r.speedMps * 3.6).toFixed(0)} km/h` : 'Moving';
  if (r.status === 'disconnected') return `No signal · ${ago(r.lastLocationAt)}`;
  return `Standing · ${ago(r.lastLocationAt)}`;
}

const km = (m: number) => `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Tracking() {
  const { token, user } = useAuth();
  const canTrack = user?.role === 'admin' || user?.role === 'manager';

  const { connected, subscribe } = useTrackingSocket(Boolean(canTrack && token));
  const [snapshots, setSnapshots] = useState<OnDutyDeliveryRow[]>([]);
  const [liveLocations, setLiveLocations] = useState<Record<number, LocationUpdateMessage>>({});
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const [selected, setSelected] = useState<number | null>(null);
  const [pathDate, setPathDate] = useState<string>(todayIso);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LiveFleetDisplayRider['status']>('all');

  const [dayPoints, setDayPoints] = useState<DayPoint[]>([]);
  const [pathSource, setPathSource] = useState('none');
  const [loadingPath, setLoadingPath] = useState(false);
  const [dayCheckpoints, setDayCheckpoints] = useState<DeliveryCheckpointRow[]>([]);
  const [stops, setStops] = useState<ApiInvoice[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    if (!token || !canTrack) return;
    setLoadingList(true);
    setLoadError(null);
    try {
      setSnapshots(await getOnDutyDeliveries(token));
      setLastRefresh(new Date());
    } catch (e) {
      setLoadError(normalizeFetchError(e, 'Tracking'));
    } finally {
      setLoadingList(false);
    }
  }, [token, canTrack]);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  useEffect(() => {
    if (!canTrack || !token) return;
    const id = window.setInterval(loadSnapshots, connected ? 45_000 : 5_000);
    return () => window.clearInterval(id);
  }, [canTrack, token, loadSnapshots, connected]);

  useEffect(() => {
    if (!canTrack) return;
    return subscribe((data) => {
      setLiveLocations((prev) => ({ ...prev, [data.user_id]: data }));
      setLastRefresh(new Date());
    });
  }, [canTrack, subscribe]);

  // Day path, checkpoints and delivered stops for the chosen rider and date.
  useEffect(() => {
    setHidden(new Set());
    setHover(null);
    if (!token || !canTrack || selected == null) {
      setDayPoints([]); setDayCheckpoints([]); setStops([]); setPathSource('none');
      return;
    }
    let cancelled = false;
    setLoadingPath(true);
    getDeliveryDayPath(token, selected, pathDate)
      .then((res) => {
        if (cancelled) return;
        setDayPoints((res.points || []).filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number').map((p) => ({ lat: p.lat, lng: p.lng, at: p.at })));
        setPathSource(res.source || 'none');
      })
      .catch(() => { if (!cancelled) { setDayPoints([]); setPathSource('none'); } })
      .finally(() => { if (!cancelled) setLoadingPath(false); });
    getDeliveryCheckpoints(token, { user_id: selected, date_from: pathDate, date_to: pathDate })
      .then((rows) => { if (!cancelled) setDayCheckpoints(rows || []); })
      .catch(() => { if (!cancelled) setDayCheckpoints([]); });
    getInvoices(token, { assigned_to: selected, status: 'delivered,completed', date_from: pathDate, date_to: pathDate, page: 1, page_size: 100, sort_by: 'delivered_at', sort_order: 'asc' })
      .then((res) => { if (!cancelled) setStops(res.items || []); })
      .catch(() => { if (!cancelled) setStops([]); });
    return () => { cancelled = true; };
  }, [token, canTrack, selected, pathDate]);

  // Esc goes back from a rider to the list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || selected == null) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || document.querySelector('[role="dialog"][data-state="open"]')) return;
      setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const allRiders = useMemo(() => mergeOnDutySnapshotsWithLive(snapshots, liveLocations), [snapshots, liveLocations]);
  const counts = useMemo(() => ({
    all: allRiders.length,
    moving: allRiders.filter((r) => r.status === 'moving').length,
    waiting: allRiders.filter((r) => r.status === 'waiting').length,
    disconnected: allRiders.filter((r) => r.status === 'disconnected').length,
  }), [allRiders]);

  const listRiders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRiders
      .filter((r) => (statusFilter === 'all' || r.status === statusFilter) && (!q || r.name.toLowerCase().includes(q)))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
  }, [allRiders, search, statusFilter]);

  const rider = selected != null ? allRiders.find((r) => r.id === selected) ?? null : null;

  const trips = useMemo(() => splitIntoTrips(dayPoints, dayCheckpoints), [dayPoints, dayCheckpoints]);
  const visibleTrips = trips.filter((t) => !hidden.has(t.id));
  const totalM = trips.reduce((s, t) => s + t.distanceM, 0);

  const mapTrips: MapTrip[] = visibleTrips.map((t) => ({
    id: t.id,
    number: t.number,
    color: t.color,
    positions: t.positions,
    highlighted: hover === t.id,
    dimmed: hover != null && hover !== t.id,
    label: `Trip ${t.number}: ${t.title} (${clock(t.startAt)} to ${clock(t.endAt)}, ${km(t.distanceM)})`,
  }));

  const mapRiders = displayRidersToMapPreviewMarkers(rider ? allRiders.filter((r) => r.id === rider.id) : allRiders);
  const markers = rider
    ? [
        ...checkpointsToMapMarkers(dayCheckpoints, null),
        ...stops
          .filter((inv) => typeof inv.delivery_latitude === 'number' && typeof inv.delivery_longitude === 'number')
          .map((inv) => ({
            pos: [inv.delivery_latitude as number, inv.delivery_longitude as number] as [number, number],
            label: `${inv.invoice_number} · ${inv.hospital_name}`,
            time: clock(inv.delivered_at || inv.created_at),
            status: 'completed' as const,
          })),
      ]
    : [];

  const fitPoints: [number, number][] = rider
    ? visibleTrips.length > 0
      ? visibleTrips.flatMap((t) => t.positions)
      : mapRiders.map((m) => m.pos)
    : mapRiders.map((m) => m.pos);
  const fitKey = rider ? `r${rider.id}-${pathDate}-${trips.length}-${hidden.size}` : `fleet-${allRiders.length}`;

  const onListKey = (e: React.KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'j', 'k'].includes(e.key)) return;
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-nav-row]'));
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1)))]?.focus();
  };

  if (!canTrack) {
    return <Card className="p-8 text-sm text-foreground/70">Live fleet tracking is limited to admin and manager accounts.</Card>;
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[520px] flex-col gap-3">
      {/* One compact bar: title, counts, date, refresh, live state */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="mr-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Live fleet</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{counts.all} on duty</Badge>
          <Badge variant="success" dot>{counts.moving} moving</Badge>
          <Badge variant="warning" dot>{counts.waiting} standing</Badge>
          {counts.disconnected > 0 && <Badge variant="danger" dot>{counts.disconnected} no signal</Badge>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input type="date" className="w-[150px]" value={pathDate} max={todayIso()} onChange={(e) => setPathDate(e.target.value || todayIso())} aria-label="Travel date" />
          {pathDate !== todayIso() && <Button variant="ghost" size="sm" onClick={() => setPathDate(todayIso())}>Today</Button>}
          <Button variant="ghost" size="icon" data-hotkey-refresh="" aria-label="Refresh" title="Refresh (r)" onClick={loadSnapshots} disabled={loadingList}>
            <RefreshCw className={loadingList ? 'animate-spin' : ''} />
          </Button>
          <Badge variant={connected ? 'success' : 'warning'} dot title={`Updated ${lastRefresh.toLocaleTimeString()}`}>
            {connected ? 'Live' : 'Connecting…'}
          </Badge>
        </div>
      </div>

      {loadError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{loadError}</div>}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Side panel: rider list, or one rider's day */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card max-lg:max-h-72" onKeyDown={onListKey}>
          {!rider ? (
            <>
              <div className="grid gap-2 border-b p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input data-search="" className="w-full pl-9" placeholder="Find a rider   ( / )" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Segmented
                  className="w-full"
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                  options={[
                    { value: 'all', label: <>All</> },
                    { value: 'moving', label: <>Moving</> },
                    { value: 'waiting', label: <>Standing</> },
                    { value: 'disconnected', label: <>No signal</> },
                  ]}
                />
              </div>
              <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
                {listRiders.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      data-nav-row=""
                      onClick={() => setSelected(r.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-accent"
                    >
                      <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                        {r.initials}
                        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${dot[r.status]}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className={`block truncate text-xs ${r.status === 'disconnected' ? 'text-destructive' : 'text-muted-foreground'}`}>{statusText(r)}</span>
                      </span>
                      {r.batteryPercent != null && (
                        <span className={`flex items-center gap-1 text-xs tabular-nums ${r.batteryPercent <= 20 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <Battery className="size-3.5" />{r.batteryPercent}%
                        </span>
                      )}
                    </button>
                  </li>
                ))}
                {listRiders.length === 0 && (
                  <li className="p-8 text-center text-sm text-muted-foreground">{allRiders.length === 0 ? 'No riders on duty.' : 'No rider matches.'}</li>
                )}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b p-3">
                <Button variant="ghost" size="icon-sm" aria-label="Back to all riders" title="Back (Esc)" onClick={() => setSelected(null)}>
                  <ArrowLeft />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{rider.name}</p>
                  <p className={`flex items-center gap-1.5 text-xs ${rider.status === 'disconnected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <span className={`size-2 rounded-full ${dot[rider.status]}`} />{statusText(rider)}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <dl className="grid grid-cols-3 divide-x border-b text-center">
                  <div className="px-2 py-2.5"><dt className="text-[11px] text-muted-foreground">Distance</dt><dd className="text-base font-semibold tabular-nums">{loadingPath ? '…' : km(totalM)}</dd></div>
                  <div className="px-2 py-2.5"><dt className="text-[11px] text-muted-foreground">Trips</dt><dd className="text-base font-semibold tabular-nums">{trips.length}</dd></div>
                  <div className="px-2 py-2.5"><dt className="text-[11px] text-muted-foreground">Delivered</dt><dd className="text-base font-semibold tabular-nums">{stops.length}</dd></div>
                </dl>

                {rider.suspectedPowerOff && (
                  <div className="m-3 flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
                    <Power className="mt-0.5 size-3.5 shrink-0" />
                    <span>Phone may have been switched off: last ping {formatDateTimeIST(rider.suspectedPowerOff.last_device_ping_at)}, battery was {rider.suspectedPowerOff.battery_percent_at_last_ping}%.</span>
                  </div>
                )}

                <div className="grid gap-1 px-3 py-2.5 text-xs text-muted-foreground">
                  {rider.lat != null && rider.lng != null && (
                    <p className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {rider.lat.toFixed(5)}, {rider.lng.toFixed(5)}</p>
                  )}
                  {rider.lastLocationAt && <p>Last seen {ago(rider.lastLocationAt)} ({formatDateTimeIST(rider.lastLocationAt)})</p>}
                  {rider.batteryPercent != null && <p>Battery {rider.batteryPercent}%</p>}
                </div>

                <div className="border-t">
                  <div className="flex items-center justify-between px-3 py-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trips</h3>
                    {trips.length > 0 && <span className="text-[11px] text-muted-foreground">same road, different colour per trip</span>}
                  </div>
                  {trips.length === 0 ? (
                    <p className="px-3 pb-4 text-sm text-muted-foreground">
                      {loadingPath ? 'Loading…' : dayCheckpoints.length === 0 ? 'No stops recorded for this day.' : 'No movement between stops was recorded.'}
                    </p>
                  ) : (
                    <ul className="divide-y border-t">
                      {trips.map((t) => (
                        <li
                          key={t.id}
                          data-nav-row=""
                          tabIndex={0}
                          onMouseEnter={() => setHover(t.id)}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover(t.id)}
                          onBlur={() => setHover(null)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setHidden((h) => { const n = new Set(h); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; });
                            }
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 outline-none hover:bg-muted focus-visible:bg-accent"
                        >
                          <Checkbox
                            aria-label={`Show trip ${t.number}`}
                            checked={!hidden.has(t.id)}
                            tabIndex={-1}
                            onCheckedChange={(v) => setHidden((h) => { const n = new Set(h); v ? n.delete(t.id) : n.add(t.id); return n; })}
                          />
                          <span className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ background: t.color }}>{t.number}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px]">{t.title}</span>
                            <span className="block text-xs text-muted-foreground">{clock(t.startAt)} – {clock(t.endAt)}</span>
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">{km(t.distanceM)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {trips.length > 0 && <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">Path source: {pathSource}. Space shows or hides a trip. Hover or focus a trip to highlight it.</p>}
                </div>
              </div>
            </>
          )}
        </aside>

        <Card className="relative min-h-[320px] overflow-hidden">
          <MapPreview
            bare
            riders={mapRiders}
            trips={mapTrips}
            checkpoints={markers}
            center={DEFAULT_MAP_CENTER}
            zoom={13}
            fitPoints={fitPoints}
            fitKey={fitKey}
          />
        </Card>
      </div>
    </div>
  );
}
