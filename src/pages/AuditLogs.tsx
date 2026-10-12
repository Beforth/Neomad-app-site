import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, XCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { getAllAuditLogs } from '../lib/api';
import type { AuditLogEntry } from '../lib/api';
import { Link } from 'react-router-dom';
import { formatDateTimeIST } from '../lib/timeUtils';
import SearchableSelect from '../components/SearchableSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';

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
      <PageHeader title="Audit Logs" description="Field-level change history for all invoices" actions={<>
<Button variant="outline" size="sm"
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
</>} />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-2 rounded-lg flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search values..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
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
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1"
          >
            <XCircle size={12} /> Clear
          </button>
        )}
      </div>

      <Card className="overflow-hidden" >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="uppercase">Time</TableHead>
                <TableHead className="uppercase">Invoice</TableHead>
                <TableHead className="uppercase">Field</TableHead>
                <TableHead className="uppercase">Old Value</TableHead>
                <TableHead className="uppercase">New Value</TableHead>
                <TableHead className="uppercase">Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && entries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground/70">Loading...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground/70">No audit logs found</TableCell></TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} className="">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTimeIST(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/invoices/${entry.invoice_id}`}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        #{entry.invoice_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize" >
                        {FIELD_LABELS[entry.field_name] || entry.field_name.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate font-mono">
                      {entry.old_value || <span className="text-muted-foreground/50 italic">—</span>}
                    </TableCell>
                    <TableCell className="text-foreground max-w-[200px] truncate font-mono font-semibold">
                      {entry.new_value || <span className="text-muted-foreground/50 italic">—</span>}
                    </TableCell>
                    <TableCell className="text-foreground/70 whitespace-nowrap">
                      {entry.changed_by_name || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{startRow}</span>–<span className="font-semibold text-foreground">{endRow}</span> of{' '}
          <span className="font-semibold text-foreground">{total}</span> entries
          {totalPages > 1 && <span className="ml-2 text-muted-foreground/70">(page {page} of {totalPages})</span>}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            
            aria-label="Previous page"
          >
            <ChevronLeft size={18} className="text-foreground/70" />
          </Button>
          <Button variant="outline" size="icon-sm"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            
            aria-label="Next page"
          >
            <ChevronRight size={18} className="text-foreground/70" />
          </Button>
        </div>
      </div>
    </div>
  );
}
