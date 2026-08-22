import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Clock, CheckCircle2, XCircle, Truck,
  ArrowUpRight, Users,
  RotateCcw, MapPin, X,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackingSocket } from '../hooks/useSocket';
import { appApi } from '../lib/appApi';
import { getInvoices, getOnDutyDeliveries, normalizeFetchError, type OnDutyDeliveryRow } from '../lib/api';
import {
  DEFAULT_MAP_CENTER,
  averageCenterForMarkers,
  displayRidersToMapPreviewMarkers,
  mergeOnDutySnapshotsWithLive,
} from '../lib/liveFleetMap';
import type { LocationUpdateMessage } from '../hooks/useSocket';
import SearchableSelect from '../components/SearchableSelect';
import MapPreview from '../components/MapPreview';

export default function Dashboard() {
  const { user, token } = useAuth();
  const canLiveMap = user?.role === 'admin' || user?.role === 'manager';

  const [dutySnapshots, setDutySnapshots] = useState<OnDutyDeliveryRow[]>([]);
  const [liveLocations, setLiveLocations] = useState<Record<number, LocationUpdateMessage>>({});
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [selectedBoyId, setSelectedBoyId] = useState<string>('all');
  const [customBoyName, setCustomBoyName] = useState<string>('');
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [detailCard, setDetailCard] = useState<any>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  const { subscribe, connected } = useTrackingSocket(Boolean(canLiveMap && token));

  const loadOnDutyForMap = useCallback(async () => {
    if (!token || !canLiveMap) return;
    try {
      const rows = await getOnDutyDeliveries(token);
      setDutySnapshots(rows);
      setMapLoadError(null);
    } catch (e) {
      setMapLoadError(normalizeFetchError(e, 'Live map'));
    }
  }, [token, canLiveMap]);

  useEffect(() => {
    loadOnDutyForMap();
  }, [loadOnDutyForMap]);

  useEffect(() => {
    if (!canLiveMap || !token) return;
    const pollMs = connected ? 45_000 : 5_000;
    const id = window.setInterval(loadOnDutyForMap, pollMs);
    return () => window.clearInterval(id);
  }, [canLiveMap, token, loadOnDutyForMap, connected]);

  useEffect(() => {
    if (!canLiveMap) return;
    return subscribe((data) => {
      setLiveLocations((prev) => ({ ...prev, [data.user_id]: data }));
    });
  }, [canLiveMap, subscribe]);

  useEffect(() => {
    appApi.getUsers().then(users => {
      setDeliveryBoys(users.filter((u: any) => u.role === 'delivery_boy'));
    });
    appApi.getStats().then(setStats);
    (async () => {
      try {
        const r = await getInvoices(token!, {
          page: 1,
          page_size: 5,
          sort_by: 'delivered_at',
          sort_order: 'desc',
        });
        setRecentDeliveries((r.items as any[]).filter(
          (i: any) => i.status === 'completed' || i.status === 'delivered',
        ));
      } catch {}
    })();
  }, [user]);

  const mergedDuty = mergeOnDutySnapshotsWithLive(dutySnapshots, liveLocations);
  const mapRiders = displayRidersToMapPreviewMarkers(mergedDuty);
  const mapCenter = averageCenterForMarkers(mapRiders, DEFAULT_MAP_CENTER);

  const allCards = [
    { key: 'total_boys', label: 'Total Boys', value: stats?.total_boys?.count || 0, icon: Users, color: 'blue', roles: ['admin', 'manager'], hideIfBoySelected: true },
    { key: 'pending', label: 'Pending', value: stats?.pending?.count || 0, icon: Clock, color: 'amber', roles: ['admin', 'manager'], status: 'pending' },
    { key: 'assigned', label: 'Assigned', value: stats?.assigned?.count || 0, icon: Truck, color: 'indigo', roles: ['admin', 'manager'], status: 'assigned' },
    { key: 'completed', label: 'Completed', value: stats?.completed?.count || 0, icon: CheckCircle2, color: 'emerald', roles: ['admin', 'manager'], status: 'completed' },
    { key: 'cancelled', label: 'Cancelled', value: stats?.cancelled?.count || 0, icon: XCircle, color: 'red', roles: ['admin', 'manager'], status: 'cancelled' },
    { key: 'return', label: 'Return', value: stats?.return?.count || 0, icon: RotateCcw, color: 'purple', roles: ['admin', 'manager'], status: 'return' },
  ];

  const cards = allCards.filter(c => 
    c.roles.includes(user?.role || '') && 
    !(c.hideIfBoySelected && selectedBoyId !== 'all')
  );

  const openCard = useCallback((card: any) => {
    setDetailCard(card);
    setDetailItems([]);
    setDetailError(null);
    setSortKey('name');
    setSortOrder('asc');
    if (card.key === 'total_boys') {
      setDetailLoading(true);
      if (token) {
        appApi.getUsers()
          .then((users: any[]) => setDetailItems(users.filter((u: any) => u.role === 'delivery_boy')))
          .catch(() => setDetailItems(deliveryBoys))
          .finally(() => setDetailLoading(false));
      } else {
        setDetailItems(deliveryBoys);
        setDetailLoading(false);
      }
      return;
    }
    if (!token) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    (async () => {
      try {
        const pageSize = 200;
        const all: any[] = [];
        for (let page = 1; page <= 10; page++) {
          const r = await getInvoices(token, { status: card.status, page, page_size: pageSize });
          all.push(...(r.items || []));
          if ((r.items || []).length < pageSize || r.total != null && all.length >= r.total) break;
        }
        setDetailItems(all);
      } catch (e) {
        setDetailError(normalizeFetchError(e, card.label));
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [token, deliveryBoys]);

  const BOY_SORT_FIELDS = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
  ];

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortOrder('asc'); }
  };

  const sortedItems = useMemo(() => {
    if (detailCard?.key !== 'total_boys') return detailItems;
    const dir = sortOrder === 'asc' ? 1 : -1;
    const str = (v: any) => (v ?? '').toString().toLowerCase();
    return [...detailItems].sort((a, b) => {
      let va = ''; let vb = '';
      if (sortKey === 'email') { va = str(a.email); vb = str(b.email); }
      else if (sortKey === 'phone') { va = str(a.phone); vb = str(b.phone); }
      else { va = str(a.username); vb = str(b.username); }
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }, [detailItems, detailCard, sortKey, sortOrder]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Search delivery boy details</label>
                <div className="relative group">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                  <SearchableSelect
                    value={selectedBoyId}
                    onChange={setSelectedBoyId}
                    className="w-[180px]"
                    options={[
                      { value: 'all', label: 'All' },
                      ...deliveryBoys.map((b) => ({ value: String(b.id), label: b.username })),
                      { value: 'custom', label: 'Custom...' },
                    ]}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <ArrowUpRight size={12} className="rotate-90" />
                  </div>
                </div>
              </div>
              
              {selectedBoyId === 'custom' && (
                <motion.input 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  type="text" 
                  placeholder="Enter Name..." 
                  value={customBoyName}
                  onChange={e => setCustomBoyName(e.target.value)}
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm w-32"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 shadow-sm">
            <Clock size={16} className="text-zinc-400" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>



      <div className={`grid grid-cols-2 ${cards.length >= 6 ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-3 lg:grid-cols-5'} gap-4`}>
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => openCard(card)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(card); } }}
            className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg bg-${card.color}-50 text-${card.color}-600 group-hover:scale-110 transition-transform`}>
                <card.icon size={16} />
              </div>
              <ArrowUpRight size={14} className="text-zinc-300" />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{card.label}</p>
            <div className="flex items-end justify-between mt-1">
              <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-6 ${canLiveMap ? 'lg:grid-cols-3' : ''}`}>
        <div className={`bg-white rounded-xl border border-zinc-100 shadow-sm p-4 ${canLiveMap ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900">Recent Activity</h3>
            <button className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {recentDeliveries.length > 0 ? (
              recentDeliveries.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200 shadow-sm">
                      <Truck size={14} className="text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{inv.invoice_number}</p>
                      <p className="text-[10px] text-zinc-500">{inv.hospital_name} • {new Date(inv.delivered_at || inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-900">₹{inv.amount.toLocaleString()}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        inv.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                      {inv.status === 'completed' ? 'Completed' : 'Return'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-400 text-xs silver-gradient rounded-2xl">
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </div>

        {canLiveMap && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-zinc-900">Live fleet map</h3>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">
              {mapRiders.length}/{mergedDuty.length} on map
            </span>
          </div>
          {mapLoadError && (
            <p className="text-xs text-red-600 mb-2">{mapLoadError}</p>
          )}
          <div className="h-64 md:h-72 lg:aspect-square lg:h-auto bg-white rounded-lg relative overflow-hidden border border-zinc-100 shadow-inner">
            <MapPreview
              riders={mapRiders}
              route={[]}
              checkpoints={[]}
              center={mapCenter}
              zoom={mapRiders.length === 1 ? 15 : 13}
            />
            {mergedDuty.length === 0 && !mapLoadError && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-white/95 to-transparent pt-8 pb-2 text-center">
                <p className="text-[10px] font-bold text-zinc-400">No delivery staff on duty</p>
              </div>
            )}
            {mergedDuty.length > 0 && mapRiders.length === 0 && !mapLoadError && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-white/95 to-transparent pt-8 pb-2 text-center">
                <p className="text-[10px] font-bold text-zinc-400">On duty — waiting for GPS</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Users size={12} className="text-zinc-400" /> On duty
              </span>
              <span className="font-bold text-zinc-900">{mergedDuty.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-600">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin size={12} className="text-zinc-400" /> With live position
              </span>
              <span className="font-bold text-zinc-900">{mapRiders.length}</span>
            </div>
          </div>
        </div>
        )}      </div>

      <AnimatePresence>
        {detailCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDetailCard(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${detailCard.color}-50 text-${detailCard.color}-600`}>
                    <detailCard.icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{detailCard.label}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {detailCard.value} total
                    </p>
                  </div>
                </div>
                <button onClick={() => setDetailCard(null)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {!detailLoading && !detailError && detailItems.length > 0 && detailCard.key === 'total_boys' && (
                  <div className="flex items-center gap-1 flex-wrap px-4 pt-3 pb-2 border-b border-zinc-100 shrink-0">
                    {BOY_SORT_FIELDS.map((f) => {
                      const active = sortKey === f.key;
                      return (
                        <button
                          key={f.key}
                          onClick={() => toggleSort(f.key)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${active ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
                        >
                          {f.label}
                          {active ? (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="overflow-y-auto p-3 flex-1">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-zinc-400">Loading…</div>
                ) : detailError ? (
                  <div className="text-xs text-red-600 p-4">{detailError}</div>
                ) : detailItems.length === 0 ? (
                  <div className="text-center text-zinc-400 text-xs py-16">No {detailCard.label} records found.</div>
                ) : detailCard.key === 'total_boys' ? (
                  <div className="space-y-2">
                    {sortedItems.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200 shadow-sm shrink-0">
                            <Users size={14} className="text-zinc-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 truncate">{b.username}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{b.email}{b.phone ? ` • ${b.phone}` : ''}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Delivery Boy</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailItems.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200 shadow-sm shrink-0">
                            <Truck size={14} className="text-zinc-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 truncate">{inv.invoice_number}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{inv.hospital_name}{inv.assignee_name ? ` • ${inv.assignee_name}` : ''}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-zinc-900">₹{Number(inv.amount || 0).toLocaleString()}</p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-100 text-zinc-600 capitalize">{inv.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
