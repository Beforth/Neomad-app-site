import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, Eye, XCircle, ChevronLeft, ChevronRight,
  Download, UserPlus, RefreshCw, Clock, CheckCircle2,
  MapPin, FileImage, IndianRupee, Filter
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
        <button className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto">
          <Download size={14} />Export
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input type="text" placeholder="Search invoice / hospital..." value={search} onChange={e => setSearch(e.target.value)}
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
          {MOCK_DELIVERY_BOYS.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
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
                {['Invoice #', 'Hospital', 'Amount', 'Status', 'Assigned To', 'Travel', 'Waiting', 'Date', 'Actions'].map(h => (
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
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedInvoice(invoice)}>
                    <td className="px-4 py-3"><span className="text-xs font-bold text-zinc-900">{invoice.invoice_number}</span></td>
                    <td className="px-4 py-3"><p className="text-xs font-semibold text-zinc-900">{invoice.hospital_name}</p></td>
                    <td className="px-4 py-3"><p className="text-xs font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status]}`}>{invoice.status}</span>
                    </td>
                    <td className="px-4 py-3"><p className="text-xs text-zinc-600">{boy?.name || <span className="text-zinc-300">—</span>}</p></td>
                    <td className="px-4 py-3"><p className="text-xs text-zinc-500">{dur?.travel || '—'}</p></td>
                    <td className="px-4 py-3"><p className="text-xs text-amber-600">{dur?.waiting || '—'}</p></td>
                    <td className="px-4 py-3 text-[10px] font-medium text-zinc-400">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md" title="View">
                          <Eye size={13} />
                        </button>
                        {invoice.status !== 'delivered' && invoice.status !== 'cancelled' && (
                          <button onClick={() => setAssigning(invoice.id)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Assign">
                            <UserPlus size={13} />
                          </button>
                        )}
                        {(invoice.status === 'pending' || invoice.status === 'assigned') && (
                          <button onClick={() => handleCancel(invoice.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Cancel">
                            <XCircle size={13} />
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
                      {boy && <p className="text-xs text-zinc-500">👤 {boy.name}</p>}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_COLORS[invoice.status]}`}>{invoice.status}</span>
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
              <h3 className="font-bold text-zinc-900">Assign / Reassign Delivery Boy</h3>
              <select value={assignTarget} onChange={e => setAssignTarget(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="">Select delivery boy...</option>
                {MOCK_DELIVERY_BOYS.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
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
          <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Invoice Detail</h2>
                  <p className="text-sm text-zinc-500">{selectedInvoice.invoice_number}</p>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-zinc-200">
                  <XCircle size={22} className="text-zinc-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* PDF Preview placeholder */}
                <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <FileImage size={32} />
                  <p className="text-sm font-medium">Invoice PDF Preview</p>
                  <p className="text-[11px]">PDF fetched from Gmail attachment</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Details */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Hospital</p>
                      <p className="font-bold text-zinc-900">{selectedInvoice.hospital_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Amount</p>
                      <p className="text-xl font-bold text-zinc-900">₹{selectedInvoice.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold capitalize ${STATUS_COLORS[selectedInvoice.status]}`}>
                        {selectedInvoice.status}
                      </span>
                    </div>

                    {/* Durations */}
                    {selectedInvoice.status === 'delivered' && (
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Durations</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[['Travel', '18 mins', 'text-blue-600'], ['Waiting', '6 mins', 'text-amber-600'], ['Total', '24 mins', 'text-zinc-900']].map(([l, v, c]) => (
                            <div key={l} className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-center">
                              <p className="text-[9px] text-zinc-400 font-bold uppercase">{l}</p>
                              <p className={`text-sm font-bold mt-0.5 ${c}`}>{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signed copy */}
                    {selectedInvoice.signed_copy_url && (
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Signed Copy</p>
                        <div className="w-full h-24 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200">
                          <img src={selectedInvoice.signed_copy_url} alt="Signed copy" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Timeline + Cash */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Timeline</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-zinc-700">Created</p>
                            <p className="text-[11px] text-zinc-500">{new Date(selectedInvoice.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        {selectedInvoice.accepted_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-zinc-700">Accepted by delivery boy</p>
                              <p className="text-[11px] text-zinc-500">{new Date(selectedInvoice.accepted_at).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                        {selectedInvoice.delivered_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-zinc-700">Delivered</p>
                              <p className="text-[11px] text-zinc-500">{new Date(selectedInvoice.delivered_at).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cash / Cheque */}
                    {(selectedInvoice.cash_received !== undefined || selectedInvoice.cheque_received !== undefined) && (
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Payment</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
                            <span className="text-xs text-zinc-600 flex items-center gap-1.5"><IndianRupee size={12} />Cash</span>
                            <span className="text-xs font-bold text-zinc-900">₹{(selectedInvoice.cash_received || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
                            <span className="text-xs text-zinc-600 flex items-center gap-1.5"><IndianRupee size={12} />Cheque</span>
                            <span className="text-xs font-bold text-zinc-900">₹{(selectedInvoice.cheque_received || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex flex-wrap justify-end gap-3 flex-shrink-0">
                {user?.role === 'admin' && selectedInvoice.status === 'delivered' && (
                  <>
                    <button className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-colors flex items-center gap-2">
                      <CheckCircle2 size={15} />Mark Cash Received
                    </button>
                    <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-200 transition-colors flex items-center gap-2">
                      <CheckCircle2 size={15} />Mark Cheque Received
                    </button>
                  </>
                )}
                {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'assigned') && user?.role !== 'delivery_boy' && (
                  <>
                    <button onClick={() => { setAssigning(selectedInvoice.id); setSelectedInvoice(null); }}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 flex items-center gap-2">
                      <UserPlus size={14} />
                      {selectedInvoice.status === 'assigned' ? 'Reassign' : 'Assign'}
                    </button>
                    <button onClick={() => handleCancel(selectedInvoice.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 flex items-center gap-2">
                      <XCircle size={14} />Cancel
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedInvoice(null)}
                  className="px-5 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
