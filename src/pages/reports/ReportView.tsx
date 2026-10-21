import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiStrip from '@/components/KpiStrip';
import SearchableSelect from '@/components/SearchableSelect';
import { fetchReport } from '@/lib/reportsApi';
import { listDepartments, type DepartmentOut } from '@/lib/hrmsStaff';
import type { ReportColumn, ReportDef, ReportPreset, ReportQuery } from './definitions';
import TravelPath from './TravelPath';
import MarkAttendanceDrawer, { type MarkTarget } from '../hrms/MarkAttendanceDrawer';
import AttendanceDaysDrawer, { type DayKind } from '../hrms/AttendanceDaysDrawer';

const DRILL_COLUMNS: Record<string, DayKind> = {
  'Present': 'present', 'Late': 'late', 'Half Day': 'half_day', 'Overtime': 'overtime',
  'Absent': 'absent', 'Unmarked Working Days': 'unmarked', 'Late Penalty': 'late_penalty',
  'Overtime Amount': 'overtime_amount',
};

type Preset = ReportPreset;

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
  const [day, setDay] = useState(() => iso(new Date()));
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [sheet, setSheet] = useState(0);
  const [excelBusy, setExcelBusy] = useState(false);
  const [option, setOption] = useState(def.options?.default ?? '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [tick, setTick] = useState(0);
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(null);
  const [drill, setDrill] = useState<{ userId: number; name: string; month: string; kind: DayKind } | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (def.filter === 'range') { p.date_from = from; p.date_to = to; }
    if (def.filter === 'month') p.month = month;
    if (def.options) p[def.options.name] = option;
    return p;
  }, [def, from, to, month, option]);

  const query = useMemo<ReportQuery>(
    () => ({ from, to, month, day, department: department ? Number(department) : undefined }),
    [from, to, month, day, department],
  );

  const load = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!def.department) return;
    listDepartments(token)
      .then((d) => setDepartments(Array.isArray(d) ? d : d.items))
      .catch(() => setDepartments([]));
  }, [def.department, token]);

  useEffect(() => {
    if (!def.endpoint && !def.fetch) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    (def.fetch ? def.fetch(token, query) : fetchReport(token, def.endpoint!, params))
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) { setError(e.message); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [def.endpoint, def.fetch, params, query, token, tick]);

  useEffect(() => {
    if (!def.live) return;
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [def.live, load]);

  // Reports built from spreadsheets send their own columns, one table per sheet.
  const tables: { sheet: string; columns: string[]; rows: any[][] }[] = useMemo(
    () => (def.sheets && data ? data.tables ?? [] : []),
    [def.sheets, data],
  );
  const table = tables[Math.min(sheet, tables.length - 1)];
  const columns: ReportColumn[] = useMemo(() => {
    if (!def.sheets) return def.columns ?? [];
    if (!table) return [];
    return table.columns.map((header, i) => {
      const num = table.rows.length > 0 && table.rows.every((r) => r[i] === null || r[i] === '' || typeof r[i] === 'number');
      return {
        key: String(i),
        header,
        num,
        value: (r: any[]) => r[i] ?? '',
        render: (r: any[]) => (r[i] === null || r[i] === undefined || r[i] === '' ? '—' : num ? Number(r[i]).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(r[i])),
      };
    });
  }, [def, table]);
  const sourceRows: any[] = useMemo(
    () => {
      if (!def.sheets) return data && def.rows ? def.rows(data) : [];
      const meta: any[] | undefined = (table as any)?.meta;
      // Row identity travels with each row so it survives sorting.
      return (table?.rows ?? []).map((r, i) => (meta ? Object.assign([...r], { meta: meta[i] }) : r));
    },
    [data, def, table],
  );
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

  const downloadExcel = async () => {
    if (!def.excel) return;
    setExcelBusy(true);
    setError('');
    try {
      await def.excel(token, query);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setExcelBusy(false);
    }
  };

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
          {def.excel && (
            <Button variant="outline" size="sm" onClick={downloadExcel} disabled={excelBusy}>
              <FileSpreadsheet /> {excelBusy ? 'Preparing…' : 'Download Excel'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download /> Export CSV
          </Button>
        </div>
      </div>

      {(def.filter !== 'none' || def.options || def.department) && (
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
                options={(
                  [
                    { value: 'today', label: <>Today</> },
                    { value: '7d', label: <>7 days</> },
                    { value: '30d', label: <>30 days</> },
                    { value: '90d', label: <>90 days</> },
                    { value: 'all', label: <>All time</> },
                    { value: 'custom', label: <>Custom</> },
                  ] as { value: Preset; label: ReactNode }[]
                ).filter((o) => !def.presets || def.presets.includes(o.value))}
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
          {def.filter === 'date' && <Input type="date" className="w-[170px]" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Date" />}
          {def.department && (
            <SearchableSelect
              className="w-[190px]"
              value={department}
              onChange={setDepartment}
              placeholder="All departments"
              options={[{ value: '', label: 'All departments' }, ...departments.map((d) => ({ value: String(d.id), label: d.name }))]}
            />
          )}
          {tables.length > 1 && (
            <Segmented value={String(Math.min(sheet, tables.length - 1))} onValueChange={(v) => setSheet(Number(v))} options={tables.map((t, i) => ({ value: String(i), label: <>{t.sheet}</> }))} />
          )}
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
      <div className="overflow-x-auto rounded-xl border bg-card">
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
                    {columns.map((c) => {
                      const m = def.markAttendance && c.header === 'Status' ? (r as any).meta : null;
                      const dk = def.drillAttendance && (r as any).meta ? DRILL_COLUMNS[c.header] : undefined;
                      return (
                        <TableCell key={c.key} className={c.num ? 'whitespace-nowrap text-right tabular-nums' : 'max-w-[320px]'}>
                          {m ? (
                            <button
                              type="button"
                              title="Mark attendance"
                              className="rounded-md px-1.5 py-0.5 -mx-1.5 text-left font-medium text-primary underline-offset-2 hover:bg-primary/10 hover:underline"
                              onClick={() => setMarkTarget({
                                userId: m.user_id, name: String(r[columns.findIndex((x) => x.header === 'Full Name')] ?? ''),
                                date: m.date, recordId: m.record_id, recordStatus: m.record_status,
                                checkIn: m.check_in, checkOut: m.check_out,
                              })}
                            >
                              {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                            </button>
                          ) : dk ? (
                            <button
                              type="button"
                              title="See the days"
                              className="rounded-md px-1.5 py-0.5 -mx-1.5 font-medium text-primary tabular-nums underline-offset-2 hover:bg-primary/10 hover:underline"
                              onClick={() => setDrill({
                                userId: (r as any).meta.user_id, month: (r as any).meta.month, kind: dk,
                                name: String(r[columns.findIndex((x) => x.header === 'Full Name')] ?? ''),
                              })}
                            >
                              {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                            </button>
                          ) : (c.render ? c.render(r) : String(r[c.key] ?? '—'))}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      )}
      {def.note && <p className="text-xs text-muted-foreground">{def.note}</p>}
      {drill && <AttendanceDaysDrawer token={token} {...drill} onClose={() => setDrill(null)} onChanged={load} />}
      {markTarget && <MarkAttendanceDrawer target={markTarget} token={token} onClose={() => setMarkTarget(null)} onSaved={load} />}
    </div>
  );
}
