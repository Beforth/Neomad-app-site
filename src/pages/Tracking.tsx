import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrackingSocket } from '../hooks/useSocket';
import { Truck, Clock, RefreshCw, X, MapPin, Package, Users, ChevronRight, Battery, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapPreview from '../components/MapPreview';
import SearchableSelect from '../components/SearchableSelect';
import {
  getDeliveryDayPath,
  getDeliveryCheckpoints,
  getInvoices,
  getOnDutyDeliveries,
  normalizeFetchError,
  type ApiInvoice,
  type OnDutyDeliveryRow,
  type DeliveryCheckpointRow,
} from '../lib/api';
import {
  DEFAULT_MAP_CENTER,
  displayRidersToMapPreviewMarkers,
  mergeOnDutySnapshotsWithLive,
  type LiveFleetDisplayRider,
} from '../lib/liveFleetMap';
import type { LocationUpdateMessage } from '../hooks/useSocket';

function riderTone(status: LiveFleetDisplayRider['status']) {
  if (status === 'moving') {
    return {
      avatar: 'bg-emerald-500 shadow-md shadow-emerald-200',
      dot: 'bg-blue-500 animate-pulse',
    };
  }
  if (status === 'disconnected') {
    return {
      avatar: 'bg-red-500 shadow-md shadow-red-200',
      dot: 'bg-red-500',
    };
  }
  return {
    avatar: 'bg-amber-500 shadow-md shadow-amber-200',
    dot: 'bg-amber-500',
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
      className={`w-full text-left p-3 rounded-2xl border transition-all duration-300 ${
        selected ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/10' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white transition-all ${
              selected ? 'scale-105' : ''
            } ${tone.avatar}`}
          >
            {rider.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate leading-tight">{rider.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}
              />
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{rider.status}</p>
            </div>
          </div>
        </div>
        <ChevronRight size={14} className={`text-zinc-300 transition-transform duration-300 ${selected ? 'rotate-90 text-emerald-500' : ''}`} />
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1 border-t border-emerald-100/30">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-zinc-500 leading-tight">{rider.statusLabel}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase shrink-0">#{rider.id}</p>
              </div>

              {rider.lat != null && rider.lng != null && (
                <div className="flex items-start gap-1.5 bg-zinc-50 px-2 py-1.5 rounded-lg border border-zinc-100 text-[10px] text-zinc-600">
                  <MapPin size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-mono leading-relaxed">
                    {rider.lat.toFixed(5)}, {rider.lng.toFixed(5)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 text-[10px] text-zinc-600">
                {rider.batteryPercent != null && (
                  <div className="flex items-center justify-between bg-violet-50/50 p-2 rounded-xl border border-violet-100">
                    <span className="font-bold text-violet-600 uppercase flex items-center gap-1">
                      <Battery size={12} className="shrink-0" />
                      Battery
                    </span>
                    <span className="font-mono font-bold text-zinc-800">{rider.batteryPercent}%</span>
                  </div>
                )}
                {rider.suspectedPowerOff && (
                  <div className="flex flex-col gap-1 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold uppercase">
                      <Power size={12} className="shrink-0" />
                      Suspected intentional power-off
                    </div>
                    <p className="text-[9px] text-amber-900/90 leading-snug">
                      Last device ping{' '}
                      {new Date(rider.suspectedPowerOff.last_device_ping_at).toLocaleString()} · battery was{' '}
                      {rider.suspectedPowerOff.battery_percent_at_last_ping}% (logged{' '}
                      {new Date(rider.suspectedPowerOff.server_logged_at).toLocaleString()})
                    </p>
                  </div>
                )}
                {rider.speedMps != null && rider.speedMps >= 0 && (
                  <div className="flex items-center justify-between bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                    <span className="font-bold text-blue-500 uppercase">Speed</span>
                    <span className="font-mono font-bold">{(rider.speedMps * 3.6).toFixed(1)} km/h</span>
                  </div>
                )}
                {rider.lastLocationAt && (
                  <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-zinc-100">
                    <span className="font-bold text-zinc-400 uppercase">Last fix</span>
                    <span className="font-mono text-zinc-700">
                      {new Date(rider.lastLocationAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {rider.order && (
                <div className="flex items-center justify-between bg-emerald-100/30 px-2 py-1.5 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-1.5">
                    <Package size={12} className="text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase">{rider.order}</span>
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
  const [storeReturns, setStoreReturns] = useState<DeliveryCheckpointRow[]>([]);

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
    if (!token || !canTrack) {
      setStoreReturns([]);
      return;
    }
    let cancelled = false;
    const day = pathDate;
    getDeliveryCheckpoints(token, {
      checkpoint_type: 'invoice_returned_store',
      user_id: selected ?? undefined,
      date_from: day,
      date_to: day,
    })
      .then((rows) => {
        if (cancelled) return;
        setStoreReturns(rows || []);
      })
      .catch(() => {
        if (cancelled) return;
        setStoreReturns([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, canTrack, selected, pathDate]);

  const allRiders = mergeOnDutySnapshotsWithLive(snapshots, liveLocations);
  const riders = selected ? allRiders.filter((r) => r.id === selected) : allRiders;

  const mapRiders = displayRidersToMapPreviewMarkers(allRiders);

  const deliveryCheckpoints = todayDeliveries
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

  let mapCenter = DEFAULT_MAP_CENTER;
  if (selectedPath.length > 0) {
    const last = selectedPath[selectedPath.length - 1];
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
      <div className="p-8 rounded-3xl border border-zinc-200 bg-white text-zinc-600 text-sm">
        Live fleet tracking is limited to admin and manager accounts.
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Live Fleet</h1>
            <p className="text-zinc-500 text-sm">On-duty delivery staff and live GPS</p>
          </div>
          <div className="h-10 w-px bg-zinc-200 mx-2 hidden md:block" />
          <div className="hidden md:flex flex-col">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Select Rider</label>
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
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Travel Date</label>
              <input
                type="date"
                value={pathDate}
                onChange={(e) => setPathDate(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-3 py-1 text-xs font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500/20 min-w-[140px]"
              />
            </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadSnapshots()}
            disabled={loadingList}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 disabled:opacity-50"
            title="Refresh list from server"
          >
            <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="flex flex-col items-end">
            <div
              className={`flex items-center gap-2 text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider ${
                connected
                  ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                  : 'text-amber-700 bg-amber-50 border-amber-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {connected ? 'Live socket' : 'Connecting…'}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{loadError}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        {[
          { label: 'On duty', value: riders.length, icon: Users, color: 'blue' },
          { label: 'Moving', value: riders.filter((r) => r.status === 'moving').length, icon: Truck, color: 'emerald' },
          { label: 'Waiting', value: riders.filter((r) => r.status === 'waiting').length, icon: Clock, color: 'amber' },
          { label: 'Disconnected', value: riders.filter((r) => r.status === 'disconnected').length, icon: Power, color: 'red' },
          {
            label: 'On map',
            value: riders.filter((r) => r.lat != null && r.lng != null).length,
            icon: MapPin,
            color: 'indigo',
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-3.5 rounded-2xl border border-zinc-100 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg bg-${card.color}-50 text-${card.color}-600`}>
                <card.icon size={16} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{card.label}</p>
              <h3 className="text-xl font-black text-zinc-900 mt-1.5">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        <div className="lg:col-span-3 bg-white rounded-3xl border border-zinc-100 shadow-inner overflow-hidden min-h-[300px] lg:min-h-0 relative">
          <MapPreview
            riders={mapRiders}
            route={selectedPath}
            checkpoints={selected ? deliveryCheckpoints : []}
            center={mapCenter}
            zoom={selectedPath.length > 0 || mapRiders.length === 1 ? 15 : 13}
          />
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-zinc-100 shrink-0">
            <h3 className="font-bold text-zinc-900">Active Riders</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">{riders.length} on duty</p>
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
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 silver-gradient rounded-3xl">
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-bold">No riders on duty</p>
              </div>
            )}
          </div>

          {selected && (
            <div className="p-4 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
              <div className="mb-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>
                  {loadingPath ? 'Loading day path…' : `Path points: ${selectedPath.length}`}
                </span>
                <span>source: {pathSource}</span>
              </div>
              <div className="mb-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Today's delivered stops</span>
                <span>{deliveryCheckpoints.length}</span>
              </div>
              <div className="mb-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Returned to store</span>
                <span>{storeReturns.length}</span>
              </div>
              {storeReturns.length > 0 && (
                <div className="mb-3 max-h-28 overflow-auto rounded-lg border border-zinc-100 bg-white">
                  {storeReturns.slice(0, 8).map((row) => (
                    <div key={row.id} className="px-2 py-1.5 border-b border-zinc-50 text-[10px] text-zinc-600 flex items-center justify-between">
                      <span>#{row.invoice_id ?? row.task_id ?? row.id}</span>
                      <span>{new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <X size={12} /> Clear Rider Filter
                </div>
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
