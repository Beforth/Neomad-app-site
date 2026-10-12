import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Clock, CheckCircle2, XCircle, Truck,
  ArrowUpRight, Users,
  RotateCcw, MapPin,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { motion } from 'motion/react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Segmented } from '@/components/ui/segmented';

/** Icon-chip colours for the stat cards (static strings so Tailwind generates them). */
const TONE: Record<string, string> = {
  blue: 'bg-info/10 text-info',
  amber: 'bg-warning/10 text-warning',
  indigo: 'bg-primary/10 text-primary',
  emerald: 'bg-success/10 text-success',
  red: 'bg-destructive/10 text-destructive',
  purple: 'bg-violet-500/10 text-violet-600',
};

const ageHours = (iso?: string) => (iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : 0);
const ageLabel = (iso?: string) => {
  const mins = Math.max(0, Math.round(ageHours(iso) * 60));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ${mins % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
};

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
  const [oldestPending, setOldestPending] = useState<any[]>([]);
  const [listTab, setListTab] = useState<'pending' | 'delivered'>('pending');
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
    const pollMs = connected ? 45_000 : 15_000;
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
    }).catch(() => {});
    appApi.getStats().then(setStats).catch(() => {});
    if (!token) return;
    const ac = new AbortController();
    (async () => {
      try {
        const r = await getInvoices(token, {
          page: 1,
          page_size: 5,
          sort_by: 'delivered_at',
          sort_order: 'desc',
          status: 'completed,delivered',
        });
        if (!ac.signal.aborted) {
          setRecentDeliveries(r.items as any[]);
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          console.error('Failed to load recent deliveries', e);
        }
      }
      try {
        const r = await getInvoices(token, { page: 1, page_size: 8, sort_by: 'created_at', sort_order: 'asc', status: 'pending' });
        if (!ac.signal.aborted) setOldestPending(r.items as any[]);
      } catch (e) {
        if (!ac.signal.aborted) console.error('Failed to load pending invoices', e);
      }
    })();
    return () => ac.abort();
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
    <div className="grid gap-4">
      <PageHeader
        title="Dashboard"
        description={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        className="mb-1"
        actions={
          <>
            {user?.role === 'admin' && (
              <>
                <div className="relative">
                  <SearchableSelect
                    value={selectedBoyId}
                    onChange={setSelectedBoyId}
                    className="w-[200px]"
                    options={[
                      { value: 'all', label: 'All delivery boys' },
                      ...deliveryBoys.map((b) => ({ value: String(b.id), label: b.username })),
                      { value: 'custom', label: 'Custom...' },
                    ]}
                  />
                </div>
                {selectedBoyId === 'custom' && (
                  <Input placeholder="Enter name..." value={customBoyName} onChange={(e) => setCustomBoyName(e.target.value)} className="w-36" />
                )}
              </>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-y md:grid-cols-6 md:divide-y-0">
          {cards.map((card) => {
            const attention = card.key === 'pending' && Number(card.value) > 0;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => openCard(card)}
                className="px-4 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-accent"
              >
                <span className="block text-xs text-muted-foreground">{card.label}</span>
                <span className={`mt-0.5 block text-2xl font-semibold tabular-nums tracking-tight ${attention ? 'text-warning' : 'text-foreground'}`}>{card.value}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className={`grid grid-cols-1 gap-4 ${canLiveMap ? 'lg:grid-cols-3' : ''}`}>
        <Card className={`overflow-hidden ${canLiveMap ? 'lg:col-span-2' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <Segmented
              value={listTab}
              onValueChange={(v) => setListTab(v as 'pending' | 'delivered')}
              options={[
                { value: 'pending', label: <>Waiting for a rider{oldestPending.length ? ` (${oldestPending.length}+)` : ''}</> },
                { value: 'delivered', label: <>Recently delivered</> },
              ]}
            />
            <Button variant="link" size="xs" onClick={() => navigate(listTab === 'pending' ? '/invoices?status=pending' : '/invoices')}>View all</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead className="hidden sm:table-cell">Hospital</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">{listTab === 'pending' ? 'Waiting' : 'Delivered'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(listTab === 'pending' ? oldestPending : recentDeliveries).length > 0 ? (listTab === 'pending' ? oldestPending : recentDeliveries).map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <TableCell className="whitespace-nowrap font-medium">{inv.invoice_number}</TableCell>
                  <TableCell className="hidden max-w-[260px] truncate text-muted-foreground sm:table-cell">{inv.hospital_name}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{Number(inv.amount || 0).toLocaleString()}</TableCell>
                  <TableCell className={`whitespace-nowrap text-right tabular-nums ${listTab === 'pending' && ageHours(inv.created_at) >= 4 ? 'font-medium text-warning' : 'text-muted-foreground'}`}>
                    {listTab === 'pending' ? ageLabel(inv.created_at) : new Date(inv.delivered_at || inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{listTab === 'pending' ? 'Nothing is waiting. All invoices have a rider.' : 'No deliveries yet.'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {canLiveMap && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <span className="text-sm font-medium">Riders on duty</span>
              <Button variant="link" size="xs" onClick={() => navigate('/tracking')}>Live view</Button>
            </div>
            {mapLoadError && <p className="px-4 pt-2 text-xs text-destructive">{mapLoadError}</p>}
            <div className="relative h-56">
              <MapPreview
                riders={mapRiders}
                route={[]}
                checkpoints={[]}
                center={mapCenter}
                zoom={mapRiders.length === 1 ? 15 : 13}
              />
              {mergedDuty.length === 0 && !mapLoadError && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-card/95 to-transparent pb-2 pt-8 text-center">
                  <p className="text-xs font-medium text-muted-foreground">No delivery staff on duty</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">On duty</span>
              <span className="font-medium tabular-nums">{mergedDuty.length}</span>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">Sharing location</span>
              <span className="font-medium tabular-nums">{mapRiders.length}</span>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={!!detailCard} onOpenChange={(o) => { if (!o) setDetailCard(null); }}>
        <DialogContent aria-describedby={undefined} className="flex max-h-[80dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          {detailCard && (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4 pr-12">
                <span className={`grid size-9 place-items-center rounded-lg ${TONE[detailCard.color]}`}>
                  <detailCard.icon size={18} />
                </span>
                <div>
                  <DialogTitle>{detailCard.label}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{detailCard.value} total</p>
                </div>
              </div>

              {!detailLoading && !detailError && detailItems.length > 0 && detailCard.key === 'total_boys' && (
                <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-4 py-2.5">
                  {BOY_SORT_FIELDS.map((f) => {
                    const active = sortKey === f.key;
                    return (
                      <Button
                        key={f.key}
                        size="xs"
                        variant={active ? 'dark' : 'secondary'}
                        onClick={() => toggleSort(f.key)}
                      >
                        {f.label}
                        {active ? (sortOrder === 'asc' ? <ChevronUp /> : <ChevronDown />) : <ArrowUpDown className="opacity-50" />}
                      </Button>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3">
                {detailLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Spinner /> Loading…</div>
                ) : detailError ? (
                  <div className="p-4 text-sm text-destructive">{detailError}</div>
                ) : detailItems.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No {detailCard.label} records found.</div>
                ) : detailCard.key === 'total_boys' ? (
                  <div className="divide-y rounded-lg border">
                    {sortedItems.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Users size={15} /></span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{b.username}</p>
                            <p className="truncate text-xs text-muted-foreground">{b.email}{b.phone ? ` • ${b.phone}` : ''}</p>
                          </div>
                        </div>
                        <Badge variant="success">Delivery boy</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {detailItems.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Truck size={15} /></span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{inv.invoice_number}</p>
                            <p className="truncate text-xs text-muted-foreground">{inv.hospital_name}{inv.assignee_name ? ` • ${inv.assignee_name}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-medium tabular-nums text-foreground">₹{Number(inv.amount || 0).toLocaleString()}</span>
                          <Badge className="capitalize">{inv.status}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
