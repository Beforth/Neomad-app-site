import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiStrip from '@/components/KpiStrip';
import { fetchReport } from '@/lib/reportsApi';
import type { ReportDef } from './definitions';
import TravelPath from './TravelPath';

type Preset = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

const iso = (d: Date) => {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
const presetRange = (p: Preset): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();
  if (p === 'today') return { from: iso(from), to: iso(to) };
  if (p === '7d') from.setDate(from.getDate() - 6);
  else if (p === '30d') from.setDate(from.getDate() - 29);
  else if (p === '90d') from.setDate(from.getDate() - 89);
  else return { from: '2020-01-01', to: iso(to) };
  return { from: iso(from), to: iso(to) };
};

function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReportView({ def, token }: { def: ReportDef; token: string }) {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>('30d');
  const [from, setFrom] = useState(() => presetRange('30d').from);
  const [to, setTo] = useState(() => presetRange('30d').to);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [option, setOption] = useState(def.options?.default ?? '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [tick, setTick] = useState(0);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (def.filter === 'range') { p.date_from = from; p.date_to = to; }
    if (def.filter === 'month') p.month = month;
    if (def.options) p[def.options.name] = option;
    return p;
  }, [def, from, to, month, option]);

  const load = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!def.endpoint) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchReport(token, def.endpoint, params)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) { setError(e.message); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [def.endpoint, params, token, tick]);

  useEffect(() => {
    if (!def.live) return;
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [def.live, load]);

  const columns = def.columns ?? [];
  const sourceRows: any[] = useMemo(() => (data && def.rows ? def.rows(data) : []), [data, def]);
  const rows = useMemo(() => {
    if (!sort) return sourceRows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return sourceRows;
    const val = (r: any) => (col.value ? col.value(r) : r[col.key]);
    return [...sourceRows].sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.dir;
    });
  }, [sourceRows, sort, columns]);

  if (def.id === 'path') {
    return (
      <div className="grid gap-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-tight">{def.title}</h2>
          <p className="max-w-2xl text-[13px] text-muted-foreground">{def.description}</p>
        </div>
        <TravelPath />
      </div>
    );
  }

  const exportCsv = () =>
    downloadCsv(def.id, columns.map((c) => c.header), rows.map((r) => columns.map((c) => (c.value ? c.value(r) : r[c.key]) ?? '')));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-tight">{def.title}</h2>
          <p className="max-w-2xl text-[13px] text-muted-foreground">{def.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" data-hotkey-refresh="" aria-label="Refresh" title="Refresh (r)" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download /> Export CSV
          </Button>
        </div>
      </div>

      {(def.filter !== 'none' || def.options) && (
        <div className="flex flex-wrap items-center gap-2">
          {def.filter === 'range' && (
            <>
              <Segmented
                value={preset}
                onValueChange={(v) => {
                  const p = v as Preset;
                  setPreset(p);
                  if (p !== 'custom') { const r = presetRange(p); setFrom(r.from); setTo(r.to); }
                }}
                options={[
                  { value: 'today', label: <>Today</> },
                  { value: '7d', label: <>7 days</> },
                  { value: '30d', label: <>30 days</> },
                  { value: '90d', label: <>90 days</> },
                  { value: 'all', label: <>All time</> },
                  { value: 'custom', label: <>Custom</> },
                ]}
              />
              {preset === 'custom' && (
                <>
                  <Input type="date" className="w-[150px]" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
                  <span className="text-muted-foreground">to</span>
                  <Input type="date" className="w-[150px]" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To" />
                </>
              )}
            </>
          )}
          {def.filter === 'month' && <Input type="month" className="w-[170px]" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />}
          {def.options && (
            <Segmented value={option} onValueChange={setOption} options={def.options.choices.map((c) => ({ value: c.value, label: <>{c.label}</> }))} />
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
      )}

      {data && def.kpis && <KpiStrip items={def.kpis(data)} />}
      {data && def.extra && def.extra(data)}

      {!def.hideTable && (
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => {
                const on = sort?.key === c.key;
                return (
                  <TableHead key={c.key} className={c.num ? 'text-right' : undefined} aria-sort={on ? (sort!.dir === 1 ? 'ascending' : 'descending') : undefined}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() => setSort((s) => (s?.key !== c.key ? { key: c.key, dir: 1 } : s.dir === 1 ? { key: c.key, dir: -1 } : null))}
                    >
                      {c.header}{on ? (sort!.dir === 1 ? ' ↑' : ' ↓') : ''}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground"><Spinner className="mr-2 inline-block" /> Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">{error ? 'Could not load this report.' : `${def.empty ?? 'No data.'}${def.filter === 'range' && preset !== 'all' ? ' Try a longer range, or All time.' : ''}`}</TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => {
                const link = def.rowLink?.(r) ?? null;
                return (
                  <TableRow key={i} className={link ? 'cursor-pointer' : undefined} onClick={link ? () => navigate(link) : undefined}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.num ? 'whitespace-nowrap text-right tabular-nums' : 'max-w-[320px]'}>
                        {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      )}
      {def.note && <p className="text-xs text-muted-foreground">{def.note}</p>}
    </div>
  );
}
