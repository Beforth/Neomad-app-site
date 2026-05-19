import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import {
  Power, Clock, MapPin, ChevronRight, CheckCircle2, Truck,
  History, LayoutGrid, AlertCircle, Navigation, Upload, IndianRupee,
  FileCheck, LogOut, XCircle, Camera, Bell, X, Map as MapIcon, Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { appApi } from '../lib/appApi';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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
  const { socket } = useSocket();
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
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

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
      data = await appApi.getInvoices();
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
      const all = await appApi.getInvoices();
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
        appApi.saveNotification({
          title: `New Task - ${inv.invoice_number}`,
          message: `${inv.hospital_name} - Rs ${Number(inv.amount || 0).toLocaleString()}`,
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
      setActiveTab('available');
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
    setAcceptingId(id);
    try {
      const res = await appApi.acceptInvoice(id, user.id);
      if (res.success) {
        await fetchInvoices();
        setExpandedTaskId(id);
        setActiveTab('active');
        setShowMap(true);
      }
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
    <div className="h-dvh bg-zinc-50 flex flex-col relative w-full max-w-md mx-auto overflow-hidden">
      {/* Mobile Status Bar */}
      <div className="bg-white border-b border-zinc-100 px-3 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
          <span className="text-[11px] font-bold text-zinc-600">{isAvailable ? 'Available' : 'Offline'}</span>
          {isAvailable && (
            <span className="font-mono text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {fmtTime(availableSeconds)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifs(true)} className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-600 active:scale-95 transition-all">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={async () => {
              const next = !isAvailable;
              try {
                await appApi.setDeliveryPresence(next);
                setIsAvailable(next);
              } catch {
                // Presence update failed; keep current state unchanged.
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${isAvailable ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-600'
              }`}>
            <Power size={14} />{isAvailable ? 'Offline' : 'Online'}
          </button>
        </div>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-zinc-900/50 flex items-end" onClick={() => setShowNotifs(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} 
              onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-zinc-900">Notifications</h3>
                <button onClick={() => setShowNotifs(false)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 active:scale-95 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                      <Bell size={32} />
                    </div>
                    <p className="text-zinc-500 font-medium">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif: any) => {
                    const isRead = (notif.readBy || []).includes(user?.id);
                    return (
                      <div key={notif.id} className={`p-3 rounded-xl border transition-all ${isRead ? 'bg-white border-zinc-100' : 'bg-blue-50 border-blue-200'}`}
                        onClick={() => {
                          if (!isRead) {
                            appApi.markNotifRead(notif.id, user?.id);
                            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, readBy: [...(n.readBy || []), user?.id] } : n));
                          }
                        }}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.priority === 'urgent' ? 'bg-red-100 text-red-600' : notif.priority === 'important' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Bell size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-zinc-900">{notif.title}</h4>
                            <p className="text-xs text-zinc-600 mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-zinc-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                          </div>
                          {!isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-zinc-900/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-emerald-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Task Completed!</h3>
                <p className="text-sm text-zinc-500 mt-1">What would you like to do next?</p>
              </div>
              <div className="space-y-3 pt-4">
                <button onClick={() => { setIsAvailable(true); setShowShiftModal(false); setActiveTab('available'); }}
                  className="w-full py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors">
                  Return to Neomed (Available)
                </button>
                <button onClick={() => { setIsAvailable(false); setShowShiftModal(false); setActiveTab('completed'); }}
                  className="w-full py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors">
                  Complete Shift (Offline)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Reason Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-zinc-900/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
              <h3 className="text-xl font-bold text-zinc-900">Release order?</h3>
              <p className="text-sm text-zinc-500">
                This returns the invoice to Available so another delivery person can accept it. Please provide a reason.
              </p>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-sm h-24 outline-none focus:ring-2 focus:ring-red-500/20"
                placeholder="Reason..." />
              <div className="flex gap-3">
                <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold">Back</button>
                <button onClick={handleCancelOrder} disabled={!cancelReason.trim()}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50">Release to pool</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-zinc-900/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
              <h3 className="text-xl font-bold text-zinc-900 text-center">Delivery Feedback</h3>
              <p className="text-sm text-zinc-500 text-center">How was this delivery experience?</p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setFeedback('properly')}
                  className={`py-3 rounded-xl border-2 font-bold transition-all ${feedback === 'properly' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-white text-zinc-400'}`}>
                  Properly
                </button>
                <button onClick={() => setFeedback('improperly')}
                  className={`py-3 rounded-xl border-2 font-bold transition-all ${feedback === 'improperly' ? 'border-red-500 bg-red-50 text-red-700' : 'border-zinc-200 bg-white text-zinc-400'}`}>
                  Improperly
                </button>
              </div>

              {feedback === 'improperly' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500">Why was it improper?</label>
                  <textarea value={feedbackReason} onChange={e => setFeedbackReason(e.target.value)}
                    className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-sm h-20 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Details..." />
                </motion.div>
              )}

              <button onClick={() => handleFeedbackSubmit()} disabled={!feedback || (feedback === 'improperly' && !feedbackReason.trim())}
                className="w-full py-4 mt-2 bg-zinc-900 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-zinc-800 transition-colors">
                Submit Feedback
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-[72px]">
        <div className="p-3 space-y-3">
        <AnimatePresence mode="wait">
          {/* AVAILABLE INVOICES */}
          {activeTab === 'available' && (
            <motion.div key="available" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-zinc-900">Available Tasks</h3>
                <span className="text-xs text-zinc-500">{canShowAvailable ? pendingInvoices.length : 0} found</span>
              </div>
              {!canShowAvailable ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400"><Power size={32} /></div>
                  <p className="text-zinc-500 font-medium">You are offline</p>
                  <p className="text-xs text-zinc-400 mt-1">Go online to view and accept available tasks</p>
                </div>
              ) : pendingInvoices.map(inv => (
                <div key={inv.id} className="bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm space-y-3 active:scale-[0.98] transition-transform">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600">{inv.invoice_number}</p>
                      <h4 className="font-bold text-zinc-900 mt-0.5 text-[15px]">{inv.hospital_name}</h4>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase mt-0.5">Task / Entity</p>
                    </div>
                    <p className="font-bold text-zinc-900 text-[15px]">₹{inv.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1"><MapPin size={13} /><span>2.4 km</span></div>
                    <div className="flex items-center gap-1"><Clock size={13} /><span>~15 mins</span></div>
                  </div>
                  <button onClick={() => handleAccept(inv.id)} disabled={!isAvailable || acceptingId === inv.id}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px] ${acceptingId === inv.id ? 'bg-emerald-400 text-white cursor-wait'
                      : 'bg-zinc-900 text-white'}`}>
                    {acceptingId === inv.id ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Accepting...</>
                      : <>Accept Task<ChevronRight size={18} /></>}
                  </button>
                </div>
              ))}
              {canShowAvailable && pendingInvoices.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400"><AlertCircle size={32} /></div>
                  <p className="text-zinc-500 font-medium">No tasks available right now</p>
                  <p className="text-xs text-zinc-400 mt-1">We'll notify you when new tasks arrive</p>
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
                  <div key={task.id} className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-emerald-200 shadow-xl shadow-emerald-500/5' : 'border-zinc-100 shadow-sm'}`}>
                    {/* Accordion Header */}
                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className={`w-full p-5 flex items-center justify-between text-left transition-colors ${isExpanded ? 'bg-emerald-50/30' : 'bg-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 rotate-3' : 'bg-zinc-100 text-zinc-400'}`}>
                          <Truck size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{task.invoice_number}</p>
                            {isExpanded && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          </div>
                          <h4 className="font-bold text-zinc-900 text-base mt-0.5">{task.hospital_name}</h4>
                          {!isExpanded && (
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                <Clock size={10} /> {fmtTime(deliverySeconds[task.id] || 0)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                <MapPin size={10} /> 2.4km
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-50 text-zinc-300'}`}>
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
                            <div className="bg-emerald-500 text-white p-6 rounded-3xl shadow-lg shadow-emerald-200 mt-2">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Status Overview</p>
                                  <h3 className="text-xl font-bold mt-1">Delivery in Progress</h3>
                                </div>
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><Navigation size={20} /></div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                  <p className="text-emerald-100 text-[10px]">Delivery Time</p>
                                  <p className="text-2xl font-mono font-bold tabular-nums">{fmtTime(deliverySeconds[task.id] || 0)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Navigate / Map / Cancel */}
                            {!submitted[task.id] && (
                              <div className="grid grid-cols-3 gap-3">
                                <button className="flex items-center justify-center gap-1.5 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs">
                                  <Navigation size={16} />Nav
                                </button>
                                <button onClick={() => setShowMap(!showMap)} className="flex items-center justify-center gap-1.5 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-xs">
                                  <MapIcon size={16} />{showMap ? 'Map' : 'Map'}
                                </button>
                                <button onClick={() => setShowCancelModal(true)}
                                  className="flex items-center justify-center gap-1.5 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs">
                                  <XCircle size={16} />Cancel
                                </button>
                              </div>
                            )}

                            {/* Inline Map */}
                            {showMap && !submitted[task.id] && (
                              <div className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wider">Live Route</h4>
                                  <button onClick={handleAddCheckpoint} className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Flag size={10} /> Checkpoint
                                  </button>
                                </div>
                                <div className="h-48 rounded-2xl overflow-hidden border border-zinc-200 relative z-0">
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
                              </div>
                            )}

                            {/* Completion Form */}
                            <div className="bg-zinc-50/50 p-5 rounded-3xl border border-zinc-100 space-y-5">
                              <h4 className="font-bold text-zinc-900 text-sm">Delivery Confirmation</h4>

                              {/* Signed Copy */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                  <FileCheck size={12} /> Signed Copy <span className="text-red-500">*</span>
                                </label>
                                {signedCopy[task.id] ? (
                                  <div className="relative">
                                    <img src={signedCopy[task.id]!} alt="Signed copy" className="w-full h-32 object-cover rounded-xl border border-zinc-200" />
                                    {!submitted[task.id] && (
                                      <button onClick={() => setSignedCopy(prev => ({ ...prev, [task.id]: null }))}
                                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-zinc-200 text-red-500">
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button onClick={() => {
                                    const url = `https://picsum.photos/seed/${Date.now()}/400/300`;
                                    setSignedCopy(prev => ({ ...prev, [task.id]: url }));
                                  }} disabled={submitted[task.id]}
                                    className="w-full border-2 border-dashed border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center text-zinc-400 gap-2 hover:border-emerald-400 hover:text-emerald-500 transition-all bg-white">
                                    <Camera size={24} />
                                    <span className="text-xs font-medium">Capture Signature/Photo</span>
                                  </button>
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
                                  className={`py-3 px-4 rounded-xl border font-bold text-[10px] transition-all flex items-center justify-center gap-2 ${showCashInput[task.id] ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'border-zinc-200 bg-white text-zinc-500'}`}
                                >
                                  <IndianRupee size={12} /> Cash
                                </button>
                                <button
                                  onClick={() => {
                                    setShowChequeInput(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                    setShowCashInput(prev => ({ ...prev, [task.id]: false }));
                                  }}
                                  disabled={submitted[task.id]}
                                  className={`py-3 px-4 rounded-xl border font-bold text-[10px] transition-all flex items-center justify-center gap-2 ${showChequeInput[task.id] ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'border-zinc-200 bg-white text-zinc-500'}`}
                                >
                                  <FileCheck size={12} /> Cheque
                                </button>
                              </div>

                              {showCashInput[task.id] && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amount in Cash</label>
                                  <input type="number" placeholder="₹ 0.00" value={cash[task.id] || ''} onChange={e => setCash(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    disabled={submitted[task.id]}
                                    className="w-full p-3 bg-white rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-50" />
                                </motion.div>
                              )}

                              {showChequeInput[task.id] && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cheque Amount</label>
                                    <input type="number" placeholder="₹ 0.00" value={cheque[task.id] || ''} onChange={e => setCheque(prev => ({ ...prev, [task.id]: e.target.value }))}
                                      disabled={submitted[task.id]}
                                      className="w-full p-3 bg-white rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-50" />
                                  </div>

                                  {Number(cheque[task.id]) > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl overflow-hidden">
                                      <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Cheque No. *</label>
                                          <input type="text" placeholder="123456" value={chequeNumber[task.id] || ''} onChange={e => setChequeNumber(prev => ({ ...prev, [task.id]: e.target.value }))}
                                            disabled={submitted[task.id]}
                                            className="w-full p-2.5 bg-white rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs disabled:opacity-50" />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Bank Name *</label>
                                          <input type="text" placeholder="HDFC, SBI..." value={bankName[task.id] || ''} onChange={e => setBankName(prev => ({ ...prev, [task.id]: e.target.value }))}
                                            disabled={submitted[task.id]}
                                            className="w-full p-2.5 bg-white rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs disabled:opacity-50" />
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}

                              {submitError[task.id] && (
                                <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 bg-red-50 p-2 rounded-lg">
                                  <AlertCircle size={10} />{submitError[task.id]}
                                </p>
                              )}

                              {submitted[task.id] ? (
                                <div className="w-full py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-2 border border-emerald-100">
                                  <CheckCircle2 size={20} />Completed
                                </div>
                              ) : (
                                <button onClick={() => { handleDeliver(task.id); }}
                                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-lg shadow-zinc-200 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all">
                                  Submit Delivery Task
                                </button>
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
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400"><Truck size={32} /></div>
                  <p className="text-zinc-500 font-medium">No active tasks</p>
                  <p className="text-xs text-zinc-400 mt-1">Accept a task from the available list</p>
                </div>
              )}
            </motion.div>
          )}

          {/* COMPLETED DELIVERIES — API-paginated when logged in; signed copy hidden by API after 2 days */}
          {activeTab === 'completed' && (
            <motion.div key="completed" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              <h3 className="font-bold text-zinc-900 mb-1">Delivery history</h3>
              <div className="bg-zinc-50 rounded-xl p-3 space-y-2 border border-zinc-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={historySearchDraft}
                    onChange={(e) => setHistorySearchDraft(e.target.value)}
                    placeholder="Search invoice or hospital"
                    className="flex-1 text-sm rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setHistSearch(historySearchDraft.trim())}
                    className="shrink-0 px-3 py-2 rounded-lg bg-zinc-900 text-white text-xs font-bold"
                  >
                    Search
                  </button>
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
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${histDays === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-white text-zinc-600'}`}
                    >
                      {label}
                    </button>
                  ))}
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 ml-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={histIncludeCancelled}
                      onChange={(e) => setHistIncludeCancelled(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Include cancelled
                  </label>
                  {hasHistoryFilters ? (
                    <button
                      type="button"
                      onClick={clearHistoryFilters}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-600"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>

              {compLoading && completedHistory.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">Loading history…</p>
              ) : null}

              {completedHistory.map((inv: any) =>
                inv.status === 'cancelled' ? (
                  <div
                    key={inv.id}
                    className="bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                          <XCircle size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400">{inv.invoice_number}</p>
                          <h4 className="font-bold text-zinc-900 text-[13px]">{inv.hospital_name}</h4>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-red-600">CANCELLED</span>
                    </div>
                  </div>
                ) : (
                  <div
                    key={inv.id}
                    className="bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm space-y-2.5 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400">{inv.invoice_number}</p>
                          <h4 className="font-bold text-zinc-900 text-[13px]">{inv.hospital_name}</h4>
                          <p className="text-[7px] text-zinc-400 font-bold uppercase">Task / Entity</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-bold text-zinc-900">₹{Number(inv.amount).toLocaleString()}</p>
                        <p className="text-[9px] text-zinc-500">
                          {inv.delivered_at ? new Date(inv.delivered_at).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>

                    {inv.signed_copy_url ? (
                      <div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Signed copy</p>
                        <img src={inv.signed_copy_url} alt="Signed" className="w-full h-24 object-cover rounded-lg border border-zinc-200" />
                      </div>
                    ) : inv.status === 'delivered' ? (
                      <p className="text-[9px] text-zinc-400">Signed copy not shown (older delivery or unavailable).</p>
                    ) : null}

                    <div className="flex gap-1.5 flex-wrap pt-2 border-t border-zinc-50">
                      {inv.cash_received > 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                          <IndianRupee size={9} />Cash: ₹{inv.cash_received}
                        </span>
                      )}
                      {inv.cheque_received > 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                          <IndianRupee size={9} />Cheque: ₹{inv.cheque_received}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}

              {token && completedHistory.length > 0 && completedHistory.length < compTotal ? (
                <button
                  type="button"
                  disabled={compLoadingMore}
                  onClick={() => loadHistoryPage(compPage + 1, true)}
                  className="w-full py-3 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 disabled:opacity-50"
                >
                  {compLoadingMore ? 'Loading…' : 'Load more'}
                </button>
              ) : null}

              {!compLoading && completedHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                    <History size={32} />
                  </div>
                  <p className="text-zinc-500 font-medium">No deliveries match filters</p>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-zinc-100 px-1 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
        {([
          { tab: 'available', icon: LayoutGrid, label: 'Available' },
          { tab: 'active', icon: Truck, label: 'Active' },
          { tab: 'completed', icon: History, label: 'History' },
        ] as const).map(({ tab, icon: Icon, label }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-all active:scale-95 ${activeTab === tab ? 'text-emerald-500 bg-emerald-50' : 'text-zinc-400'}`}>
            <Icon size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
          </button>
        ))}
        <button onClick={logout} className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl text-red-500 active:scale-95 active:bg-red-50 transition-all">
          <LogOut size={22} strokeWidth={2.5} />
          <span className="text-[9px] font-bold uppercase tracking-wide">Logout</span>
        </button>
      </nav>
    </div >
  );
}
