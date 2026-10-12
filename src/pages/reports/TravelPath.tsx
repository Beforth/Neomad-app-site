import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Download, Clock, TrendingUp, Users, AlertCircle, CheckCircle2, Package, BarChart3, Filter, MapPin, PauseCircle } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import MapPreview, { type RouteSegmentLine } from '../../components/MapPreview';
import CheckpointPathPanel from '../../components/CheckpointPathPanel';
import { motion } from 'motion/react';
import { appApi } from '../../lib/appApi';
import { useAuth } from '../../context/AuthContext';
import {
  getCheckpointPath,
  getDeliveryCheckpoints,
  getDeliveryPathReport,
  normalizeFetchError,
  type DeliveryCheckpointRow,
  type DeliveryPathReportResponse,
} from '../../lib/api';
import {
  checkpointsToMapMarkers,
  segmentColorForCheckpoint,
} from '../../lib/checkpointPaths';
import { DEFAULT_MAP_CENTER } from '../../lib/liveFleetMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import KpiStrip from '@/components/KpiStrip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';

const SEGMENT_COLORS: Record<string, string> = {
  moving: '#22c55e',
  slow: '#f59e0b',
  idle: '#ef4444',
};

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

const CHART_STYLE = {
  contentStyle: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f4f4f5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  cursor: { fill: '#f8fafc' },
};

/** Avoid Recharts width/height -1 warnings when parent layout is not ready (tabs, motion). */
function ReportChartBox({
  height,
  width = '100%',
  children,
}: {
  height: number;
  width?: number | string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setSize({ w, h });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fixedWidth = typeof width === 'number';

  return (
    <div
      ref={ref}
      className={fixedWidth ? 'shrink-0' : 'w-full min-w-0'}
      style={{
        height,
        width: fixedWidth ? width : width === '100%' ? '100%' : width,
      }}
    >
      {size ? (
        <ResponsiveContainer width={size.w} height={size.h}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

type ReportTab = 'delivery' | 'availability' | 'travel';

const REPORT_TABS: { id: ReportTab; label: string; icon: typeof Package }[] = [
  { id: 'delivery', label: 'Delivery Duration', icon: Package },
  { id: 'availability', label: 'Availability', icon: BarChart3 },
  { id: 'travel', label: 'Travel Path', icon: MapPin },
];

function parseReportTab(raw: string | null): ReportTab {
  if (raw === 'availability' || raw === 'travel') return raw;
  return 'delivery';
}

export default function TravelPath() {
  const { token, user } = useAuth();
  const canTrack = user?.role === 'admin' || user?.role === 'manager';

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = 'travel' as const;

  const setReportTab = useCallback(
    (next: ReportTab) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('tab', next);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [dateRange, setDateRange] = useState('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [boyFilter, setBoyFilter] = useState('All');

  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalBoys: 0, totalDelivered: 0 });
  const [boyStats, setBoyStats] = useState({ delivered: 0 });
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  const [pathReportDate, setPathReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pathReport, setPathReport] = useState<DeliveryPathReportResponse | null>(null);
  const [pathReportLoading, setPathReportLoading] = useState(false);
  const [pathReportError, setPathReportError] = useState<string | null>(null);
  const [tripCheckpoints, setTripCheckpoints] = useState<DeliveryCheckpointRow[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<number | null>(null);
  const [pathViewMode, setPathViewMode] = useState<'day' | 'segment'>('day');
  const [segmentRoute, setSegmentRoute] = useState<[number, number][]>([]);
  const [segmentSmoothed, setSegmentSmoothed] = useState<boolean | undefined>();
  const [loadingSegment, setLoadingSegment] = useState(false);

  useEffect(() => {
    appApi.getUsers()
      .then((users: any) => setDeliveryBoys(users.filter((u: any) => u.role === 'delivery_boy')))
      .catch(() => setDeliveryBoys([]));
  }, []);

  useEffect(() => {
    if (tab !== 'travel' || !token || !canTrack || boyFilter === 'All') {
      setPathReport(null);
      setPathReportError(null);
      return;
    }
    const userId = Number(boyFilter);
    if (!Number.isFinite(userId)) return;
    const date = pathReportDate || new Date().toISOString().slice(0, 10);
    let cancelled = false;
    setPathReportLoading(true);
    setPathReportError(null);
    getDeliveryPathReport(token, userId, date)
      .then((res) => {
        if (!cancelled) setPathReport(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setPathReport(null);
          setPathReportError(normalizeFetchError(e, 'Path report'));
        }
      })
      .finally(() => {
        if (!cancelled) setPathReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, token, canTrack, boyFilter, pathReportDate]);

  useEffect(() => {
    if (tab !== 'travel' || !token || !canTrack || boyFilter === 'All') {
      setTripCheckpoints([]);
      setSelectedCheckpointId(null);
      setSegmentRoute([]);
      return;
    }
    setSelectedCheckpointId(null);
    setPathViewMode('day');
    const userId = Number(boyFilter);
    if (!Number.isFinite(userId)) return;
    const date = pathReportDate || new Date().toISOString().slice(0, 10);
    let cancelled = false;
    getDeliveryCheckpoints(token, { user_id: userId, date_from: date, date_to: date })
      .then((rows) => {
        if (!cancelled) setTripCheckpoints(rows || []);
      })
      .catch(() => {
        if (!cancelled) setTripCheckpoints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, token, canTrack, boyFilter, pathReportDate]);

  useEffect(() => {
    if (tab !== 'travel' || !token || selectedCheckpointId == null || pathViewMode !== 'segment') {
      setSegmentRoute([]);
      setSegmentSmoothed(undefined);
      return;
    }
    let cancelled = false;
    setLoadingSegment(true);
    getCheckpointPath(token, selectedCheckpointId)
      .then((seg) => {
        if (cancelled) return;
        setSegmentRoute(
          (seg.points || [])
            .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
            .map((p) => [p.lat, p.lng] as [number, number]),
        );
        setSegmentSmoothed(seg.is_smoothed);
      })
      .catch(() => {
        if (!cancelled) setSegmentRoute([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSegment(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, token, selectedCheckpointId, pathViewMode]);

  const handleSelectCheckpoint = (id: number | null) => {
    setSelectedCheckpointId(id);
    if (id == null) {
      setPathViewMode('day');
      return;
    }
    const row = tripCheckpoints.find((c) => c.id === id);
    if (row?.path_id) setPathViewMode('segment');
  };

  const selectedCheckpoint = tripCheckpoints.find((c) => c.id === selectedCheckpointId) ?? null;

  const routeSegments: RouteSegmentLine[] = useMemo(() => {
    if (!pathReport?.segments?.length) return [];
    return pathReport.segments
      .filter((s) => s.points?.length > 1)
      .map((s) => ({
        positions: s.points.map((p) => [p.lat, p.lng] as [number, number]),
        color: SEGMENT_COLORS[s.segment_type] ?? '#6366f1',
        weight: s.segment_type === 'idle' ? 4 : 5,
        opacity: 0.85,
      }));
  }, [pathReport]);

  const checkpointSegmentLines: RouteSegmentLine[] = useMemo(() => {
    if (pathViewMode !== 'segment' || segmentRoute.length < 2 || !selectedCheckpoint) return [];
    return [
      {
        positions: segmentRoute,
        color: segmentColorForCheckpoint(selectedCheckpoint.checkpoint_type),
        weight: 6,
        opacity: 0.95,
      },
    ];
  }, [pathViewMode, segmentRoute, selectedCheckpoint]);

  const mapRouteSegments =
    pathViewMode === 'segment' && checkpointSegmentLines.length > 0
      ? checkpointSegmentLines
      : routeSegments;

  const checkpointMapMarkers = useMemo(() => {
    if (boyFilter === 'All') return [];
    return checkpointsToMapMarkers(tripCheckpoints, selectedCheckpointId);
  }, [tripCheckpoints, selectedCheckpointId, boyFilter]);

  const idleMapMarkers = useMemo(() => {
    if (!pathReport?.segments) return [];
    return pathReport.segments
      .filter((s) => s.segment_type === 'idle' && s.duration_secs >= 120 && s.points.length > 0)
      .map((s, idx) => ({
        pos: [s.points[0].lat, s.points[0].lng] as [number, number],
        label: `Idle ${formatDuration(s.duration_secs)}`,
        time: `${new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        status: 'active' as const,
        key: `idle-${idx}`,
      }));
  }, [pathReport]);

  const mapCenter: [number, number] = useMemo(() => {
    const segPts = pathViewMode === 'segment' ? segmentRoute : [];
    if (segPts.length > 0) {
      const last = segPts[segPts.length - 1];
      return [last[0], last[1]];
    }
    const all = pathReport?.segments?.flatMap((s) => s.points) ?? [];
    if (all.length > 0) {
      const lat = all.reduce((a, p) => a + p.lat, 0) / all.length;
      const lng = all.reduce((a, p) => a + p.lng, 0) / all.length;
      return [lat, lng];
    }
    const cp = checkpointMapMarkers;
    if (cp.length > 0) {
      const lat = cp.reduce((a, m) => a + m.pos[0], 0) / cp.length;
      const lng = cp.reduce((a, m) => a + m.pos[1], 0) / cp.length;
      return [lat, lng];
    }
    return DEFAULT_MAP_CENTER;
  }, [pathReport, pathViewMode, segmentRoute, checkpointMapMarkers]);

  return (
    <div className="space-y-6">
      {/* TRAVEL PATH TAB — stored GPS from Redis / delivery_travel_paths */}
      {tab === 'travel' && (
        <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground/70" />
              <SearchableSelect
                value={boyFilter}
                onChange={setBoyFilter}
                className="min-w-[200px]"
                options={[
                  { value: 'All', label: 'Select delivery boy…' },
                  ...deliveryBoys.map((b) => ({ value: String(b.id), label: b.username })),
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-muted-foreground/70" />
              <Input className="w-auto"
                type="date"
                value={pathReportDate}
                onChange={(e) => setPathReportDate(e.target.value)}
                
              />
            </div>
            {pathReport && (
              <span className="text-xs font-medium text-muted-foreground/70">
                Data source: {pathReport.source}
              </span>
            )}
          </div>

          {boyFilter === 'All' && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Select a delivery boy above to view their stored travel path for the chosen day.
              Paths are recorded while on duty (same data as Live Tracking).
            </div>
          )}

          {boyFilter !== 'All' && pathReportLoading && (
            <div className="text-sm text-muted-foreground font-medium p-8 text-center">Loading travel path…</div>
          )}

          {pathReportError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl">{pathReportError}</div>
          )}

          {boyFilter !== 'All' && !pathReportLoading && !pathReport && (
            <div className="bg-muted border border-border text-foreground/70 text-sm p-4 rounded-xl">
              No full-day movement report for this date. Trip checkpoints below may still have per-leg paths.
            </div>
          )}

          {boyFilter !== 'All' && !pathReportLoading && tripCheckpoints.length > 0 && !pathReport && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 overflow-hidden h-[420px]" >
                <MapPreview
                  riders={[]}
                  routeSegments={mapRouteSegments}
                  checkpoints={checkpointMapMarkers}
                  center={mapCenter}
                  zoom={mapRouteSegments.length > 0 || checkpointMapMarkers.length > 0 ? 14 : 12}
                />
              </Card>
              <Card className="p-4">
                <CheckpointPathPanel
                  checkpoints={tripCheckpoints}
                  selectedCheckpointId={selectedCheckpointId}
                  onSelectCheckpoint={handleSelectCheckpoint}
                  loadingPath={loadingSegment}
                  segmentPointCount={segmentRoute.length}
                  segmentSmoothed={segmentSmoothed}
                  viewMode={pathViewMode}
                  onViewModeChange={setPathViewMode}
                />
              </Card>
            </div>
          )}

          {boyFilter !== 'All' && !pathReportLoading && pathReport && (
            <>
              <KpiStrip items={[
                { label: 'Distance', value: `${(pathReport.summary.total_distance_m / 1000).toFixed(1)} km` },
                { label: 'Moving', value: formatDuration(pathReport.summary.moving_time_secs) },
                { label: 'Slow', value: formatDuration(pathReport.summary.slow_time_secs), tone: 'warning' },
                { label: 'Idle', value: formatDuration(pathReport.summary.idle_time_secs), tone: pathReport.summary.idle_time_secs > 0 ? 'danger' : 'default' },
                { label: 'Stops over 2 min', value: String(pathReport.summary.idle_segments_ge_2min) },
              ]} />

              <div className="flex flex-wrap gap-3 text-xs font-medium">
                {Object.entries(SEGMENT_COLORS).map(([k, color]) => (
                  <span key={k} className="flex items-center gap-1.5 text-foreground/70">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    {k}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 overflow-hidden h-[420px]" >
                  <MapPreview
                    riders={[]}
                    routeSegments={mapRouteSegments}
                    checkpoints={[...checkpointMapMarkers, ...(pathViewMode === 'day' ? idleMapMarkers : [])]}
                    center={mapCenter}
                    zoom={mapRouteSegments.length > 0 || checkpointMapMarkers.length > 0 ? 14 : 12}
                  />
                </Card>
                <Card className="p-4" >
                  <CheckpointPathPanel
                    checkpoints={tripCheckpoints}
                    selectedCheckpointId={selectedCheckpointId}
                    onSelectCheckpoint={handleSelectCheckpoint}
                    loadingPath={loadingSegment}
                    segmentPointCount={segmentRoute.length}
                    segmentSmoothed={segmentSmoothed}
                    viewMode={pathViewMode}
                    onViewModeChange={setPathViewMode}
                  />
                </Card>
              </div>

              {pathReport.segments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No GPS path stored for this day. The rider may have been offline or location was not recorded.
                </p>
              )}

              {pathReport.segments.filter((s) => s.segment_type !== 'moving').length > 0 && (
                <Card className="overflow-hidden" >
                  <div className="p-4 border-b border-border flex items-center gap-2">
                    <PauseCircle size={16} className="text-warning" />
                    <h3 className="font-semibold text-foreground">Slow & idle segments</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {['Type', 'Start', 'End', 'Duration', 'Avg speed', 'Distance'].map((h) => (
                          <TableHead key={h} className="uppercase">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pathReport.segments
                        .filter((s) => s.segment_type === 'slow' || s.segment_type === 'idle')
                        .map((s, i) => (
                          <TableRow key={i} className="">
                            <TableCell className="font-semibold capitalize" style={{ color: SEGMENT_COLORS[s.segment_type] }}>
                              {s.segment_type}
                            </TableCell>
                            <TableCell className="text-foreground/70">
                              {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="text-foreground/70">
                              {new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">{formatDuration(s.duration_secs)}</TableCell>
                            <TableCell className="text-foreground/70">
                              {s.avg_speed_mps != null ? `${(s.avg_speed_mps * 3.6).toFixed(1)} km/h` : '—'}
                            </TableCell>
                            <TableCell className="text-foreground/70">{(s.distance_m / 1000).toFixed(2)} km</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}
        </motion.div>
      )}

    </div>
  );
}
