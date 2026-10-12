import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrackingSocket } from '../hooks/useSocket';
import { Truck, Clock, RefreshCw, X, MapPin, Package, Users, ChevronRight, Battery, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapPreview from '../components/MapPreview';
import { formatDateTimeIST } from '../lib/timeUtils';
import SearchableSelect from '../components/SearchableSelect';
import CheckpointPathPanel from '../components/CheckpointPathPanel';
import {
  getCheckpointPath,
  getDeliveryDayPath,
  getDeliveryCheckpoints,
  getInvoices,
  getOnDutyDeliveries,
  normalizeFetchError,
  type ApiInvoice,
  type DeliveryCheckpointRow,
  type OnDutyDeliveryRow,
} from '../lib/api';
import {
  checkpointsToMapMarkers,
  segmentColorForCheckpoint,
} from '../lib/checkpointPaths';
import {
  DEFAULT_MAP_CENTER,
  displayRidersToMapPreviewMarkers,
  mergeOnDutySnapshotsWithLive,
  type LiveFleetDisplayRider,
} from '../lib/liveFleetMap';
import type { LocationUpdateMessage } from '../hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import KpiStrip from '@/components/KpiStrip';

function riderTone(status: LiveFleetDisplayRider['status']) {
  if (status === 'moving') {
    return {
      avatar: 'bg-primary shadow-md shadow-primary/20',
      dot: 'bg-info animate-pulse',
    };
  }
  if (status === 'disconnected') {
    return {
      avatar: 'bg-destructive shadow-md shadow-destructive/20',
      dot: 'bg-destructive',
    };
  }
  return {
    avatar: 'bg-warning shadow-md shadow-amber-200',
    dot: 'bg-warning',
  };
}

function RiderCard({
  rider,
  selected,
  onClick,
}: {
  rider: LiveFleetDisplayRider;
  selected: boolean;
  onClick: () => void;
}) {
  const tone = riderTone(rider.status);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${
        selected ? 'bg-accent border-primary/30 ring-2 ring-ring/10' : 'bg-muted border-border hover:bg-secondary'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white transition-all ${
              selected ? 'scale-105' : ''
            } ${tone.avatar}`}
          >
            {rider.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{rider.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}
              />
              <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-tight">{rider.status}</p>
            </div>
          </div>
        </div>
        <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform duration-300 ${selected ? 'rotate-90 text-primary' : ''}`} />
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1 border-t border-primary/20">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground leading-tight">{rider.statusLabel}</p>
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase shrink-0">#{rider.id}</p>
              </div>

              {rider.lat != null && rider.lng != null && (
                <div className="flex items-start gap-1.5 bg-muted px-2 py-1.5 rounded-lg border border-border text-[11px] text-foreground/70">
                  <MapPin size={12} className="text-primary shrink-0 mt-0.5" />
                  <span className="font-mono leading-relaxed">
                    {rider.lat.toFixed(5)}, {rider.lng.toFixed(5)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 text-[11px] text-foreground/70">
                {rider.batteryPercent != null && (
                  <div className="flex items-center justify-between bg-violet-50/50 p-2 rounded-xl border border-violet-100">
                    <span className="font-semibold text-violet-600 uppercase flex items-center gap-1">
                      <Battery size={12} className="shrink-0" />
                      Battery
                    </span>
                    <span className="font-mono font-semibold text-foreground">{rider.batteryPercent}%</span>
                  </div>
                )}
                {rider.suspectedPowerOff && (
                  <div className="flex flex-col gap-1 bg-warning/10 p-2 rounded-xl border border-warning/25">
                    <div className="flex items-center gap-1.5 text-warning font-semibold uppercase">
                      <Power size={12} className="shrink-0" />
                      Suspected intentional power-off
                    </div>
                    <p className="text-[11px] text-warning leading-snug">
                      Last device ping{' '}
                      {formatDateTimeIST(rider.suspectedPowerOff.last_device_ping_at)} · battery was{' '}
                      {rider.suspectedPowerOff.battery_percent_at_last_ping}% (logged{' '}
                      {formatDateTimeIST(rider.suspectedPowerOff.server_logged_at)})
                    </p>
                  </div>
                )}
                {rider.speedMps != null && rider.speedMps >= 0 && (
                  <div className="flex items-center justify-between bg-info/10 p-2 rounded-xl border border-info/25">
                    <span className="font-semibold text-info uppercase">Speed</span>
                    <span className="font-mono font-semibold">{(rider.speedMps * 3.6).toFixed(1)} km/h</span>
                  </div>
                )}
                {rider.lastLocationAt && (
                  <div className="flex items-center justify-between bg-card/80 p-2 rounded-xl border border-border">
                    <span className="font-semibold text-muted-foreground/70 uppercase">Last fix</span>
                    <span className="font-mono text-foreground/85">
                      {formatDateTimeIST(rider.lastLocationAt)}
                    </span>
                  </div>
                )}
              </div>

              {rider.order && (
                <div className="flex items-center justify-between bg-primary/15 px-2 py-1.5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-1.5">
                    <Package size={12} className="text-primary" />
                    <span className="text-[11px] font-semibold text-accent-foreground uppercase">{rider.order}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

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
  const [pathDate, setPathDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedPath, setSelectedPath] = useState<[number, number][]>([]);
  const [pathSource, setPathSource] = useState<string>('none');
  const [loadingPath, setLoadingPath] = useState(false);
  const [todayDeliveries, setTodayDeliveries] = useState<ApiInvoice[]>([]);
  const [dayCheckpoints, setDayCheckpoints] = useState<DeliveryCheckpointRow[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<number | null>(null);
  const [pathViewMode, setPathViewMode] = useState<'day' | 'segment'>('day');
  const [segmentRoute, setSegmentRoute] = useState<[number, number][]>([]);
  const [segmentSmoothed, setSegmentSmoothed] = useState<boolean | undefined>();
  const [loadingSegment, setLoadingSegment] = useState(false);

  const loadSnapshots = useCallback(async () => {
    if (!token || !canTrack) return;
    setLoadingList(true);
    setLoadError(null);
    try {
      const rows = await getOnDutyDeliveries(token);
      setSnapshots(rows);
      setLastRefresh(new Date());
    } catch (e) {
      setLoadError(normalizeFetchError(e, 'Tracking'));
    } finally {
      setLoadingList(false);
    }
  }, [token, canTrack]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    if (!canTrack || !token) return;
    const pollMs = connected ? 45_000 : 5_000;
    const id = window.setInterval(() => {
      loadSnapshots();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [canTrack, token, loadSnapshots, connected]);

  useEffect(() => {
    if (!canTrack) return;
    return subscribe((data) => {
      setLiveLocations((prev) => ({ ...prev, [data.user_id]: data }));
      setLastRefresh(new Date());
    });
  }, [canTrack, subscribe]);

  useEffect(() => {
    if (!token || !canTrack || selected == null) {
      setSelectedPath([]);
      setPathSource('none');
      return;
    }
    let cancelled = false;
    setLoadingPath(true);
    getDeliveryDayPath(token, selected, pathDate)
      .then((res) => {
        if (cancelled) return;
        const route: [number, number][] = (res.points || [])
          .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
          .map((p) => [p.lat, p.lng]);
        setSelectedPath(route);
        setPathSource(res.source || 'none');
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedPath([]);
        setPathSource('none');
      })
      .finally(() => {
        if (!cancelled) setLoadingPath(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, canTrack, selected, pathDate]);

  useEffect(() => {
    if (!token || !canTrack || selected == null) {
      setTodayDeliveries([]);
      return;
    }
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    getInvoices(token, {
      assigned_to: selected,
      status: 'delivered',
      date_from: today,
      date_to: today,
      page: 1,
      page_size: 100,
      sort_by: 'delivered_at',
      sort_order: 'asc',
    })
      .then((res) => {
        if (cancelled) return;
        setTodayDeliveries(res.items || []);
      })
      .catch(() => {
        if (cancelled) return;
        setTodayDeliveries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, canTrack, selected]);

  useEffect(() => {
    if (!token || !canTrack || selected == null) {
      setDayCheckpoints([]);
      setSelectedCheckpointId(null);
      setSegmentRoute([]);
      return;
    }
    setSelectedCheckpointId(null);
    setPathViewMode('day');
    let cancelled = false;
    getDeliveryCheckpoints(token, {
      user_id: selected,
      date_from: pathDate,
      date_to: pathDate,
    })
      .then((rows) => {
        if (cancelled) return;
        setDayCheckpoints(rows || []);
      })
      .catch(() => {
        if (cancelled) return;
        setDayCheckpoints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, canTrack, selected, pathDate]);

  useEffect(() => {
    if (!token || !canTrack || selectedCheckpointId == null || pathViewMode !== 'segment') {
      setSegmentRoute([]);
      setSegmentSmoothed(undefined);
      return;
    }
    const row = dayCheckpoints.find((c) => c.id === selectedCheckpointId);
    if (!row?.path_id) {
      setSegmentRoute([]);
      return;
    }
    let cancelled = false;
    setLoadingSegment(true);
    getCheckpointPath(token, selectedCheckpointId)
      .then((seg) => {
        if (cancelled) return;
        const route: [number, number][] = (seg.points || [])
          .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
          .map((p) => [p.lat, p.lng]);
        setSegmentRoute(route);
        setSegmentSmoothed(seg.is_smoothed);
      })
      .catch(() => {
        if (cancelled) return;
        setSegmentRoute([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSegment(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, canTrack, selectedCheckpointId, pathViewMode, dayCheckpoints]);

  const handleSelectCheckpoint = (id: number | null) => {
    setSelectedCheckpointId(id);
    if (id == null) {
      setPathViewMode('day');
      return;
    }
    const row = dayCheckpoints.find((c) => c.id === id);
    if (row?.path_id) {
      setPathViewMode('segment');
    }
  };

  const selectedCheckpoint = dayCheckpoints.find((c) => c.id === selectedCheckpointId) ?? null;

  const allRiders = mergeOnDutySnapshotsWithLive(snapshots, liveLocations);
  const riders = selected ? allRiders.filter((r) => r.id === selected) : allRiders;

  const mapRiders = displayRidersToMapPreviewMarkers(allRiders);

  const deliveryStopMarkers = todayDeliveries
    .filter(
      (inv) =>
        typeof inv.delivery_latitude === 'number' &&
        typeof inv.delivery_longitude === 'number'
    )
    .map((inv) => ({
      pos: [inv.delivery_latitude as number, inv.delivery_longitude as number] as [number, number],
      label: `${inv.invoice_number} - ${inv.hospital_name}`,
      time: new Date(inv.delivered_at || inv.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'completed' as const,
    }));

  const jobCheckpointMarkers = selected
    ? checkpointsToMapMarkers(dayCheckpoints, selectedCheckpointId)
    : [];

  const mapCheckpoints = [...jobCheckpointMarkers, ...deliveryStopMarkers];

  const segmentLines =
    pathViewMode === 'segment' && segmentRoute.length > 1 && selectedCheckpoint
      ? [
          {
            positions: segmentRoute,
            color: segmentColorForCheckpoint(selectedCheckpoint.checkpoint_type),
            weight: 5,
            opacity: 0.9,
          },
        ]
      : [];

  const mapDayRoute = pathViewMode === 'day' ? selectedPath : [];

  let mapCenter = DEFAULT_MAP_CENTER;
  const activeRoute = pathViewMode === 'segment' ? segmentRoute : selectedPath;
  if (activeRoute.length > 0) {
    const last = activeRoute[activeRoute.length - 1];
    mapCenter = [last[0], last[1]];
  }
  if (mapRiders.length > 0) {
    const sum = mapRiders.reduce(
      (acc, m) => ({ lat: acc.lat + m.pos[0], lng: acc.lng + m.pos[1] }),
      { lat: 0, lng: 0 },
    );
    mapCenter = [sum.lat / mapRiders.length, sum.lng / mapRiders.length];
  }

  if (!canTrack) {
    return (
      <Card className="p-8 text-foreground/70 text-sm" >
        Live fleet tracking is limited to admin and manager accounts.
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Live Fleet</h1>
            <p className="text-[13px] text-muted-foreground">On-duty delivery staff and live GPS</p>
          </div>
          <div className="h-10 w-px bg-border mx-2 hidden md:block" />
          <div className="hidden md:flex flex-col">
            <label className="text-xs font-medium text-muted-foreground/70 mb-1">Select Rider</label>
            <SearchableSelect
              value={selected ? String(selected) : ''}
              onChange={(v) => setSelected(v ? Number(v) : null)}
              options={[
                { value: '', label: 'All Fleet View' },
                ...allRiders.map((r) => ({ value: String(r.id), label: r.name })),
              ]}
              className="min-w-[180px]"
            />
          </div>
            <div className="hidden md:flex flex-col">
              <label className="text-xs font-medium text-muted-foreground/70 mb-1">Travel Date</label>
              <Input className="min-w-[140px]"
                type="date"
                value={pathDate}
                onChange={(e) => setPathDate(e.target.value)}
                
              />
            </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm"
            type="button"
            onClick={() => loadSnapshots()}
            disabled={loadingList}
            
            title="Refresh list from server"
          >
            <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <div className="flex flex-col items-end">
            <div
              className={`flex items-center gap-2 text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wider ${
                connected
                  ? 'text-primary bg-accent border-primary/20'
                  : 'text-warning bg-warning/10 border-warning/25'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-primary animate-pulse' : 'bg-warning'}`} />
              {connected ? 'Live socket' : 'Connecting…'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 font-medium mt-1">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{loadError}</div>
      )}

      <KpiStrip items={[
  { label: 'On duty', value: riders.length },
  { label: 'Moving', value: riders.filter((r) => r.status === 'moving').length },
  { label: 'Waiting', value: riders.filter((r) => r.status === 'waiting').length },
  { label: 'Disconnected', value: riders.filter((r) => r.status === 'disconnected').length },
  { label: 'On map', value: riders.filter((r) => r.lat != null && r.lng != null).length },
]} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        <Card className="lg:col-span-3 overflow-hidden min-h-[300px] lg:min-h-0 relative" >
          <MapPreview
            riders={mapRiders}
            route={mapDayRoute}
            routeSegments={segmentLines}
            checkpoints={selected ? mapCheckpoints : []}
            center={mapCenter}
            zoom={activeRoute.length > 0 || mapRiders.length === 1 ? 15 : 13}
          />
        </Card>

        <Card className="flex flex-col min-h-0" >
          <div className="p-4 border-b border-border shrink-0">
            <h3 className="font-semibold text-foreground">Active Riders</h3>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{riders.length} on duty</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {riders.map((rider) => (
              <RiderCard
                key={rider.id}
                rider={rider}
                selected={selected === rider.id}
                onClick={() => setSelected(selected === rider.id ? null : rider.id)}
              />
            ))}
            {riders.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground/70 silver-gradient rounded-xl">
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-semibold">No riders on duty</p>
              </div>
            )}
          </div>

          {selected && (
            <div className="p-4 border-t border-border shrink-0 bg-muted/50 space-y-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>
                  {loadingPath ? 'Loading day path…' : `Day path: ${selectedPath.length} pts`}
                </span>
                <span>source: {pathSource}</span>
              </div>
              <CheckpointPathPanel
                checkpoints={dayCheckpoints}
                selectedCheckpointId={selectedCheckpointId}
                onSelectCheckpoint={handleSelectCheckpoint}
                loadingPath={loadingSegment}
                segmentPointCount={segmentRoute.length}
                segmentSmoothed={segmentSmoothed}
                viewMode={pathViewMode}
                onViewModeChange={setPathViewMode}
                compact
              />
              <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Today&apos;s delivered stops</span>
                <span>{deliveryStopMarkers.length}</span>
              </div>
              <Button variant="soft" size="icon-sm" className="w-full bg-accent border-primary/20 text-accent-foreground hover:bg-primary/15"
                type="button"
                onClick={() => setSelected(null)}
                
              >
                <div className="flex items-center gap-2">
                  <X size={12} /> Clear Rider Filter
                </div>
                <ChevronRight size={12} />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
