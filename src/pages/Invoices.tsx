import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, Eye, XCircle, ChevronLeft, ChevronRight,
  Download, UserPlus, RefreshCw, Clock, CheckCircle2,
  MapPin, FileImage, IndianRupee, Filter, Plus, ClipboardCheck,
  Package, Building, Hash, Banknote, Users, FileText, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockApi } from '../lib/mockApi';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const MOCK_DELIVERY_BOYS = [
  { id: 2, name: 'Sagar Wagh' },
  { id: 3, name: 'Rahul Patil' },
  { id: 4, name: 'Amit Shinde' },
];

// Fake durations for demo
function fakeDuration(inv: any) {
  if (inv.status !== 'delivered') return null;
  return { travel: '18 mins', waiting: '6 mins', total: '24 mins' };
}

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [boyFilter, setBoyFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState('');

  const [previewImage, setPreviewImage] = useState<{ url: string, title: string } | null>(null);

  // Combine delivery boys and managers for assignment
  const [availableAssignees, setAvailableAssignees] = useState<any[]>([]);

  useEffect(() => {
    mockApi.getUsers().then(users => {
      const filtered = users.filter((u: any) => u.role === 'delivery_boy' || u.role === 'manager');
      setAvailableAssignees(filtered);
    });
  }, []);

  const fetchInvoices = () => {
    mockApi.getInvoices(user).then(data => { setInvoices(data); setLoading(false); });
  };

  useEffect(() => { fetchInvoices(); }, [user]);

  const handleCancel = async (id: number) => {
    const invs = JSON.parse(localStorage.getItem('mock_invoices') || '[]');
    const inv = invs.find((i: any) => i.id === id);
    if (inv) { inv.status = 'cancelled'; localStorage.setItem('mock_invoices', JSON.stringify(invs)); }
    fetchInvoices();
    setSelectedInvoice(null);
  };

  const handleAssign = async (id: number) => {
    if (!assignTarget) return;
    await mockApi.assignInvoice(id, Number(assignTarget));
    fetchInvoices();
    setAssigning(null);
    setAssignTarget('');
    if (selectedInvoice?.id === id) setSelectedInvoice(null);
  };


  const filtered = invoices.filter(inv => {
    const matchSearch = search === '' || inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || inv.hospital_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchBoy = boyFilter === 'all' || String(inv.assigned_to) === boyFilter;
    return matchSearch && matchStatus && matchBoy;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Invoices</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage and track all delivery invoices</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm">
            <Download size={14} />Export
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input type="text" placeholder="Search tasks / entities..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={boyFilter} onChange={e => setBoyFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer">
          <option value="all">All Delivery Boys</option>
          {availableAssignees.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none cursor-pointer" />
        {(search || statusFilter !== 'all' || boyFilter !== 'all' || dateFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setBoyFilter('all'); setDateFilter(''); }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1">
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                {['Invoice / ID', 'Task / Entity', 'Amount', 'Status', 'Signed Copy', 'Assigned To', 'Travel', 'Waiting', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-xs text-zinc-400">Loading invoices...</td></tr>
              ) : filtered.map((invoice, i) => {
                const dur = fakeDuration(invoice);
                const boy = MOCK_DELIVERY_BOYS.find(b => b.id === invoice.assigned_to);
                return (
                  <motion.tr key={invoice.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                    <td className="px-4 py-3"><span className="text-xs font-bold text-zinc-900">{invoice.invoice_number}</span></td>
                    <td className="px-4 py-3"><p className="text-xs font-semibold text-zinc-900">{invoice.hospital_name}</p></td>
                    <td className="px-4 py-3"><p className="text-xs font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status]}`}>{invoice.status}</span>
                    </td>                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {invoice.signed_copy_url ? (
                          <div className="relative group w-10 h-10 rounded-lg overflow-hidden border border-emerald-100 shadow-sm cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: invoice.signed_copy_url!, title: `Signed Copy — ${invoice.invoice_number}` }); }}>
                            <img src={invoice.signed_copy_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Signed Copy" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={12} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-300">
                            <ClipboardCheck size={16} />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3"><p className="text-xs text-zinc-600">{availableAssignees.find(b => b.id === invoice.assigned_to)?.name || <span className="text-zinc-300">—</span>}</p></td>
                    <td className="px-4 py-3"><p className="text-xs text-zinc-500">{dur?.travel || '—'}</p></td>
                    <td className="px-4 py-3"><p className="text-xs text-amber-600">{dur?.waiting || '—'}</p></td>
                    <td className="px-4 py-3 text-[10px] font-medium text-zinc-400">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Download Invoice">
                          <Download size={14} />
                        </button>
                        {invoice.status === 'delivered' && user?.role === 'admin' && (
                          <button onClick={() => {
                            if (invoice.cash_received > 0) mockApi.markCashConfirmed(invoice.id, 'cash');
                            if (invoice.cheque_received > 0) mockApi.markCashConfirmed(invoice.id, 'cheque');
                            fetchInvoices();
                          }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Confirm Payment">
                            <Banknote size={14} />
                          </button>
                        )}
                        {invoice.status !== 'delivered' && invoice.status !== 'cancelled' && (
                          <button onClick={() => setAssigning(invoice.id)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Assign">
                            <UserPlus size={14} />
                          </button>
                        )}
                        {(invoice.status === 'pending' || invoice.status === 'assigned') && (
                          <button onClick={() => handleCancel(invoice.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {loading ? <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div>
            : filtered.map((invoice, i) => {
              const boy = MOCK_DELIVERY_BOYS.find(b => b.id === invoice.assigned_to);
              return (
                <motion.div key={invoice.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="p-4 space-y-2 active:bg-zinc-50" onClick={() => setSelectedInvoice(invoice)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-zinc-400">{invoice.invoice_number}</p>
                      <p className="font-bold text-zinc-900">{invoice.hospital_name}</p>
                      {boy && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Users size={12} /> {boy.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status]}`}>{invoice.status}</span>
                      {invoice.signed_copy_url && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
                          <ClipboardCheck size={10} /> Signed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Showing <span className="font-bold text-zinc-900">{filtered.length}</span> of {invoices.length} invoices</p>
        <div className="flex items-center gap-2">
          <button className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50"><ChevronLeft size={18} className="text-zinc-400" /></button>
          <button className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50"><ChevronRight size={18} className="text-zinc-400" /></button>
        </div>
      </div>

      {/* Assign Inline Panel */}
      <AnimatePresence>
        {assigning !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold text-zinc-900">Assign / Reassign Task</h3>
              <select value={assignTarget} onChange={e => setAssignTarget(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="">Select Delivery Boy or Manager...</option>
                {availableAssignees.map(b => <option key={b.id} value={String(b.id)}>{b.name} ({b.role.replace('_', ' ')})</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => handleAssign(assigning!)} disabled={!assignTarget}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-40">
                  Confirm Assign
                </button>
                <button onClick={() => { setAssigning(null); setAssignTarget(''); }}
                  className="px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] border border-zinc-100 flex flex-col">
              
              {/* Premium Header */}
              <div className="relative p-8 bg-zinc-900 text-white overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-6 z-10">
                  <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
                    <XCircle size={28} />
                  </button>
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <FileText size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Medical Invoice</p>
                        <h2 className="text-3xl font-black tracking-tighter">{selectedInvoice.invoice_number}</h2>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                        <Building size={14} className="text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-300">{selectedInvoice.hospital_name}</span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${STATUS_COLORS[selectedInvoice.status]} border border-current opacity-90`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {selectedInvoice.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pb-1 text-right hidden md:block">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Gross Amount</p>
                    <p className="text-4xl font-black text-white tracking-tighter flex items-center justify-end gap-1">
                      <IndianRupee size={24} className="text-emerald-500" />
                      {selectedInvoice.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  
                  {/* Left Column: Essential Details (8/12) */}
                  <div className="lg:col-span-7 space-y-10">
                    
                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Travel time</p>
                        <p className="text-lg font-black text-zinc-900 tracking-tight">18 min</p>
                      </div>
                      <div className="bg-amber-50/30 p-4 rounded-3xl border border-amber-100/50">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Clinic wait</p>
                        <p className="text-lg font-black text-amber-600 tracking-tight">6 min</p>
                      </div>
                      <div className="bg-emerald-50/30 p-4 rounded-3xl border border-emerald-100/50">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total cycle</p>
                        <p className="text-lg font-black text-emerald-600 tracking-tight">24 min</p>
                      </div>
                    </div>

                    {/* Signed Copy Section */}
                    {selectedInvoice.status === 'delivered' && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <FileImage size={14} /> Official Signed Document
                          </label>
                          <button onClick={() => setPreviewImage({ url: selectedInvoice.signed_copy_url || 'https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=800', title: `Full Screen — ${selectedInvoice.invoice_number}`})}
                                  className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest">
                            View Fullscreen
                          </button>
                        </div>
                        <div className="relative group rounded-4xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-zinc-200 aspect-4/3 bg-zinc-100">
                           <img 
                            src={selectedInvoice.signed_copy_url || 'https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=800'} 
                            alt="Signed Copy" 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                            <p className="text-white text-xs font-bold flex items-center gap-2">
                              <ClipboardCheck size={14} /> Proof of delivery captured via Neomed App
                            </p>
                          </div>
                        </div>
                      </section>
                    )}

                    {!selectedInvoice.signed_copy_url && selectedInvoice.status === 'delivered' && (
                      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                          <AlertCircle size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-amber-900 uppercase">Document Missing</p>
                          <p className="text-xs text-amber-600 mt-1 font-medium">The delivery boy has not uploaded the signed copy yet. You can attach a mock for demo.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Timeline & Payment (5/12) */}
                  <div className="lg:col-span-5 space-y-10">
                    
                    {/* Payment Summary */}
                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Banknote size={14} /> Payment breakdown
                      </label>
                      <div className="bg-zinc-50 rounded-4xl p-6 border border-zinc-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-zinc-500 font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-300" /> Cash Received</span>
                          <span className="text-lg font-black text-zinc-900">₹{(selectedInvoice.cash_received || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-zinc-500 font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-300" /> Cheque</span>
                          <span className="text-lg font-black text-zinc-900">₹{(selectedInvoice.cheque_received || 0).toLocaleString()}</span>
                        </div>
                        <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
                          <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Grand Total</span>
                          <span className="text-2xl font-black text-emerald-600">₹{selectedInvoice.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </section>

                    {/* Performance Timeline */}
                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} /> Full Logistics Timeline
                      </label>
                      <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                        <div className="relative">
                          <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-900 border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                          <p className="text-xs font-black text-zinc-900 uppercase">Order Created</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.created_at).toLocaleString()}</p>
                        </div>
                        {selectedInvoice.accepted_at ? (
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white ring-1 ring-emerald-100 shadow-sm" />
                            <p className="text-xs font-black text-zinc-900 uppercase">Accepted by Logistics</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.accepted_at).toLocaleString()}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-lg border border-emerald-100">
                              {availableAssignees.find(a => a.id === selectedInvoice.assigned_to)?.name}
                            </p>
                          </div>
                        ) : (
                           <div className="relative opacity-40">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-zinc-200 border-4 border-white ring-1 ring-zinc-100 shadow-sm" />
                            <p className="text-xs font-black text-zinc-400 uppercase">Pending Assignment</p>
                          </div>
                        )}
                        {selectedInvoice.delivered_at && (
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-black border-4 border-white ring-1 ring-zinc-200 shadow-sm" />
                            <p className="text-xs font-black text-zinc-900 uppercase">Successfully Delivered</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{new Date(selectedInvoice.delivered_at).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex flex-wrap gap-4 shrink-0 overflow-x-auto no-scrollbar">
                {user?.role === 'admin' && selectedInvoice.status === 'delivered' && (
                  <div className="flex gap-3">
                    {!selectedInvoice.signed_copy_url && (
                      <button onClick={() => {
                          const mockUrl = `https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=400`;
                          mockApi.deliverInvoice(selectedInvoice.id, { ...selectedInvoice, signed_copy_url: mockUrl });
                          setSelectedInvoice({ ...selectedInvoice, signed_copy_url: mockUrl });
                          fetchInvoices();
                        }}
                        className="px-6 py-3 bg-zinc-900 text-white rounded-[1.25rem] font-black text-sm hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 flex items-center gap-2">
                        <FileImage size={18} /> Attach Mock Doc
                      </button>
                    )}
                    <button className="px-6 py-3 bg-emerald-500 text-white rounded-[1.25rem] font-black text-sm hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/10 flex items-center gap-2">
                      <CheckCircle2 size={18} /> Confirm Payment
                    </button>
                  </div>
                )}
                
                <div className="flex-1" />
                
                <div className="flex gap-3">
                  {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'assigned') && user?.role !== 'delivery_boy' && (
                    <>
                      <button onClick={() => { setAssigning(selectedInvoice.id); setSelectedInvoice(null); }}
                        className="px-6 py-3 bg-blue-100 text-blue-700 rounded-[1.25rem] font-black text-sm hover:bg-blue-200 transition-all flex items-center gap-2">
                        <UserPlus size={18} /> {selectedInvoice.status === 'assigned' ? 'Reassign' : 'Fulfill'}
                      </button>
                      <button onClick={() => handleCancel(selectedInvoice.id)}
                        className="px-6 py-3 bg-red-100 text-red-600 rounded-[1.25rem] font-black text-sm hover:bg-red-200 transition-all flex items-center gap-2">
                        <XCircle size={18} /> Void
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedInvoice(null)}
                    className="px-8 py-3 bg-zinc-100 text-zinc-600 rounded-[1.25rem] font-black text-sm hover:bg-zinc-200 transition-all">
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Media Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md flex items-center justify-center z-60 p-4 md:p-12">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center">
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setPreviewImage(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                  <XCircle size={32} />
                </button>
              </div>
              <div className="bg-white p-2 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh]">
                <img src={previewImage.url} alt={previewImage.title} className="w-full h-full object-contain" />
              </div>
              <p className="text-white font-bold mt-6 text-xl">{previewImage.title}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
