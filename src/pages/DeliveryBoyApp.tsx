import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import {
  Power, Clock, MapPin, ChevronRight, CheckCircle2, Truck,
  History, LayoutGrid, AlertCircle, Navigation, Upload, IndianRupee,
  FileCheck, LogOut, XCircle, Camera, Bell, X, Map as MapIcon, Flag,
  Trash2, CheckSquare, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { appApi } from '../lib/appApi';
import { formatDateTimeIST } from '../lib/timeUtils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input, Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** YYYY-MM-DD for API completion_from (last N days). */
function completionFromISO(days: number | null | undefined): string | undefined {
  if (days == null || days <= 0) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function DeliveryBoyApp() {
  const { user, logout, token } = useAuth();
  const { socket, reconnect } = useSocket();
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [completedHistory, setCompletedHistory] = useState<any[]>([]);
  const [compPage, setCompPage] = useState(1);
  const [compTotal, setCompTotal] = useState(0);
  const [compLoading, setCompLoading] = useState(false);
  const [compLoadingMore, setCompLoadingMore] = useState(false);
  const [histSearch, setHistSearch] = useState('');
  const [historySearchDraft, setHistorySearchDraft] = useState('');
  const [histDays, setHistDays] = useState<number | null>(null);
  const [histIncludeCancelled, setHistIncludeCancelled] = useState(true);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptError, setAcceptError] = useState('');
  const [deliverySeconds, setDeliverySeconds] = useState<Record<number, number>>({});
  const [availableSeconds, setAvailableSeconds] = useState(0);

  // Payment states (now mapped to task ID)
  const [showCashInput, setShowCashInput] = useState<Record<number, boolean>>({});
  const [showChequeInput, setShowChequeInput] = useState<Record<number, boolean>>({});
  const [cash, setCash] = useState<Record<number, string>>({});
  const [cheque, setCheque] = useState<Record<number, string>>({});
  const [chequeNumber, setChequeNumber] = useState<Record<number, string>>({});
  const [bankName, setBankName] = useState<Record<number, string>>({});
  const [chequePhotoUrl, setChequePhotoUrl] = useState<Record<number, string | null>>({});

  const [signedCopy, setSignedCopy] = useState<Record<number, string | null>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [submitError, setSubmitError] = useState<Record<number, string>>({});
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedUserNotifIds, setSelectedUserNotifIds] = useState<any[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const userFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideUserClick(event: MouseEvent) {
      if (userFeedRef.current && !userFeedRef.current.contains(event.target as Node)) {
        setSelectedUserNotifIds([]);
      }
    }
    if (selectedUserNotifIds.length > 0) {
      document.addEventListener('click', handleOutsideUserClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideUserClick);
    };
  }, [selectedUserNotifIds.length]);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackTaskId, setFeedbackTaskId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'properly' | 'improperly' | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');

  const [showShiftModal, setShowShiftModal] = useState(false);

  const [showMap, setShowMap] = useState(true);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);

  const isAvailableRef = useRef(isAvailable);
  const activeTasksRef = useRef(activeTasks);
  const socketRef = useRef(socket);
  const locationRef = useRef<GeolocationPosition | null>(null);
  isAvailableRef.current = isAvailable;
  activeTasksRef.current = activeTasks;
  socketRef.current = socket;

  // Load notifications
  useEffect(() => {
    const all = appApi.getNotifications();
    const mine = all.filter((n: any) =>
      n.targets.includes('all') || n.targets.includes('delivery_boy')
    );
    setNotifications(mine);
  }, [showNotifs]);

  const unreadCount = notifications.filter((n: any) => !(n.readBy || []).includes(user?.id)).length;

  // Available duration timer
  useEffect(() => {
    if (!isAvailable) { setAvailableSeconds(0); return; }
    const t = setInterval(() => setAvailableSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isAvailable]);

  // Delivery timer for each active task
  useEffect(() => {
    if (activeTasks.length === 0) { setDeliverySeconds({}); return; }
    const tick = setInterval(() => {
      setDeliverySeconds(prev => {
        const next = { ...prev };
        activeTasks.forEach(task => {
          if (task.accepted_at) {
            next[task.id] = Math.floor((Date.now() - new Date(task.accepted_at).getTime()) / 1000);
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [activeTasks]);

  // Keep per-task UI state in sync with current active tasks so stale ids don't keep controls disabled.
  useEffect(() => {
    const activeIds = new Set(activeTasks.map((t) => t.id));
    const pruneByActive = <T extends Record<number, any>>(prev: T): T => {
      const next: Record<number, any> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const id = Number(k);
        if (activeIds.has(id)) next[id] = v;
      });
      return next as T;
    };
    setSubmitted((prev) => pruneByActive(prev));
    setSubmitError((prev) => pruneByActive(prev));
    setShowCashInput((prev) => pruneByActive(prev));
    setShowChequeInput((prev) => pruneByActive(prev));
    setCash((prev) => pruneByActive(prev));
    setCheque((prev) => pruneByActive(prev));
    setChequeNumber((prev) => pruneByActive(prev));
    setBankName((prev) => pruneByActive(prev));
    setChequePhotoUrl((prev) => pruneByActive(prev));
    setSignedCopy((prev) => pruneByActive(prev));
  }, [activeTasks]);

  // Geolocation
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        locationRef.current = pos;
        if (isAvailableRef.current && socketRef.current) {
          socketRef.current.emit('location_update', {
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            speed_mps: pos.coords.speed ?? null,
            heading: pos.coords.heading ?? null,
          });
        }
      },
      undefined,
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const fetchInvoices = useCallback(async () => {
    let data: any[];
    if (token) {
      data = await appApi.getDeliveryOpenInvoices(token);
    } else {
      data = [];
    }
    setInvoices(data);
    const active = data.filter((inv: any) => inv.status === 'assigned' && inv.assigned_to === user?.id);
    setActiveTasks(active);
    return data;
  }, [token, user?.id]);

  const loadHistoryPage = useCallback(
    async (page: number, append: boolean) => {
      if (!user?.id) return;
      if (token) {
        if (append) setCompLoadingMore(true);
        else setCompLoading(true);
        try {
          const r = await appApi.getDeliveryCompletedHistoryPage(token, page, {
            search: histSearch || undefined,
            completion_from: completionFromISO(histDays),
            includeCancelled: histIncludeCancelled,
          });
          setCompTotal(r.total);
          setCompPage(page);
          if (append) setCompletedHistory((p) => [...p, ...r.items]);
          else setCompletedHistory(r.items as any[]);
        } finally {
          setCompLoading(false);
          setCompLoadingMore(false);
        }
        return;
      }
      const all = [];
      let mine = all.filter(
        (i: any) =>
          i.assigned_to === user.id &&
          (i.status === 'delivered' || (histIncludeCancelled && i.status === 'cancelled'))
      );
      if (histSearch.trim()) {
        const q = histSearch.trim().toLowerCase();
        mine = mine.filter(
          (i: any) =>
            (i.invoice_number || '').toLowerCase().includes(q) ||
            (i.hospital_name || '').toLowerCase().includes(q)
        );
      }
      if (histDays != null && histDays > 0) {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        from.setDate(from.getDate() - histDays);
        mine = mine.filter((i: any) => {
          const raw = i.status === 'delivered' ? i.delivered_at : i.updated_at;
          if (!raw) return false;
          return new Date(raw) >= from;
        });
      }
      setCompletedHistory(mine);
      setCompTotal(mine.length);
      setCompPage(1);
    },
    [token, user?.id, histSearch, histDays, histIncludeCancelled]
  );

  useEffect(() => {
    if (!socket) return;
    const unsubscribe = socket.on('new_invoice', async (evt: any) => {
      const inv = evt?.invoice;
      if (inv?.invoice_number) {
        const assignedToMe = inv.assigned_to === user?.id && inv.status === 'assigned';
        appApi.saveNotification({
          title: assignedToMe ? `Invoice assigned - ${inv.invoice_number}` : `New Task - ${inv.invoice_number}`,
          message: assignedToMe
            ? `Check assigned invoice in Active tab`
            : `${inv.hospital_name} - Rs ${Number(inv.amount || 0).toLocaleString()}`,
          targets: ['delivery_boy'],
          priority: 'important',
          sentBy: 'System',
          isSystem: true,
        });
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`New delivery — ${inv.invoice_number}`, {
              body: `${inv.hospital_name} — ₹${Number(inv.amount || 0).toLocaleString('en-IN')}`,
              icon: '/favicon.ico',
            });
          } catch {
            /* ignore */
          }
        }
      }
      await fetchInvoices();
      if (inv?.assigned_to === user?.id && inv?.status === 'assigned') {
        setActiveTab('active');
      } else {
        setActiveTab('available');
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, [socket, fetchInvoices]);

  useEffect(() => {
    fetchInvoices().then((data) => {
      const active = data.filter((inv: any) => inv.status === 'assigned' && inv.assigned_to === user?.id);
      if (active.length > 0 && expandedTaskId === null) {
        setExpandedTaskId(active[0].id);
      }
    });
  }, [fetchInvoices, user?.id]);

  useEffect(() => {
    if (activeTab !== 'completed') return;
    loadHistoryPage(1, false);
  }, [activeTab, histSearch, histDays, histIncludeCancelled, loadHistoryPage]);

  const handleAccept = async (id: number) => {
    if (!user) return;
    if (!isAvailable) return;
    setAcceptError('');
    setAcceptingId(id);
    try {
      const res = await appApi.acceptInvoice(id, user.id);
      if (res.success) {
        await fetchInvoices();
        setExpandedTaskId(id);
        setActiveTab('active');
        setShowMap(true);
      }
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Unable to accept this invoice.');
    } finally { setAcceptingId(null); }
  };

  const pendingInvoices = invoices.filter((i) => i.status === 'pending');
  const canShowAvailable = isAvailable;
  const hasHistoryFilters = Boolean(histSearch || histDays !== null || !histIncludeCancelled);
  const clearHistoryFilters = () => {
    setHistSearch('');
    setHistorySearchDraft('');
    setHistDays(null);
    setHistIncludeCancelled(true);
  };

  const handleDeliver = async (taskId: number) => {
    if (!signedCopy[taskId]) {
      setSubmitError(prev => ({ ...prev, [taskId]: 'Please upload a signed copy before submitting.' }));
      return;
    }
    const chqAmt = Number(cheque[taskId]);
    if (chqAmt > 0 && (!chequeNumber[taskId] || !bankName[taskId])) {
      setSubmitError(prev => ({ ...prev, [taskId]: 'Please provide Cheque Number and Bank Name.' }));
      return;
    }
    setSubmitError(prev => ({ ...prev, [taskId]: '' }));
    const res = await appApi.deliverInvoice(taskId, {
      cash: Number(cash[taskId]) || 0,
      cheque: chqAmt || 0,
      cheque_number: chequeNumber[taskId],
      bank_name: bankName[taskId],
      cheque_photo_url: chequePhotoUrl[taskId],
      signed_copy_url: signedCopy[taskId],
      delivery_latitude: locationRef.current?.coords.latitude ?? null,
      delivery_longitude: locationRef.current?.coords.longitude ?? null,
    });
    if (res.success) {
      setSubmitted(prev => ({ ...prev, [taskId]: true }));
      setFeedbackTaskId(taskId);
      setShowFeedbackModal(true);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackTaskId && feedback) {
      await appApi.submitFeedback(feedbackTaskId, feedback, feedbackReason);
    }
    setShowFeedbackModal(false);

    // Show shift completion modal after 1s
    setTimeout(async () => {
      await fetchInvoices();
      setShowShiftModal(true);
    }, 1000);
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim() || !activeTasks[0]) return;
    await appApi.cancelInvoice(activeTasks[0].id, cancelReason);
    setShowCancelModal(false);
    setCancelReason('');
    fetchInvoices();
    setActiveTab('available');
  };

  const handleCapture = () => {
    const taskId = activeTasks[0]?.id;
    if (!taskId) return;
    const url = `https://picsum.photos/seed/${Date.now()}/400/300`;
    setSignedCopy((prev) => ({ ...prev, [taskId]: url }));
  };

  const handleCaptureCheque = () => {
    const taskId = activeTasks[0]?.id;
    if (!taskId) return;
    const url = `https://picsum.photos/seed/${Date.now() + 1}/400/300`;
    setChequePhotoUrl((prev) => ({ ...prev, [taskId]: url }));
  };

  const handleAddCheckpoint = () => {
    if (locationRef.current) {
      const desc = prompt("Enter checkpoint description:");
      if (desc === null) return; // Cancelled

      const pos = {
        lat: locationRef.current.coords.latitude,
        lng: locationRef.current.coords.longitude,
        time: new Date(),
        description: desc
      };
      setCheckpoints([...checkpoints, pos]);
      // Mock sending to manager
      appApi.saveNotification({
        title: 'New Checkpoint Recorded',
        message: `${user?.username} recorded a checkpoint: "${desc}" for order ${activeTasks[0]?.invoice_number || 'N/A'}`,
        targets: ['manager', 'admin'],
        priority: 'normal'
      });
    }
  };

  return (
    <div className="h-dvh bg-muted flex flex-col relative w-full max-w-md mx-auto overflow-hidden">
      {/* Mobile Status Bar */}
      <div className="bg-card border-b border-border px-3 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-primary animate-pulse' : 'bg-input'}`} />
          <span className="text-[11px] font-semibold text-foreground/70">{isAvailable ? 'Available' : 'Offline'}</span>
          {isAvailable && (
            <Badge variant="success" >
              {fmtTime(availableSeconds)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="relative" onClick={() => setShowNotifs(true)} >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[11px] font-semibold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
          <button
            onClick={async () => {
              const next = !isAvailable;
              try {
                await appApi.setDeliveryPresence(next);
                setIsAvailable(next);
                if (next) reconnect();
              } catch {
                // Presence update failed; keep current state unchanged.
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${isAvailable ? 'bg-primary text-white' : 'bg-border text-foreground/70'
              }`}>
            <Power size={14} />{isAvailable ? 'Offline' : 'Online'}
          </button>
        </div>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/50 flex items-end" onClick={() => setShowNotifs(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} 
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-t-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
                  {notifications.length > 0 && (
                    <Badge>
                      {notifications.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedUserNotifIds.length > 0 && (
                    <Button variant="outline" size="xs" className="text-destructive bg-destructive/10 border-destructive/20 hover:bg-destructive/15"
                      onClick={() => {
                        selectedUserNotifIds.forEach((id) => appApi.deleteNotification(id));
                        setSelectedUserNotifIds([]);
                        const all = appApi.getNotifications();
                        setNotifications(all.filter((n: any) => n.targetRole === 'delivery_boy' || n.targetRole === 'all' || n.userId === user?.id));
                      }}
                      
                    >
                      <Trash2 size={12} /> Delete ({selectedUserNotifIds.length})
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button variant="secondary" size="xs" className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                      onClick={() => {
                        notifications.forEach((n: any) => appApi.deleteNotification(n.id));
                        setSelectedUserNotifIds([]);
                        setNotifications([]);
                      }}
                      
                      title="Clear all notifications"
                    >
                      <Trash2 size={12} /> Delete All
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowNotifs(false)} >
                    <X size={20} />
                  </Button>
                </div>
              </div>
              <div ref={userFeedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/70">
                      <Bell size={32} />
                    </div>
                    <p className="text-muted-foreground font-medium">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif: any) => {
                    const isRead = (notif.readBy || []).includes(user?.id);
                    const isSelected = selectedUserNotifIds.includes(notif.id);
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-secondary border-foreground shadow-2xs'
                            : isRead
                            ? 'bg-card border-border hover:bg-muted'
                            : 'bg-info/10 border-info/25 hover:bg-info/10'
                        }`}
                        onClick={() => {
                          if (!isRead) {
                            appApi.markNotifRead(notif.id, user?.id);
                            setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, readBy: [...(n.readBy || []), user?.id] } : n));
                          }
                          setSelectedUserNotifIds((prev) => prev.includes(notif.id) ? prev.filter((id) => id !== notif.id) : [...prev, notif.id]);
                        }}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="mt-1 text-muted-foreground/70 shrink-0">
                            {isSelected ? <CheckSquare size={16} className="text-foreground" /> : <Square size={16} className="text-muted-foreground/50" />}
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.priority === 'urgent' ? 'bg-destructive/15 text-destructive' : notif.priority === 'important' ? 'bg-warning/15 text-warning' : 'bg-info/15 text-info'}`}>
                            <Bell size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-foreground">{notif.title}</h4>
                            <p className="text-xs text-foreground/70 mt-0.5">{notif.message}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-1">{formatDateTimeIST(notif.created_at)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isRead && <span className="w-2 h-2 bg-info rounded-full shrink-0" />}
                          <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              appApi.deleteNotification(notif.id);
                              setSelectedUserNotifIds((prev) => prev.filter((id) => id !== notif.id));
                              const all = appApi.getNotifications();
                              setNotifications(all.filter((n: any) => n.targetRole === 'delivery_boy' || n.targetRole === 'all' || n.userId === user?.id));
                            }}
                            
                            title="Delete notification"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shift Complete Modal */}
      <AnimatePresence>
        {showShiftModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-card rounded-xl w-full max-w-sm p-6 shadow-xl space-y-4 relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" type="button" onClick={() => setShowShiftModal(false)}  aria-label="Close">
                <X size={18} />
              </Button>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-primary" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Task Completed!</h3>
                <p className="text-sm text-muted-foreground mt-1">What would you like to do next?</p>
              </div>
              <div className="space-y-3 pt-4">
                <Button variant="dark" size="lg" className="w-full" onClick={() => { setIsAvailable(true); setShowShiftModal(false); setActiveTab('available'); }}
                  >
                  Return to Neomed (Available)
                </Button>
                <Button variant="secondary" size="lg" className="w-full" onClick={() => { setIsAvailable(false); setShowShiftModal(false); setActiveTab('completed'); }}
                  >
                  Complete Shift (Offline)
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Reason Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-card rounded-xl w-full max-w-sm p-6 shadow-xl space-y-4 relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" type="button" onClick={() => setShowCancelModal(false)}  aria-label="Close">
                <X size={18} />
              </Button>
              <h3 className="text-xl font-semibold text-foreground">Release order?</h3>
              <p className="text-sm text-muted-foreground">
                This returns the invoice to Available so another delivery person can accept it. Please provide a reason.
              </p>
              <Textarea className="w-full" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                
                placeholder="Reason..." />
              <div className="flex gap-3">
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => setShowCancelModal(false)} >Back</Button>
                <Button variant="destructive" size="lg" className="flex-1" onClick={handleCancelOrder} disabled={!cancelReason.trim()}
                  >Release to pool</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-card rounded-xl w-full max-w-sm p-6 shadow-xl space-y-4 relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" type="button" onClick={() => { setShowFeedbackModal(false); setFeedback(null); setFeedbackReason(''); }}  aria-label="Close">
                <X size={18} />
              </Button>
              <h3 className="text-xl font-semibold text-foreground text-center">Delivery Feedback</h3>
              <p className="text-sm text-muted-foreground text-center">How was this delivery experience?</p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setFeedback('properly')}
                  className={`py-3 rounded-xl border-2 font-semibold transition-all ${feedback === 'properly' ? 'border-primary/30 bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground/70'}`}>
                  Properly
                </button>
                <button onClick={() => setFeedback('improperly')}
                  className={`py-3 rounded-xl border-2 font-semibold transition-all ${feedback === 'improperly' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-card text-muted-foreground/70'}`}>
                  Improperly
                </button>
              </div>

              {feedback === 'improperly' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Why was it improper?</label>
                  <Textarea className="w-full" value={feedbackReason} onChange={e => setFeedbackReason(e.target.value)}
                    
                    placeholder="Details..." />
                </motion.div>
              )}

              <Button variant="dark" size="lg" className="w-full mt-2" onClick={() => handleFeedbackSubmit()} disabled={!feedback || (feedback === 'improperly' && !feedbackReason.trim())}
                >
                Submit Feedback
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
        <div className="p-3 space-y-3">
        <AnimatePresence mode="wait">
          {/* AVAILABLE INVOICES */}
          {activeTab === 'available' && (
            <motion.div key="available" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Available Tasks</h3>
                <span className="text-xs text-muted-foreground">{canShowAvailable ? pendingInvoices.length : 0} found</span>
              </div>
              {acceptError && canShowAvailable && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {acceptError}
                </div>
              )}
              {!canShowAvailable ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/70"><Power size={32} /></div>
                  <p className="text-muted-foreground font-medium">You are offline</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Go online to view and accept available tasks</p>
                </div>
              ) : pendingInvoices.map(inv => (
                <Card className="p-3.5 space-y-3 active:scale-[0.98] transition-transform" key={inv.id} >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-semibold text-primary">{inv.invoice_number}</p>
                      <h4 className="font-semibold text-foreground mt-0.5 text-[15px]">{inv.hospital_name}</h4>
                      <p className="text-[8px] text-muted-foreground/70 font-semibold uppercase mt-0.5">Task / Entity</p>
                    </div>
                    <p className="font-semibold text-foreground text-[15px]">₹{inv.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1"><MapPin size={13} /><span>2.4 km</span></div>
                    <div className="flex items-center gap-1"><Clock size={13} /><span>~15 mins</span></div>
                  </div>
                  <button onClick={() => handleAccept(inv.id)} disabled={!isAvailable || acceptingId === inv.id}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px] ${acceptingId === inv.id ? 'bg-primary/80 text-white cursor-wait'
                      : 'bg-foreground text-white'}`}>
                    {acceptingId === inv.id ? <><Spinner className="size-4"  />Accepting...</>
                      : <>Accept Task<ChevronRight size={18} /></>}
                  </button>
                </Card>
              ))}
              {canShowAvailable && pendingInvoices.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/70"><AlertCircle size={32} /></div>
                  <p className="text-muted-foreground font-medium">No tasks available right now</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">We'll notify you when new tasks arrive</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ACTIVE DELIVERY */}
          {activeTab === 'active' && (
            <motion.div key="active" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              {activeTasks.length > 0 ? activeTasks.map(task => {
                const isExpanded = expandedTaskId === task.id;
                return (
                  <div key={task.id} className={`bg-card rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary/20 shadow-xl shadow-primary/5' : 'border-border shadow-sm'}`}>
                    {/* Accordion Header */}
                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className={`w-full p-5 flex items-center justify-between text-left transition-colors ${isExpanded ? 'bg-accent/30' : 'bg-card'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-primary text-white shadow-lg shadow-primary/20 rotate-3' : 'bg-secondary text-muted-foreground/70'}`}>
                          <Truck size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground/70">{task.invoice_number}</p>
                            {isExpanded && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                          </div>
                          <h4 className="font-semibold text-foreground text-base mt-0.5">{task.hospital_name}</h4>
                          {!isExpanded && (
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                                <Clock size={10} /> {fmtTime(deliverySeconds[task.id] || 0)}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground/70">
                                <MapPin size={10} /> 2.4km
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground/50'}`}>
                        <ChevronRight size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Accordion Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                          <div className="p-5 pt-0 space-y-6">
                            {/* Status card */}
                            <div className="bg-primary text-primary-foreground p-6 rounded-xl shadow-sm shadow-primary/20 mt-2">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="text-primary-foreground text-xs font-semibold uppercase tracking-wider">Status Overview</p>
                                  <h3 className="text-xl font-semibold mt-1">Delivery in Progress</h3>
                                </div>
                                <div className="bg-card/20 p-2 rounded-xl backdrop-blur-md"><Navigation size={20} /></div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                  <p className="text-primary-foreground text-[11px]">Delivery Time</p>
                                  <p className="text-2xl font-mono font-semibold tabular-nums">{fmtTime(deliverySeconds[task.id] || 0)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Navigate / Map / Cancel */}
                            {!submitted[task.id] && (
                              <div className="grid grid-cols-3 gap-3">
                                <button className="flex items-center justify-center gap-1.5 py-3 bg-info/10 text-info rounded-xl font-semibold text-xs">
                                  <Navigation size={16} />Nav
                                </button>
                                <Button variant="secondary" size="lg" onClick={() => setShowMap(!showMap)} >
                                  <MapIcon size={16} />{showMap ? 'Map' : 'Map'}
                                </Button>
                                <Button variant="ghost" size="lg" className="bg-destructive/10 text-destructive" onClick={() => setShowCancelModal(true)}
                                  >
                                  <XCircle size={16} />Cancel
                                </Button>
                              </div>
                            )}

                            {/* Inline Map */}
                            {showMap && !submitted[task.id] && (
                              <Card className="p-3 space-y-3" >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Live Route</h4>
                                  <Button variant="secondary" size="xs" onClick={handleAddCheckpoint} >
                                    <Flag size={10} /> Checkpoint
                                  </Button>
                                </div>
                                <div className="h-48 rounded-xl overflow-hidden border border-border relative z-0">
                                  <MapContainer center={[19.9975, 73.7898]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {locationRef.current && (
                                      <Marker position={[locationRef.current.coords.latitude, locationRef.current.coords.longitude]}>
                                        <Popup>You are here</Popup>
                                      </Marker>
                                    )}
                                    {checkpoints.map((cp, idx) => (
                                      <Marker key={idx} position={[cp.lat, cp.lng]}>
                                        <Popup>{cp.description || `Checkpoint ${idx + 1}`}</Popup>
                                      </Marker>
                                    ))}
                                  </MapContainer>
                                </div>
                              </Card>
                            )}

                            {/* Completion Form */}
                            <div className="bg-muted/50 p-5 rounded-xl border border-border space-y-5">
                              <h4 className="font-semibold text-foreground text-sm">Delivery Confirmation</h4>

                              {/* Signed Copy */}
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1">
                                  <FileCheck size={12} /> Signed Copy <span className="text-destructive">*</span>
                                </label>
                                {signedCopy[task.id] ? (
                                  <div className="relative">
                                    <img src={signedCopy[task.id]!} alt="Signed copy" className="w-full h-32 object-cover rounded-xl border border-border" />
                                    {!submitted[task.id] && (
                                      <Button variant="outline" size="icon-sm" className="absolute top-2 right-2 text-destructive" onClick={() => setSignedCopy(prev => ({ ...prev, [task.id]: null }))}
                                        >
                                        <X size={14} />
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <Button variant="outline" className="w-full hover:border-primary/30 hover:text-primary" onClick={() => {
                                    const url = `https://picsum.photos/seed/${Date.now()}/400/300`;
                                    setSignedCopy(prev => ({ ...prev, [task.id]: url }));
                                  }} disabled={submitted[task.id]}
                                    >
                                    <Camera size={24} />
                                    <span className="text-xs font-medium">Capture Signature/Photo</span>
                                  </Button>
                                )}
                              </div>

                              {/* Cash / Cheque Buttons */}
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => {
                                    setShowCashInput(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                    setShowChequeInput(prev => ({ ...prev, [task.id]: false }));
                                  }}
                                  disabled={submitted[task.id]}
                                  className={`py-3 px-4 rounded-md border font-semibold text-[11px] transition-all flex items-center justify-center gap-2 ${showCashInput[task.id] ? 'border-primary/30 bg-primary text-white shadow-lg shadow-primary/20' : 'border-border bg-card text-muted-foreground'}`}
                                >
                                  <IndianRupee size={12} /> Cash
                                </button>
                                <button
                                  onClick={() => {
                                    setShowChequeInput(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                    setShowCashInput(prev => ({ ...prev, [task.id]: false }));
                                  }}
                                  disabled={submitted[task.id]}
                                  className={`py-3 px-4 rounded-md border font-semibold text-[11px] transition-all flex items-center justify-center gap-2 ${showChequeInput[task.id] ? 'border-info/40 bg-info text-white shadow-lg shadow-blue-500/20' : 'border-border bg-card text-muted-foreground'}`}
                                >
                                  <FileCheck size={12} /> Cheque
                                </button>
                              </div>

                              {showCashInput[task.id] && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground/70">Amount in Cash</label>
                                  <Input className="w-full" type="number" placeholder="₹ 0.00" value={cash[task.id] || ''} onChange={e => setCash(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    disabled={submitted[task.id]}
                                     />
                                </motion.div>
                              )}

                              {showChequeInput[task.id] && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground/70">Cheque Amount</label>
                                    <Input className="w-full" type="number" placeholder="₹ 0.00" value={cheque[task.id] || ''} onChange={e => setCheque(prev => ({ ...prev, [task.id]: e.target.value }))}
                                      disabled={submitted[task.id]}
                                       />
                                  </div>

                                  {Number(cheque[task.id]) > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 bg-info/10 border border-info/25 rounded-xl overflow-hidden">
                                      <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-xs font-medium text-info">Cheque No. *</label>
                                          <Input className="w-full" type="text" placeholder="123456" value={chequeNumber[task.id] || ''} onChange={e => setChequeNumber(prev => ({ ...prev, [task.id]: e.target.value }))}
                                            disabled={submitted[task.id]}
                                             />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-xs font-medium text-info">Bank Name *</label>
                                          <Input className="w-full" type="text" placeholder="HDFC, SBI..." value={bankName[task.id] || ''} onChange={e => setBankName(prev => ({ ...prev, [task.id]: e.target.value }))}
                                            disabled={submitted[task.id]}
                                             />
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}

                              {submitError[task.id] && (
                                <p className="text-[11px] text-destructive font-semibold flex items-center gap-1 bg-destructive/10 p-2 rounded-lg">
                                  <AlertCircle size={10} />{submitError[task.id]}
                                </p>
                              )}

                              {submitted[task.id] ? (
                                <div className="w-full py-4 bg-accent text-accent-foreground rounded-xl font-semibold flex items-center justify-center gap-2 border border-primary/20">
                                  <CheckCircle2 size={20} />Completed
                                </div>
                              ) : (
                                <Button variant="dark" size="lg" className="w-full" onClick={() => { handleDeliver(task.id); }}
                                  >
                                  Submit Delivery Task
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/70"><Truck size={32} /></div>
                  <p className="text-muted-foreground font-medium">No active tasks</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Accept a task from the available list</p>
                </div>
              )}
            </motion.div>
          )}

          {/* COMPLETED DELIVERIES — API-paginated when logged in; signed copy hidden by API after 2 days */}
          {activeTab === 'completed' && (
            <motion.div key="completed" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              <h3 className="font-semibold text-foreground mb-1">Delivery history</h3>
              <div className="bg-muted rounded-xl p-3 space-y-2 border border-border">
                <div className="flex gap-2">
                  <Input className="flex-1"
                    type="text"
                    value={historySearchDraft}
                    onChange={(e) => setHistorySearchDraft(e.target.value)}
                    placeholder="Search invoice or hospital"
                    
                  />
                  <Button variant="dark" size="sm" className="shrink-0"
                    type="button"
                    onClick={() => setHistSearch(historySearchDraft.trim())}
                    
                  >
                    Search
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {([
                    { label: 'All time', v: null as number | null },
                    { label: '7 days', v: 7 },
                    { label: '30 days', v: 30 },
                  ] as const).map(({ label, v }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setHistDays(v)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${histDays === v ? 'border-primary/30 bg-accent text-accent-foreground' : 'border-border bg-card text-foreground/70'}`}
                    >
                      {label}
                    </button>
                  ))}
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/70 ml-1 cursor-pointer">
                    <Checkbox
                      checked={!!(histIncludeCancelled)}
                      onCheckedChange={(v) => setHistIncludeCancelled(v === true)}
                      
                    />
                    Include cancelled
                  </label>
                  {hasHistoryFilters ? (
                    <Button variant="outline" size="xs"
                      type="button"
                      onClick={clearHistoryFilters}
                      
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              </div>

              {compLoading && completedHistory.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Loading history…</p>
              ) : null}

              {completedHistory.map((inv: any) =>
                inv.status === 'cancelled' ? (
                  <Card className="p-3.5 space-y-2"
                    key={inv.id}
                    
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                          <XCircle size={18} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground/70">{inv.invoice_number}</p>
                          <h4 className="font-semibold text-foreground text-[13px]">{inv.hospital_name}</h4>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-destructive">CANCELLED</span>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-3.5 space-y-2.5 active:scale-[0.98] transition-transform"
                    key={inv.id}
                    
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-primary">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground/70">{inv.invoice_number}</p>
                          <h4 className="font-semibold text-foreground text-[13px]">{inv.hospital_name}</h4>
                          <p className="text-[7px] text-muted-foreground/70 font-semibold uppercase">Task / Entity</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-foreground">₹{Number(inv.amount).toLocaleString()}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTimeIST(inv.delivered_at)}
                        </p>
                      </div>
                    </div>

                    {inv.signed_copy_url ? (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase mb-1">Signed copy</p>
                        <img src={inv.signed_copy_url} alt="Signed" className="w-full h-24 object-cover rounded-lg border border-border" />
                      </div>
                    ) : inv.status === 'delivered' ? (
                      <p className="text-[11px] text-muted-foreground/70">Signed copy not shown (older delivery or unavailable).</p>
                    ) : null}

                    <div className="flex gap-1.5 flex-wrap pt-2 border-t border-border">
                      {inv.cash_received > 0 && (
                        <Badge variant="success" >
                          <IndianRupee size={9} />Cash: ₹{inv.cash_received}
                        </Badge>
                      )}
                      {inv.cheque_received > 0 && (
                        <Badge className="text-purple-600 bg-purple-50" >
                          <IndianRupee size={9} />Cheque: ₹{inv.cheque_received}
                        </Badge>
                      )}
                    </div>
                  </Card>
                )
              )}

              {token && completedHistory.length > 0 && completedHistory.length < compTotal ? (
                <Button variant="outline" size="lg" className="w-full"
                  type="button"
                  disabled={compLoadingMore}
                  onClick={() => loadHistoryPage(compPage + 1, true)}
                  
                >
                  {compLoadingMore ? 'Loading…' : 'Load more'}
                </Button>
              ) : null}

              {!compLoading && completedHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/70">
                    <History size={32} />
                  </div>
                  <p className="text-muted-foreground font-medium">No deliveries match filters</p>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border px-1 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
        {([
          { tab: 'available', icon: LayoutGrid, label: 'Available' },
          { tab: 'active', icon: Truck, label: 'Active' },
          { tab: 'completed', icon: History, label: 'History' },
        ] as const).map(({ tab, icon: Icon, label }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-md transition-all active:scale-[0.98] ${activeTab === tab ? 'text-primary bg-accent' : 'text-muted-foreground/70'}`}>
            <Icon size={22} strokeWidth={2.5} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
        <Button variant="ghost" size="sm" className="text-destructive" onClick={logout} >
          <LogOut size={22} strokeWidth={2.5} />
          <span className="text-xs font-medium">Logout</span>
        </Button>
      </nav>
    </div >
  );
}
