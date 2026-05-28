import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Download, Clock, TrendingUp, Users, AlertCircle, CheckCircle2, Package, BarChart3, Filter, MapPin, PauseCircle } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import MapPreview, { type RouteSegmentLine } from '../components/MapPreview';
import { motion } from 'motion/react';
import { appApi } from '../lib/appApi';
import { useAuth } from '../context/AuthContext';
import {
  getDeliveryPathReport,
  normalizeFetchError,
  type DeliveryPathReportResponse,
} from '../lib/api';
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

  useEffect(() => {
    Promise.all([appApi.getUsers(), appApi.getStats(), appApi.getInvoices()])
      .then(([users, s, invoices]) => {
      const boys = users.filter((u: any) => u.role === 'delivery_boy');
      setDeliveryBoys(boys);
      setGlobalStats(prev => ({ ...prev, totalBoys: boys.length }));
      setGlobalStats(prev => ({ ...prev, totalDelivered: s.delivered.count }));

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
        if (inv.status === 'delivered') row.deliveries += 1;
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
      const delivered = invoices.filter((x: any) => x.status === 'delivered').length;
      const pending = invoices.filter((x: any) => x.status === 'pending').length;
      const cancelled = invoices.filter((x: any) => x.status === 'cancelled').length;
      setPieData([
        { name: 'Delivered', value: Math.round((delivered / total) * 100), color: '#10b981' },
        { name: 'Pending', value: Math.round((pending / total) * 100), color: '#f59e0b' },
        { name: 'Cancelled', value: Math.round((cancelled / total) * 100), color: '#ef4444' },
      ]);

      const byBoy = boys.map((boy: any) => {
        const mine = invoices.filter((i: any) => i.assigned_to === boy.id);
        const completed = mine.filter((i: any) => i.status === 'delivered').length;
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
    const all = pathReport?.segments?.flatMap((s) => s.points) ?? [];
    if (all.length === 0) return DEFAULT_MAP_CENTER;
    const lat = all.reduce((a, p) => a + p.lat, 0) / all.length;
    const lng = all.reduce((a, p) => a + p.lng, 0) / all.length;
    return [lat, lng];
  }, [pathReport]);

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
                  { value: 'delivered', label: 'Delivered' },
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
              { label: 'Orders Delivered', value: globalStats.totalDelivered.toString(), icon: CheckCircle2, color: 'emerald', delta: 'All time' },
              { label: 'Boy Orders Delivered', value: boyFilter === 'All' ? '-' : boyStats.delivered.toString(), icon: TrendingUp, color: 'emerald', delta: boyFilter === 'All' ? 'Select a boy' : 'All time' },
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
                Delivery Volume vs Avg. Time
              </h3>
              <ReportChartBox height={260}>
                <BarChart data={deliveryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Deliveries" />
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
            <h3 className="font-bold text-zinc-900 mb-6">Delivery Status Distribution</h3>
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
          <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-zinc-400" />
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
              <Calendar size={14} className="text-zinc-400" />
              <input
                type="date"
                value={pathReportDate}
                onChange={(e) => setPathReportDate(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 outline-none focus:border-emerald-500"
              />
            </div>
            {pathReport && (
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Data source: {pathReport.source}
              </span>
            )}
          </div>

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

              <div className="bg-white rounded-3xl border border-zinc-100 shadow-inner overflow-hidden h-[420px]">
                <MapPreview
                  riders={[]}
                  routeSegments={routeSegments}
                  checkpoints={idleMapMarkers}
                  center={mapCenter}
                  zoom={routeSegments.length > 0 ? 14 : 12}
                />
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
    </div>
  );
}
