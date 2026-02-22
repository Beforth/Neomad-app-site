import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  UserPlus, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';

import { mockApi } from '../lib/mockApi';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    mockApi.getInvoices(user).then(data => {
      setInvoices(data);
      setLoading(false);
    });
  }, [user]);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Invoices</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage and track all delivery invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-white border border-zinc-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all w-48 shadow-sm"
            />
          </div>
          <button className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm">
            <Download size={14} />
            Export
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Invoice #</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hospital</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {invoices.map((invoice, i) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-zinc-900 tracking-tight">{invoice.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-zinc-900 tracking-tight">{invoice.hospital_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-medium text-zinc-400">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <div className="p-1.5 rounded-md text-zinc-300 group-hover:text-zinc-900 group-hover:bg-zinc-100 transition-all">
                        <Eye size={14} />
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {invoices.map((invoice, i) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="p-4 space-y-3 active:bg-zinc-50"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-zinc-400">{invoice.invoice_number}</p>
                  <p className="font-bold text-zinc-900">{invoice.hospital_name}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-sm font-bold text-zinc-900">₹{invoice.amount.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Showing <span className="font-bold text-zinc-900">{invoices.length}</span> invoices
        </p>
        <div className="flex items-center gap-2">
          <button className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
            <ChevronLeft size={18} className="text-zinc-400" />
          </button>
          <button className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
            <ChevronRight size={18} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">Invoice Details</h2>
                <p className="text-sm text-zinc-500">Invoice: {selectedInvoice.invoice_number}</p>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-zinc-200"
              >
                <XCircle size={24} className="text-zinc-400" />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Hospital Name</label>
                  <p className="text-lg font-bold text-zinc-900 mt-1">{selectedInvoice.hospital_name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Durations</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Travel</p>
                      <p className="text-sm font-bold text-zinc-900">18 mins</p>
                    </div>
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Waiting</p>
                      <p className="text-sm font-bold text-amber-600">6 mins</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Amount</label>
                  <p className="text-xl font-bold text-zinc-900 mt-1">₹{selectedInvoice.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</label>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold capitalize ${getStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Timeline</label>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-sm text-zinc-600">Created: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                    </div>
                    {selectedInvoice.delivered_at && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-sm text-zinc-600">Delivered: {new Date(selectedInvoice.delivered_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedInvoice.status === 'pending' && user?.role !== 'delivery_boy' && (
                  <div className="pt-4">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Assign Delivery Boy</label>
                    <div className="mt-4 flex gap-2">
                      <select className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                        <option>Select delivery boy...</option>
                        <option>Delivery Boy 1</option>
                        <option>Delivery Boy 2</option>
                      </select>
                      <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              {user?.role === 'admin' && selectedInvoice.status === 'delivered' && (
                <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                  Confirm Payment
                </button>
              )}
              <button className="px-6 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-colors shadow-sm">
                Download PDF
              </button>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
