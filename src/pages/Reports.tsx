import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Download, Clock, TrendingUp, Users, AlertCircle, CheckCircle2, Package, BarChart3, Filter, MapPin, PauseCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import MapPreview, { type RouteSegmentLine } from '../components/MapPreview';
import CheckpointPathPanel from '../components/CheckpointPathPanel';
import { motion } from 'motion/react';
import { appApi } from '../lib/appApi';
import { useAuth } from '../context/AuthContext';
import {
  getCheckpointPath,
  getDeliveryCheckpoints,
  getDeliveryPathReport,
  normalizeFetchError,
  type DeliveryCheckpointRow,
  type DeliveryPathReportResponse,
} from '../lib/api';
import {
  checkpointsToMapMarkers,
  segmentColorForCheckpoint,
} from '../lib/checkpointPaths';
import { DEFAULT_MAP_CENTER } from '../lib/liveFleetMap';

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

type ReportTab = 'delivery' | 'availability' | 'travel' | 'invoices';

const REPORT_TABS: { id: ReportTab; label: string; icon: typeof Package }[] = [
  { id: 'delivery', label: 'Delivery Duration', icon: Package },
  { id: 'availability', label: 'Availability', icon: BarChart3 },
  { id: 'travel', label: 'Travel Path', icon: MapPin },
  { id: 'invoices', label: 'Invoices', icon: FileText },
];

function parseReportTab(raw: string | null): ReportTab {
  if (raw === 'availability' || raw === 'travel' || raw === 'invoices') return raw;
  return 'delivery';
}

export default function Reports() {
  const { token, user } = useAuth();
  const canTrack = user?.role === 'admin' || user?.role === 'manager';

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseReportTab(searchParams.get('tab'));

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
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState('all');
  const [boyFilter, setBoyFilter] = useState('All');

  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalBoys: 0, totalDelivered: 0 });
  const [boyStats, setBoyStats] = useState({ delivered: 0 });
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  const [pathReport, setPathReport] = useState<DeliveryPathReportResponse | null>(null);
  const [pathReportLoading, setPathReportLoading] = useState(false);
  const [pathReportError, setPathReportError] = useState<string | null>(null);
  const [tripCheckpoints, setTripCheckpoints] = useState<DeliveryCheckpointRow[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<number | null>(null);
  const [pathViewMode, setPathViewMode] = useState<'day' | 'segment'>('day');
  const [segmentRoute, setSegmentRoute] = useState<[number, number][]>([]);
  const [segmentSmoothed, setSegmentSmoothed] = useState<boolean | undefined>();
  const [loadingSegment, setLoadingSegment] = useState(false);

  const [invInvoices, setInvInvoices] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const [showAllType, setShowAllType] = useState(false);
  const [showAllStatus, setShowAllStatus] = useState(false);

  useEffect(() => {
    Promise.all([appApi.getUsers(), appApi.getStats(), appApi.getInvoices()])
      .then(([users, s, invoices]) => {
      const boys = users.filter((u: any) => u.role === 'delivery_boy');
      setDeliveryBoys(boys);
      const totalCompleted = invoices.filter((i: any) => i.status === 'completed').length;
      const totalReturn = invoices.filter((i: any) => i.status === 'delivered').length;
      setGlobalStats(prev => ({ ...prev, totalBoys: boys.length, totalDelivered: totalCompleted }));

      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const byDay = new Map<string, { deliveries: number; assigned: number; pending: number }>();
      weekdayNames.forEach((day) => byDay.set(day, { deliveries: 0, assigned: 0, pending: 0 }));

      invoices.forEach((inv: any) => {
        const dateStr = inv.delivered_at || inv.accepted_at || inv.created_at;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return;
        const day = weekdayNames[d.getDay()];
        const row = byDay.get(day);
        if (!row) return;
        if (inv.status === 'completed') row.deliveries += 1;
        if (inv.status === 'assigned') row.assigned += 1;
        if (inv.status === 'pending') row.pending += 1;
      });

      setDeliveryData(
        weekdayNames.map((day) => {
          const row = byDay.get(day)!;
          return {
            name: day,
            deliveries: row.deliveries,
            time: row.assigned,
            waiting: row.pending,
          };
        })
      );

      const total = Math.max(1, invoices.length);
      const completed = invoices.filter((x: any) => x.status === 'completed').length;
      const returned = invoices.filter((x: any) => x.status === 'delivered').length;
      const pending = invoices.filter((x: any) => x.status === 'pending').length;
      const assigned = invoices.filter((x: any) => x.status === 'assigned').length;
      const cancelled = invoices.filter((x: any) => x.status === 'cancelled').length;
      setPieData([
        { name: 'Completed', value: Math.round((completed / total) * 100), color: '#10b981' },
        { name: 'Delivered', value: Math.round((returned / total) * 100), color: '#a855f7' },
        { name: 'Assigned', value: Math.round((assigned / total) * 100), color: '#6366f1' },
        { name: 'Pending', value: Math.round((pending / total) * 100), color: '#f59e0b' },
        { name: 'Cancelled', value: Math.round((cancelled / total) * 100), color: '#ef4444' },
      ]);

      const byBoy = boys.map((boy: any) => {
        const mine = invoices.filter((i: any) => i.assigned_to === boy.id);
        const completed = mine.filter((i: any) => i.status === 'completed').length;
        const inProgress = mine.filter((i: any) => i.status === 'assigned').length;
        const queued = mine.filter((i: any) => i.status === 'pending').length;
        return {
          name: boy.username,
          available: mine.length,
          delivery: completed + inProgress,
          waiting: queued,
        };
      });
      setAvailabilityData(byBoy);
    })
      .catch(() => {
        setDeliveryData([]);
        setAvailabilityData([]);
        setPieData([]);
      });
  }, []);

  useEffect(() => {
    if (boyFilter !== 'All') {
      const boyId = Number(boyFilter);
      appApi.getDeliveryBoyStats(boyId).then((s) => {
        setBoyStats({ delivered: s.total_delivered });
      });
    } else {
      setBoyStats({ delivered: 0 });
    }
  }, [boyFilter, dateRange]);

  useEffect(() => {
    if (tab !== 'travel' || !token || !canTrack || boyFilter === 'All') {
      setPathReport(null);
      setPathReportError(null);
      return;
    }
    const userId = Number(boyFilter);
    if (!Number.isFinite(userId)) return;
    const date = startDate || new Date().toISOString().slice(0, 10);
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
  }, [tab, token, canTrack, boyFilter, startDate]);

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
    const date = startDate || new Date().toISOString().slice(0, 10);
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
  }, [tab, token, canTrack, boyFilter, startDate]);

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

  useEffect(() => {
    if (tab !== 'invoices') return;
    let cancelled = false;
    setInvLoading(true);
    appApi.getInvoices({
      date_from: startDate || undefined,
      date_to: endDate || undefined,
      assigned_to: boyFilter !== 'All' ? Number(boyFilter) : undefined,
    })
      .then((data) => {
        if (!cancelled) setInvInvoices(data);
      })
      .catch(() => {
        if (!cancelled) setInvInvoices([]);
      })
      .finally(() => {
        if (!cancelled) setInvLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab, startDate, endDate, boyFilter]);

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

  const invAggregation = useMemo(() => {
    const total = invInvoices.length;
    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    invInvoices.forEach((inv: any) => {
      const t = inv.invoice_type || 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
      const s = inv.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const typeLabels: Record<string, string> = {
      challan: 'Challan',
      price_difference: 'Price Diff',
      sale_bill: 'Sale Bill',
      sale_return_credit_note: 'Sale Return',
      unknown: 'Other',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      assigned: 'Assigned',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled',
      return: 'Return',
      unknown: 'Other',
    };

    const typeEntries = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, label: typeLabels[type] || type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const statusEntries = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, label: statusLabels[status] || status, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    return { total, typeEntries, statusEntries };
  }, [invInvoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Group */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <Calendar size={14} className="text-zinc-400" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Period</span>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-zinc-100 px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-600 outline-none focus:border-emerald-500"
              />
              <span className="text-zinc-300">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-zinc-100 px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-600 outline-none focus:border-emerald-500"
              />
              <SearchableSelect
                value={dateRange}
                onChange={setDateRange}
                className="min-w-[140px]"
                options={[
                  { value: 'custom', label: 'Custom' },
                  { value: 'today', label: 'Today' },
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' },
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
              <Filter size={14} className="text-zinc-400" />
              <SearchableSelect
                value={statusFilter}
                onChange={setStatusFilter}
                className="min-w-[130px]"
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>

            {/* Boy Filter */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
              <Users size={14} className="text-zinc-400" />
              <SearchableSelect
                value={boyFilter}
                onChange={setBoyFilter}
                className="min-w-[170px]"
                options={[
                  { value: 'All', label: 'All Delivery Boys' },
                  ...deliveryBoys.map((b) => ({ value: String(b.id), label: b.username })),
                ]}
              />
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-md active:scale-95 shrink-0">
            <Download size={14} /> EXPORT DATA
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit flex-wrap">
        {REPORT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setReportTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <div className="flex items-center gap-1.5">
              <t.icon size={14} />
              {t.label}
            </div>
          </button>
        ))}
      </div>

      {/* DELIVERY DURATION TAB */}
      {tab === 'delivery' && (
        <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Delivery Boys', value: globalStats.totalBoys.toString(), icon: Users, color: 'blue', delta: 'Active' },
              { label: 'Completed', value: globalStats.totalDelivered.toString(), icon: CheckCircle2, color: 'emerald', delta: 'All time' },
              { label: 'Boy Completed', value: boyFilter === 'All' ? '-' : boyStats.delivered.toString(), icon: TrendingUp, color: 'emerald', delta: boyFilter === 'All' ? 'Select a boy' : 'All time' },
            ].map(card => (
              <div key={card.label} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center`}>
                    <card.icon size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-tight">{card.label}</p>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{card.value}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{card.delta}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-6">
                Completion Volume vs Avg. Time
              </h3>
              <ReportChartBox height={260}>
                <BarChart data={deliveryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Completed" />
                  <Bar dataKey="time" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} name="Avg Time (min)" />
                </BarChart>
              </ReportChartBox>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-zinc-100 shadow-sm">
                <h3 className="font-bold text-zinc-900 mb-6">Pending Tasks per Day</h3>
              <ReportChartBox height={260}>
                <LineChart data={deliveryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <Tooltip {...CHART_STYLE} />
                  <Line type="monotone" dataKey="waiting" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} name="Pending" />
                </LineChart>
              </ReportChartBox>
            </div>
          </div>

          {/* Delivery status pie */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-6">Order Status Distribution</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ReportChartBox height={192} width={192}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ReportChartBox>
              <div className="space-y-3">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-zinc-600">{item.name}</span>
                    <span className="text-sm font-bold text-zinc-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TRAVEL PATH TAB — stored GPS from Redis / delivery_travel_paths */}
      {tab === 'travel' && (
        <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
          {boyFilter === 'All' && (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 text-sm font-medium p-4 rounded-2xl">
              Select a delivery boy above to view their stored travel path for the chosen day.
              Paths are recorded while on duty (same data as Live Tracking).
            </div>
          )}

          {boyFilter !== 'All' && pathReportLoading && (
            <div className="text-sm text-zinc-500 font-medium p-8 text-center">Loading travel path…</div>
          )}

          {pathReportError && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-4 rounded-2xl">{pathReportError}</div>
          )}

          {boyFilter !== 'All' && !pathReportLoading && !pathReport && (
            <div className="bg-zinc-50 border border-zinc-100 text-zinc-600 text-sm p-4 rounded-2xl">
              No full-day movement report for this date. Trip checkpoints below may still have per-leg paths.
            </div>
          )}

          {boyFilter !== 'All' && !pathReportLoading && tripCheckpoints.length > 0 && !pathReport && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-100 shadow-inner overflow-hidden h-[420px]">
                <MapPreview
                  riders={[]}
                  routeSegments={mapRouteSegments}
                  checkpoints={checkpointMapMarkers}
                  center={mapCenter}
                  zoom={mapRouteSegments.length > 0 || checkpointMapMarkers.length > 0 ? 14 : 12}
                />
              </div>
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
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
              </div>
            </div>
          )}

          {boyFilter !== 'All' && !pathReportLoading && pathReport && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Distance',
                    value: `${(pathReport.summary.total_distance_m / 1000).toFixed(1)} km`,
                    valueClass: 'text-zinc-900',
                  },
                  {
                    label: 'Moving',
                    value: formatDuration(pathReport.summary.moving_time_secs),
                    valueClass: 'text-emerald-600',
                  },
                  {
                    label: 'Slow',
                    value: formatDuration(pathReport.summary.slow_time_secs),
                    valueClass: 'text-amber-600',
                  },
                  {
                    label: 'Idle',
                    value: formatDuration(pathReport.summary.idle_time_secs),
                    valueClass: 'text-red-600',
                  },
                  {
                    label: 'Stops 2m+',
                    value: String(pathReport.summary.idle_segments_ge_2min),
                    valueClass: 'text-red-600',
                  },
                ].map((c) => (
                  <div key={c.label} className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">{c.label}</p>
                    <p className={`text-lg font-black mt-1 ${c.valueClass}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider">
                {Object.entries(SEGMENT_COLORS).map(([k, color]) => (
                  <span key={k} className="flex items-center gap-1.5 text-zinc-600">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    {k}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-100 shadow-inner overflow-hidden h-[420px]">
                  <MapPreview
                    riders={[]}
                    routeSegments={mapRouteSegments}
                    checkpoints={[...checkpointMapMarkers, ...(pathViewMode === 'day' ? idleMapMarkers : [])]}
                    center={mapCenter}
                    zoom={mapRouteSegments.length > 0 || checkpointMapMarkers.length > 0 ? 14 : 12}
                  />
                </div>
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
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
                </div>
              </div>

              {pathReport.segments.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No GPS path stored for this day. The rider may have been offline or location was not recorded.
                </p>
              )}

              {pathReport.segments.filter((s) => s.segment_type !== 'moving').length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
                    <PauseCircle size={16} className="text-amber-500" />
                    <h3 className="font-bold text-zinc-900">Slow & idle segments</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                      <tr>
                        {['Type', 'Start', 'End', 'Duration', 'Avg speed', 'Distance'].map((h) => (
                          <th key={h} className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {pathReport.segments
                        .filter((s) => s.segment_type === 'slow' || s.segment_type === 'idle')
                        .map((s, i) => (
                          <tr key={i} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-2 text-xs font-bold capitalize" style={{ color: SEGMENT_COLORS[s.segment_type] }}>
                              {s.segment_type}
                            </td>
                            <td className="px-4 py-2 text-xs text-zinc-600">
                              {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-2 text-xs text-zinc-600">
                              {new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-2 text-xs font-medium text-zinc-800">{formatDuration(s.duration_secs)}</td>
                            <td className="px-4 py-2 text-xs text-zinc-600">
                              {s.avg_speed_mps != null ? `${(s.avg_speed_mps * 3.6).toFixed(1)} km/h` : '—'}
                            </td>
                            <td className="px-4 py-2 text-xs text-zinc-600">{(s.distance_m / 1000).toFixed(2)} km</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* AVAILABILITY TAB */}
      {tab === 'availability' && (
        <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
              {
                label: 'Total Assigned',
                value: `${availabilityData.reduce((s, r) => s + (r.available || 0), 0)}`,
                icon: Clock,
                color: 'blue',
                sub: 'Tasks across riders',
              },
              {
                label: 'In Progress/Done',
                value: `${availabilityData.reduce((s, r) => s + (r.delivery || 0), 0)}`,
                icon: TrendingUp,
                color: 'emerald',
                sub: 'Assigned + delivered',
              },
              {
                label: 'Pending',
                value: `${availabilityData.reduce((s, r) => s + (r.waiting || 0), 0)}`,
                icon: AlertCircle,
                color: 'amber',
                sub: 'Pending tasks',
              },
            ].map(card => (
              <div key={card.label} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center`}>
                    <card.icon size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{card.label}</p>
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{card.value}</h3>
                <p className="text-[10px] text-zinc-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Stacked bar — availability breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-6">Task Breakdown per Rider (counts)</h3>
            <ReportChartBox height={300}>
              <BarChart data={availabilityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={48} />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="available" stackId="a" fill="#6366f1" name="Assigned" />
                <Bar dataKey="delivery" stackId="a" fill="#10b981" name="In Progress/Done" />
                <Bar dataKey="waiting" stackId="a" fill="#f59e0b" name="Pending" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ReportChartBox>
            <div className="flex flex-wrap gap-4 mt-4">
              {[['Assigned', '#6366f1'], ['In Progress/Done', '#10b981'], ['Pending', '#f59e0b']].map(([l, c]) => (
                <div key={l} className="flex items-center gap-2 text-xs text-zinc-600">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Per-rider table */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Rider Summary</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  {['Rider', 'Assigned', 'In Progress/Done', 'Pending', 'Efficiency'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {availabilityData.map(r => (
                  <tr key={r.name} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-sm font-bold text-zinc-900">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{r.available}</td>
                    <td className="px-4 py-3 text-xs text-emerald-600 font-medium">{r.delivery}</td>
                    <td className="px-4 py-3 text-xs text-amber-600 font-medium">{r.waiting}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-zinc-900">{Math.round(r.delivery / r.available * 100)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* INVOICES TAB */}
      {tab === 'invoices' && (
        <motion.div initial={false} animate={{ opacity: 1 }} className="space-y-6">
          {invLoading && (
            <div className="text-sm text-zinc-500 font-medium p-8 text-center">Loading invoices…</div>
          )}

          {!invLoading && invInvoices.length === 0 && (
            <div className="bg-zinc-50 border border-zinc-100 text-zinc-600 text-sm p-4 rounded-2xl">
              No invoices found for the selected filters.
            </div>
          )}

          {!invLoading && invInvoices.length > 0 && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Invoices</p>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{invAggregation.total}</h3>
                  <p className="text-[10px] text-zinc-400 mt-1">In selected period</p>
                </div>
                {invAggregation.typeEntries.slice(0, 3).map((entry: any) => (
                  <div key={entry.type} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <FileText size={16} />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{entry.label}</p>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{entry.count}</h3>
                    <p className="text-[10px] text-zinc-400 mt-1">{entry.pct}% of total</p>
                  </div>
                ))}
              </div>

              {/* Type breakdown table */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
                  <FileText size={16} className="text-zinc-500" />
                  <h3 className="font-bold text-zinc-900">Invoice Type Breakdown</h3>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      {['Type', 'Count', '% of Total', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {invAggregation.typeEntries.map((entry: any) => {
                      const isExpanded = expandedType === entry.type;
                      const typeInvoices = invInvoices.filter((i: any) => (i.invoice_type || 'unknown') === entry.type);
                      const displayInvoices = showAllType ? typeInvoices : typeInvoices.slice(0, 20);
                      return (
                        <>
                          <tr
                            key={entry.type}
                            onClick={() => {
                              setExpandedType(isExpanded ? null : entry.type);
                              setShowAllType(false);
                            }}
                            className="hover:bg-zinc-50/50 cursor-pointer"
                          >
                            <td className="px-4 py-3 text-sm font-bold text-zinc-900 flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              {entry.label}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-600">{entry.count}</td>
                            <td className="px-4 py-3 text-xs font-medium text-zinc-800">{entry.pct}%</td>
                            <td className="px-4 py-3 text-[10px] text-zinc-400">{typeInvoices.length} invoices</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${entry.type}-expanded`}>
                              <td colSpan={4} className="px-4 pb-4">
                                <div className="bg-zinc-50 rounded-xl p-3">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        <th className="px-3 py-2">Invoice #</th>
                                        <th className="px-3 py-2">Hospital</th>
                                        <th className="px-3 py-2">Amount</th>
                                        <th className="px-3 py-2">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200/50">
                                      {displayInvoices.map((inv: any) => (
                                        <tr key={inv.id} className="text-xs text-zinc-700">
                                          <td className="px-3 py-2 font-medium">{inv.invoice_number}</td>
                                          <td className="px-3 py-2">{inv.hospital_name}</td>
                                          <td className="px-3 py-2">₹{Number(inv.amount).toLocaleString()}</td>
                                          <td className="px-3 py-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                              inv.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                              inv.status === 'delivered' ? 'bg-purple-50 text-purple-700' :
                                              inv.status === 'assigned' ? 'bg-indigo-50 text-indigo-700' :
                                              inv.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                              inv.status === 'return' ? 'bg-orange-50 text-orange-700' :
                                              'bg-amber-50 text-amber-700'
                                            }`}>
                                              {inv.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {typeInvoices.length > 20 && !showAllType && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setShowAllType(true); }}
                                      className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                                    >
                                      Show All ({typeInvoices.length} invoices)
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Status breakdown table */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
                  <BarChart3 size={16} className="text-zinc-500" />
                  <h3 className="font-bold text-zinc-900">Status Breakdown</h3>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      {['Status', 'Count', '% of Total', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {invAggregation.statusEntries.map((entry: any) => {
                      const isExpanded = expandedStatus === entry.status;
                      const statusInvoices = invInvoices.filter((i: any) => (i.status || 'unknown') === entry.status);
                      const displayInvoices = showAllStatus ? statusInvoices : statusInvoices.slice(0, 20);
                      return (
                        <>
                          <tr
                            key={entry.status}
                            onClick={() => {
                              setExpandedStatus(isExpanded ? null : entry.status);
                              setShowAllStatus(false);
                            }}
                            className="hover:bg-zinc-50/50 cursor-pointer"
                          >
                            <td className="px-4 py-3 text-sm font-bold text-zinc-900 flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                entry.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                entry.status === 'delivered' ? 'bg-purple-50 text-purple-700' :
                                entry.status === 'assigned' ? 'bg-indigo-50 text-indigo-700' :
                                entry.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                entry.status === 'return' ? 'bg-orange-50 text-orange-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {entry.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-600">{entry.count}</td>
                            <td className="px-4 py-3 text-xs font-medium text-zinc-800">{entry.pct}%</td>
                            <td className="px-4 py-3 text-[10px] text-zinc-400">{statusInvoices.length} invoices</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${entry.status}-expanded`}>
                              <td colSpan={4} className="px-4 pb-4">
                                <div className="bg-zinc-50 rounded-xl p-3">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        <th className="px-3 py-2">Invoice #</th>
                                        <th className="px-3 py-2">Hospital</th>
                                        <th className="px-3 py-2">Amount</th>
                                        <th className="px-3 py-2">Type</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200/50">
                                      {displayInvoices.map((inv: any) => (
                                        <tr key={inv.id} className="text-xs text-zinc-700">
                                          <td className="px-3 py-2 font-medium">{inv.invoice_number}</td>
                                          <td className="px-3 py-2">{inv.hospital_name}</td>
                                          <td className="px-3 py-2">₹{Number(inv.amount).toLocaleString()}</td>
                                          <td className="px-3 py-2">{inv.invoice_type || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {statusInvoices.length > 20 && !showAllStatus && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setShowAllStatus(true); }}
                                      className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                                    >
                                      Show All ({statusInvoices.length} invoices)
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
