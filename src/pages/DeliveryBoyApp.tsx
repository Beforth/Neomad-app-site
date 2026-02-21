import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { 
  Power, 
  Clock, 
  MapPin, 
  ChevronRight, 
  CheckCircle2, 
  Truck,
  History,
  LayoutGrid,
  AlertCircle,
  Navigation,
  Upload,
  IndianRupee,
  FileCheck,
  LogOut,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DeliveryBoyApp() {
  const { user, logout, token } = useAuth();
  const { socket } = useSocket();
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);

  useEffect(() => {
    fetchInvoices();
    
    const watchId = navigator.geolocation.watchPosition((pos) => {
      setLocation(pos);
      if (isAvailable && socket) {
        socket.emit('tracking', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          status: activeTask ? 'moving' : 'waiting'
        });
        
        // Also send to API for persistence
        fetch('/api/tracking', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            status: activeTask ? 'moving' : 'waiting'
          })
        });
      }
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isAvailable, activeTask, socket, token]);

  const fetchInvoices = async () => {
    const res = await fetch('/api/invoices', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setInvoices(data);
    const active = data.find((inv: any) => inv.status === 'assigned' && inv.assigned_to === user?.id);
    if (active) {
      setActiveTask(active);
      setActiveTab('active');
    }
  };

  const handleAccept = async (id: number) => {
    const res = await fetch(`/api/invoices/${id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchInvoices();
    }
  };

  const handleDeliver = async (id: number, cash: number, cheque: number) => {
    const res = await fetch(`/api/invoices/${id}/deliver`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ cash, cheque, signed_copy_url: 'https://picsum.photos/200/300' })
    });
    if (res.ok) {
      setActiveTask(null);
      setActiveTab('completed');
      fetchInvoices();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col max-w-md mx-auto border-x border-zinc-200 shadow-xl">
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
                  <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-zinc-300'}`}></span>
                  {isAvailable ? 'Available' : 'Offline'}
                </div>
                {isAvailable && (
                  <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                    <Clock size={10} />
                    <span>On Duty: 02:15:45</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        <button 
          onClick={() => setIsAvailable(!isAvailable)}
          className={`p-2 rounded-xl transition-colors ${isAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}
        >
          <Power size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'available' && (
            <motion.div 
              key="available"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-zinc-900">Available Tasks</h3>
                <span className="text-xs text-zinc-500">{invoices.filter(i => i.status === 'pending').length} found</span>
              </div>
              {invoices.filter(i => i.status === 'pending').map((inv) => (
                <div key={inv.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-emerald-600">{inv.invoice_number}</p>
                      <h4 className="font-bold text-zinc-900 mt-1">{inv.hospital_name}</h4>
                    </div>
                    <p className="font-bold text-zinc-900">₹{inv.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>2.4 km</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>15 mins</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAccept(inv.id)}
                    className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Accept Task
                    <ChevronRight size={18} />
                  </button>
                </div>
              ))}
              {invoices.filter(i => i.status === 'pending').length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                    <AlertCircle size={32} />
                  </div>
                  <p className="text-zinc-500 font-medium">No tasks available right now</p>
                  <p className="text-xs text-zinc-400 mt-1">We'll notify you when new tasks arrive</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div 
              key="active"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {activeTask ? (
                <div className="space-y-6">
                  <div className="bg-emerald-500 text-white p-6 rounded-3xl shadow-lg shadow-emerald-200">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Active Delivery</p>
                        <h3 className="text-2xl font-bold mt-1">{activeTask.hospital_name}</h3>
                      </div>
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <Truck size={24} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-emerald-100 text-[10px]">Timer</p>
                        <p className="text-xl font-mono font-bold">12:45:02</p>
                      </div>
                      <div className="h-8 w-px bg-white/20"></div>
                      <div className="space-y-1">
                        <p className="text-emerald-100 text-[10px]">Distance</p>
                        <p className="text-xl font-bold">1.2 km</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-6">
                    <h4 className="font-bold text-zinc-900">Delivery Details</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Destination</p>
                          <p className="text-sm font-bold text-zinc-900">Sector 12, Medical Plaza</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                          <IndianRupee size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Collect Amount</p>
                          <p className="text-sm font-bold text-zinc-900">₹{activeTask.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <button className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm">
                        <Navigation size={18} />
                        Navigate
                      </button>
                      <button className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm">
                        <XCircle size={18} />
                        Cancel Order
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-zinc-900 px-2">Completion Form</h4>
                    <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500">Upload Signed Copy</label>
                        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center justify-center text-zinc-400 gap-2">
                          <Upload size={24} />
                          <span className="text-xs font-medium">Tap to take photo</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500">Cash Received</label>
                          <input type="number" placeholder="0.00" className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500">Cheque Received</label>
                          <input type="number" placeholder="0.00" className="w-full p-3 bg-zinc-50 rounded-xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeliver(activeTask.id, 0, 0)}
                        className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                      >
                        <FileCheck size={20} />
                        Submit Delivery
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                    <Truck size={32} />
                  </div>
                  <p className="text-zinc-500 font-medium">No active task</p>
                  <p className="text-xs text-zinc-400 mt-1">Accept a task from the available list</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'completed' && (
            <motion.div 
              key="completed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-zinc-900 mb-2">Recent History</h3>
              {invoices.filter(i => i.status === 'delivered' && i.assigned_to === user?.id).map((inv) => (
                <div key={inv.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
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
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-zinc-100 p-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('available')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'available' ? 'text-emerald-500' : 'text-zinc-400'}`}
        >
          <LayoutGrid size={20} />
          <span className="text-[10px] font-bold">Available</span>
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'active' ? 'text-emerald-500' : 'text-zinc-400'}`}
        >
          <Truck size={20} />
          <span className="text-[10px] font-bold">Active</span>
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'completed' ? 'text-emerald-500' : 'text-zinc-400'}`}
        >
          <History size={20} />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button 
          onClick={logout}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-zinc-400"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-bold">Logout</span>
        </button>
      </nav>
    </div>
  );
}
