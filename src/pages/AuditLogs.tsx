import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, XCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { getAllAuditLogs } from '../lib/api';
import type { AuditLogEntry } from '../lib/api';
import { Link } from 'react-router-dom';
import { formatDateTimeIST } from '../lib/timeUtils';
import SearchableSelect from '../components/SearchableSelect';

const FIELD_LABELS: Record<string, string> = {
  invoice_number: 'Invoice #',
  hospital_name: 'Hospital',
  amount: 'Amount',
  status: 'Status',
  assigned_to: 'Assignee',
  cash_received: 'Cash Received',
  cheque_received: 'Cheque Received',
  delivery_feedback: 'Delivery Feedback',
  cash_confirmed: 'Cash Confirmed',
  cheque_confirmed: 'Cheque Confirmed',
};

const FIELD_OPTIONS = [
  { value: '', label: 'All Fields' },
  ...Object.entries(FIELD_LABELS).map(([value, label]) => ({ value, label })),
];

export default function AuditLogs() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [fieldFilter, setFieldFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [fieldFilter, searchDebounced]);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const r = await getAllAuditLogs(token, {
        page,
        page_size: pageSize,
        ...(fieldFilter ? { field_name: fieldFilter } : {}),
        ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setEntries(r.items);
      setTotal(r.total);
    } catch (e: any) {
      setError(e.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [token, page, fieldFilter, searchDebounced]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Audit Logs</h1>
          <p className="text-xs text-zinc-500 font-medium">Field-level change history for all invoices</p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
        </div>
      )}

      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search values..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
          />
        </div>
        <SearchableSelect
          value={fieldFilter}
          onChange={setFieldFilter}
          options={FIELD_OPTIONS}
          className="min-w-[150px]"
        />
        {(fieldFilter || searchDebounced) && (
          <button
            onClick={() => { setFieldFilter(''); setSearch(''); }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1"
          >
            <XCircle size={12} /> Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Invoice</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Field</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Old Value</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">New Value</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Changed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading && entries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-zinc-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-zinc-400">No audit logs found</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-[11px] text-zinc-500 whitespace-nowrap">
                      {formatDateTimeIST(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/invoices/${entry.invoice_id}`}
                        className="text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        #{entry.invoice_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 capitalize">
                        {FIELD_LABELS[entry.field_name] || entry.field_name.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500 max-w-[200px] truncate font-mono">
                      {entry.old_value || <span className="text-zinc-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-900 max-w-[200px] truncate font-mono font-semibold">
                      {entry.new_value || <span className="text-zinc-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-600 whitespace-nowrap">
                      {entry.changed_by_name || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-zinc-500">
          Showing <span className="font-bold text-zinc-900">{startRow}</span>–<span className="font-bold text-zinc-900">{endRow}</span> of{' '}
          <span className="font-bold text-zinc-900">{total}</span> entries
          {totalPages > 1 && <span className="ml-2 text-zinc-400">(page {page} of {totalPages})</span>}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} className="text-zinc-600" />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
            aria-label="Next page"
          >
            <ChevronRight size={18} className="text-zinc-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
