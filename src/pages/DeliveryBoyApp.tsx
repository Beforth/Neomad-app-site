import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { 
  Power, Clock, MapPin, ChevronRight, CheckCircle2, Truck,
  History, LayoutGrid, AlertCircle, Navigation, Upload, IndianRupee,
  FileCheck, LogOut, XCircle, Camera, Bell, X, Map as MapIcon, Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockApi } from '../lib/mockApi';
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
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isToday(dateString: string) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function DeliveryBoyApp() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<'moving' | 'waiting' | 'at_location'>('moving');
  const [deliverySeconds, setDeliverySeconds] = useState(0);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [availableSeconds, setAvailableSeconds] = useState(0);
  const [cash, setCash] = useState('');
  const [cheque, setCheque] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequePhotoUrl, setChequePhotoUrl] = useState<string | null>(null);
  
  const [signedCopy, setSignedCopy] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState<'properly' | 'improperly' | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');

  const [showShiftModal, setShowShiftModal] = useState(false);

  const [showMap, setShowMap] = useState(true);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);

  const isAvailableRef = useRef(isAvailable);
  const activeTaskRef = useRef(activeTask);
  const socketRef = useRef(socket);
  const locationRef = useRef<GeolocationPosition | null>(null);
  isAvailableRef.current = isAvailable;
  activeTaskRef.current = activeTask;
  socketRef.current = socket;

  // Load notifications
  useEffect(() => {
    const all = mockApi.getNotifications();
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

  // Delivery timer
  useEffect(() => {
    if (!activeTask?.accepted_at) { setDeliverySeconds(0); return; }
    const start = new Date(activeTask.accepted_at).getTime();
    const tick = setInterval(() => setDeliverySeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [activeTask?.accepted_at]);

  // Waiting accumulator + alert
  const waitingAlertSentRef = useRef(false);
  useEffect(() => {
    if (deliveryStatus !== 'waiting') {
      waitingAlertSentRef.current = false;
      return;
    }
    const tick = setInterval(() => setWaitingSeconds(s => s + 1), 1000);
    // Send a system alert to admin/manager after 5 seconds of waiting
    const alertTimer = setTimeout(() => {
      if (!waitingAlertSentRef.current && activeTask) {
        mockApi.pushWaitingAlert(
          activeTask.invoice_number,
          activeTask.hospital_name,
          user?.username || 'Delivery Boy'
        );
        waitingAlertSentRef.current = true;
      }
    }, 5000);
    return () => { clearInterval(tick); clearTimeout(alertTimer); };
  }, [deliveryStatus]);

  // Geolocation
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        locationRef.current = pos;
        if (isAvailableRef.current && socketRef.current) {
          socketRef.current.emit('tracking', {
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            status: activeTaskRef.current ? 'moving' : 'waiting'
          });
        }
      },
      undefined,
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const fetchInvoices = useCallback(async () => {
    const data = await mockApi.getInvoices(user);
    setInvoices(data);
    const active = data.find((inv: any) => inv.status === 'assigned' && inv.assigned_to === user?.id);
    setActiveTask(active || null);
    if (active) { setSubmitted(false); setCash(''); setCheque(''); setSignedCopy(null); }
    return data;
  }, [user?.id]);

  useEffect(() => { fetchInvoices(); }, []);

  const handleAccept = async (id: number) => {
    if (!user || activeTask) return;
    setAcceptingId(id);
    try {
      const res = await mockApi.acceptInvoice(id, user.id);
      if (res.success) {
        await fetchInvoices();
        setActiveTab('active');
        setShowMap(true);
        setDeliveryStatus('moving');
        setWaitingSeconds(0);
      }
    } finally { setAcceptingId(null); }
  };

  const handleDeliver = async () => {
    if (!signedCopy) { setSubmitError('Please upload a signed copy before submitting.'); return; }
    if (Number(cheque) > 0 && (!chequeNumber || !bankName)) {
      setSubmitError('Please provide Cheque Number and Bank Name.');
      return;
    }
    setSubmitError('');
    const res = await mockApi.deliverInvoice(activeTask.id, {
      cash: Number(cash) || 0,
      cheque: Number(cheque) || 0,
      cheque_number: chequeNumber,
      bank_name: bankName,
      cheque_photo_url: chequePhotoUrl,
      signed_copy_url: signedCopy,
    });
    if (res.success) {
      setShowFeedbackModal(true);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (activeTask && feedback) {
      await mockApi.submitFeedback(activeTask.id, feedback, feedbackReason);
    }
    setShowFeedbackModal(false);
    setSubmitted(true);
    
    // Show shift completion modal after 1.5s
    setTimeout(async () => {
      setActiveTask(null);
      await fetchInvoices();
      setShowShiftModal(true);
    }, 1500);
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    await mockApi.cancelInvoice(activeTask.id, cancelReason);
    setShowCancelModal(false);
    setCancelReason('');
    setActiveTask(null);
    fetchInvoices();
    setActiveTab('available');
  };

  // Mock signed copy capture
  const handleCapture = () => {
    const url = `https://picsum.photos/seed/${Date.now()}/400/300`;
    setSignedCopy(url);
  };

  const handleCaptureCheque = () => {
    const url = `https://picsum.photos/seed/${Date.now() + 1}/400/300`;
    setChequePhotoUrl(url);
  };

  const handleAddCheckpoint = () => {
    if (locationRef.current) {
      const pos = { lat: locationRef.current.coords.latitude, lng: locationRef.current.coords.longitude, time: new Date() };
      setCheckpoints([...checkpoints, pos]);
      // Mock sending to manager
      mockApi.saveNotification({
        title: '📍 New Checkpoint Recorded',
        message: `${user?.username} recorded a checkpoint at their current location for order ${activeTask?.invoice_number}`,
        targets: ['manager', 'admin'],
        priority: 'normal'
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col max-w-md mx-auto border-x border-zinc-200 shadow-xl relative">
      {/* Header */}
      <header className="bg-white p-4 border-b border-zinc-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
            {user?.username[0].toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-zinc-900">{user?.username}</h2>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                {isAvailable ? 'Available' : 'Offline'}
              </div>
              {isAvailable && (
                <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                  <Clock size={10} />
                  <span className="font-mono font-bold text-zinc-700">{fmtTime(availableSeconds)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button onClick={() => setShowNotifs(true)} className="relative p-2 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setIsAvailable(a => !a)}
            className={`p-2 rounded-xl transition-colors ${isAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
            <Power size={20} />
          </button>
        </div>
      </header>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-900/50 flex justify-end" onClick={() => setShowNotifs(false)}>
            <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
              className="w-80 h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-zinc-900">Notifications</h3>
                <button onClick={() => setShowNotifs(false)}><X size={20} className="text-zinc-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : notifications.map((n: any) => {
                  const isRead = (n.readBy || []).includes(user?.id);
                  return (
                    <div key={n.id} onClick={() => { mockApi.markNotifRead(n.id, user!.id); setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, readBy: [...(x.readBy || []), user!.id] } : x)); }}
                      className={`p-4 border-b cursor-pointer transition-colors ${isRead ? 'bg-white' : 'bg-blue-50'}`}>
                      <div className="flex gap-2 items-start">
                        {!isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{n.title}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  Return to neomed (Available)
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
              <h3 className="text-xl font-bold text-zinc-900">Cancel Order</h3>
              <p className="text-sm text-zinc-500">Please provide a reason for cancelling this order.</p>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-sm h-24 outline-none focus:ring-2 focus:ring-red-500/20"
                placeholder="Reason..." />
              <div className="flex gap-3">
                <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold">Back</button>
                <button onClick={handleCancelOrder} disabled={!cancelReason.trim()}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50">Confirm Cancellation</button>
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

              <button onClick={handleFeedbackSubmit} disabled={!feedback || (feedback === 'improperly' && !feedbackReason.trim())}
                className="w-full py-4 mt-2 bg-zinc-900 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-zinc-800 transition-colors">
                Submit Feedback
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {/* AVAILABLE INVOICES */}
          {activeTab === 'available' && (
            <motion.div key="available" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-zinc-900">Available Tasks</h3>
                <span className="text-xs text-zinc-500">{invoices.filter(i => i.status === 'pending').length} found</span>
              </div>
              {invoices.filter(i => i.status === 'pending').map(inv => (
                <div key={inv.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-emerald-600">{inv.invoice_number}</p>
                      <h4 className="font-bold text-zinc-900 mt-1">{inv.hospital_name}</h4>
                    </div>
                    <p className="font-bold text-zinc-900">₹{inv.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1"><MapPin size={14} /><span>2.4 km</span></div>
                    <div className="flex items-center gap-1"><Clock size={14} /><span>~15 mins</span></div>
                  </div>
                  <button onClick={() => handleAccept(inv.id)} disabled={!!activeTask || acceptingId === inv.id}
                    className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                      activeTask ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      : acceptingId === inv.id ? 'bg-emerald-400 text-white cursor-wait'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                    {acceptingId === inv.id ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Accepting...</>
                      : activeTask ? 'Active task in progress'
                      : <>Accept Task<ChevronRight size={18} /></>}
                  </button>
                </div>
              ))}
              {invoices.filter(i => i.status === 'pending').length === 0 && (
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
            <motion.div key="active" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              {activeTask ? (
                <div className="space-y-5">
                  {/* Status card */}
                  <div className="bg-emerald-500 text-white p-6 rounded-3xl shadow-lg shadow-emerald-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Active Delivery</p>
                        <h3 className="text-2xl font-bold mt-1">{activeTask.hospital_name}</h3>
                        <p className="text-emerald-100 text-xs">{activeTask.invoice_number}</p>
                      </div>
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><Truck size={24} /></div>
                    </div>
                    <div className="flex items-center gap-6 mb-4">
                      <div className="space-y-1">
                        <p className="text-emerald-100 text-[10px]">Delivery Time</p>
                        <p className="text-2xl font-mono font-bold tabular-nums">{fmtTime(deliverySeconds)}</p>
                      </div>
                      {waitingSeconds > 0 && (
                        <>
                          <div className="h-8 w-px bg-white/20" />
                          <div className="space-y-1">
                            <p className="text-amber-200 text-[10px]">Total Waiting</p>
                            <p className="text-xl font-mono font-bold text-amber-200 tabular-nums">{fmtTime(waitingSeconds)}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(['moving', 'waiting', 'at_location'] as const).map(s => (
                        <button key={s} onClick={() => !submitted && setDeliveryStatus(s)} disabled={submitted}
                          className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${deliveryStatus === s ? 'bg-white text-emerald-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                          {s === 'moving' ? '🚗 Moving' : s === 'waiting' ? '⏳ Waiting' : '📍 At Location'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigate / Map / Cancel */}
                  {!submitted && (
                    <div className="grid grid-cols-3 gap-3">
                      <button className="flex items-center justify-center gap-1.5 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs">
                        <Navigation size={16} />Navigate
                      </button>
                      <button onClick={() => setShowMap(!showMap)} className="flex items-center justify-center gap-1.5 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-xs">
                        <MapIcon size={16} />{showMap ? 'Hide Map' : 'Show Map'}
                      </button>
                      <button onClick={() => setShowCancelModal(true)}
                        className="flex items-center justify-center gap-1.5 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs">
                        <XCircle size={16} />Cancel
                      </button>
                    </div>
                  )}

                  {/* Inline Map */}
                  {showMap && !submitted && (
                    <div className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-zinc-900 text-sm">Live Location</h4>
                        <button onClick={handleAddCheckpoint} className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Flag size={12} /> Add Checkpoint
                        </button>
                      </div>
                      <div className="h-48 rounded-xl overflow-hidden border border-zinc-200 relative z-0">
                        <MapContainer center={[19.9975, 73.7898]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          {locationRef.current && (
                            <Marker position={[locationRef.current.coords.latitude, locationRef.current.coords.longitude]}>
                              <Popup>You are here</Popup>
                            </Marker>
                          )}
                          {checkpoints.map((cp, idx) => (
                            <Marker key={idx} position={[cp.lat, cp.lng]}>
                              <Popup>Checkpoint {idx + 1}</Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                      </div>
                    </div>
                  )}

                  {/* Completion Form */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                    <h4 className="font-bold text-zinc-900">Completion Form</h4>

                    {/* Signed Copy */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500">
                        Upload Signed Copy <span className="text-red-500">*</span>
                      </label>
                      {signedCopy ? (
                        <div className="relative">
                          <img src={signedCopy} alt="Signed copy" className="w-full h-32 object-cover rounded-xl border border-zinc-200" />
                          {!submitted && (
                            <button onClick={() => setSignedCopy(null)}
                              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-zinc-200 text-red-500">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button onClick={handleCapture} disabled={submitted}
                          className="w-full border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center justify-center text-zinc-400 gap-2 hover:border-emerald-400 hover:text-emerald-500 transition-colors">
                          <Camera size={24} />
                          <span className="text-xs font-medium">Tap to take photo</span>
                        </button>
                      )}
                    </div>

                    {/* Cash / Cheque */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500">Cash Received (₹)</label>
                        <input type="number" placeholder="0.00" value={cash} onChange={e => setCash(e.target.value)}
                          disabled={submitted}
                          className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500">Cheque Received (₹)</label>
                        <input type="number" placeholder="0.00" value={cheque} onChange={e => setCheque(e.target.value)}
                          disabled={submitted}
                          className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-50" />
                      </div>
                    </div>

                    {/* Extended Cheque Fields */}
                    {Number(cheque) > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 p-4 bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">Cheque Number <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="123456" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)}
                              disabled={submitted}
                              className="w-full p-2.5 bg-white rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs disabled:opacity-50" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500">Bank Name <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="HDFC Bank" value={bankName} onChange={e => setBankName(e.target.value)}
                              disabled={submitted}
                              className="w-full p-2.5 bg-white rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs disabled:opacity-50" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500">Cheque Photo (Optional)</label>
                          {chequePhotoUrl ? (
                            <div className="relative">
                              <img src={chequePhotoUrl} alt="Cheque" className="w-full h-16 object-cover rounded-lg border border-zinc-200" />
                              {!submitted && (
                                <button onClick={() => setChequePhotoUrl(null)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-red-500 border border-zinc-200">
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button onClick={handleCaptureCheque} disabled={submitted}
                              className="w-full border-2 border-dashed border-zinc-300 rounded-lg py-3 flex items-center justify-center text-zinc-400 gap-2 hover:border-emerald-400 transition-colors disabled:opacity-50 bg-white">
                              <Camera size={14} /><span className="text-[10px] font-medium">Take Photo</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {submitError && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle size={12} />{submitError}
                      </p>
                    )}

                    {submitted ? (
                      <div className="w-full py-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 size={20} />Delivery Submitted!
                      </div>
                    ) : (
                      <button onClick={handleDeliver}
                        className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors">
                        <FileCheck size={20} />Submit Delivery
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400"><Truck size={32} /></div>
                  <p className="text-zinc-500 font-medium">No active task</p>
                  <p className="text-xs text-zinc-400 mt-1">Accept a task from the available list</p>
                </div>
              )}
            </motion.div>
          )}

          {/* COMPLETED DELIVERIES */}
          {activeTab === 'completed' && (
            <motion.div key="completed" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <h3 className="font-bold text-zinc-900 mb-2">Today's History</h3>
              {invoices.filter(i => i.status === 'delivered' && i.assigned_to === user?.id && isToday(i.delivered_at)).map(inv => (
                <div key={inv.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-400">{inv.invoice_number}</p>
                        <h4 className="font-bold text-zinc-900 text-sm">{inv.hospital_name}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900">₹{inv.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500">{new Date(inv.delivered_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Signed copy preview */}
                  {inv.signed_copy_url && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Signed Copy</p>
                      <img src={inv.signed_copy_url} alt="Signed" className="w-full h-28 object-cover rounded-xl border border-zinc-200" />
                    </div>
                  )}

                  {/* Duration chips */}
                  <div className="flex gap-2 flex-wrap pt-2 border-t border-zinc-50">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                      <Clock size={10} />Travel: 18 min
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                      <Clock size={10} />Waiting: 6 min
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-1 rounded-lg">
                      Total: 24 min
                    </span>
                    {inv.cash_received > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <IndianRupee size={10} />Cash: ₹{inv.cash_received}
                      </span>
                    )}
                    {inv.cheque_received > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                        <IndianRupee size={10} />Cheque: ₹{inv.cheque_received}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {invoices.filter(i => i.status === 'delivered' && i.assigned_to === user?.id && isToday(i.delivered_at)).length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400"><History size={32} /></div>
                  <p className="text-zinc-500 font-medium">No deliveries yet</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-zinc-100 p-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {([
          { tab: 'available', icon: LayoutGrid, label: 'Available' },
          { tab: 'active', icon: Truck, label: 'Active' },
          { tab: 'completed', icon: History, label: 'History' },
        ] as const).map(({ tab, icon: Icon, label }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === tab ? 'text-emerald-500' : 'text-zinc-400'}`}>
            <Icon size={20} />
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        ))}
        <button onClick={logout} className="flex flex-col items-center gap-1 p-2 rounded-xl text-zinc-400">
          <LogOut size={20} />
          <span className="text-[10px] font-bold">Logout</span>
        </button>
      </nav>
    </div>
  );
}
