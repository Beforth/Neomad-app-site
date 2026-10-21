import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getAttendanceRecords, type AttendanceRecordOut } from '@/lib/hrmsApi';
import { workingDateRange } from '@/lib/hrmsAttendance';
import { formatShiftTimeRange, listShiftCalendar } from '@/lib/hrmsShifts';
import type { DailyShiftAllocation } from '@/lib/api';
import MarkAttendanceDrawer, { type MarkTarget } from './MarkAttendanceDrawer';

export type DayKind =
  | 'present' | 'late' | 'half_day' | 'overtime' | 'absent'
  | 'unmarked' | 'late_penalty' | 'overtime_amount';

export const DAY_KIND_TITLE: Record<DayKind, string> = {
  present: 'Present days',
  late: 'Late days',
  half_day: 'Half days',
  overtime: 'Overtime days',
  absent: 'Absent days',
  unmarked: 'Unmarked working days',
  late_penalty: 'Late penalty',
  overtime_amount: 'Overtime amount',
};

interface Day {
  date: string;
  record: AttendanceRecordOut | null;
}

const STATUS_LABEL: Record<string, string> = {
  present: 'Present', late: 'Late', half_day: 'Half day', overtime: 'Overtime', absent: 'Absent',
};
const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * The days behind one number of the attendance summary. Click a date to
 * change it; the list and the report refresh after each save.
 */
export default function AttendanceDaysDrawer({
  token, userId, name, month, kind, onClose, onChanged,
}: {
  token: string;
  userId: number;
  name: string;
  month: string; // YYYY-MM
  kind: DayKind;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [records, setRecords] = useState<AttendanceRecordOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<MarkTarget | null>(null);
  const [shifts, setShifts] = useState<Record<string, DailyShiftAllocation>>({});

  const load = useCallback(() => {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    setLoading(true);
    setError('');
    getAttendanceRecords(token, { staff_id: userId, from_date: `${month}-01`, to_date: `${month}-${String(last).padStart(2, '0')}` })
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the days.'))
      .finally(() => setLoading(false));
    // The shift is a nice-to-have: the list still works if it cannot be loaded.
    listShiftCalendar(token, `${month}-01`, `${month}-${String(last).padStart(2, '0')}`, userId)
      .then((rows) => setShifts(Object.fromEntries(rows.map((s) => [s.date, s]))))
      .catch(() => setShifts({}));
  }, [token, userId, month]);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !edit) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, edit]);

  const days: Day[] = useMemo(() => {
    // The summary leaves Sundays out, so this list does too.
    const real = records.filter((r) => new Date(`${r.date}T00:00`).getDay() !== 0);
    if (kind === 'unmarked') {
      const [y, m] = month.split('-').map(Number);
      const last = new Date(y, m, 0).getDate();
      const marked = new Set(real.map((r) => r.date));
      return workingDateRange(`${month}-01`, `${month}-${String(last).padStart(2, '0')}`)
        .filter((d) => !marked.has(d))
        .map((date) => ({ date, record: null }));
    }
    const keep = (r: AttendanceRecordOut) =>
      kind === 'late_penalty' ? Number(r.penalty_amount) > 0
        : kind === 'overtime_amount' ? Number(r.overtime_amount) > 0
        : r.status === kind;
    return real.filter(keep).sort((a, b) => a.date.localeCompare(b.date)).map((record) => ({ date: record.date, record }));
  }, [records, kind, month]);

  const penalty = days.reduce((s, d) => s + Number(d.record?.penalty_amount ?? 0), 0);
  const otAmount = days.reduce((s, d) => s + Number(d.record?.overtime_amount ?? 0), 0);

  const open = (d: Day) =>
    setEdit({
      userId, name, date: d.date,
      recordId: d.record?.id ?? null,
      recordStatus: d.record?.status ?? null,
      checkIn: d.record?.check_in ?? null,
      checkOut: d.record?.check_out ?? null,
    });

  const fmtDate = (d: string) =>
    new Date(`${d}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label={DAY_KIND_TITLE[kind]} className="relative flex h-full w-full max-w-lg flex-col bg-card shadow-xl">
        <header className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{DAY_KIND_TITLE[kind]}</h2>
            <p className="text-[13px] text-muted-foreground">
              {name} · {new Date(`${month}-01T00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X /></Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground"><Spinner className="mr-2 inline-block" /> Loading…</p>
          ) : error ? (
            <p role="alert" className="m-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : days.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No days.</p>
          ) : (
            <ul className="divide-y divide-border">
              {days.map((d) => {
                const r = d.record;
                const cal = shifts[d.date];
                const shiftText = r?.shift_start
                  ? formatShiftTimeRange(r.shift_start, r.shift_end)
                  : cal ? `${cal.shift_type_name} ${formatShiftTimeRange(cal.start_time, cal.end_time)}`.trim() : '';
                return (
                  <li key={d.date}>
                    <button type="button" onClick={() => open(d)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/60">
                      <div>
                        <p className="text-[13px] font-medium">{fmtDate(d.date)}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {r ? `${r.check_in || '—'} to ${r.check_out || '—'} · ${r.hours_worked || 0} h` : 'Not marked'}
                          {r && r.overtime > 0 ? ` · OT ${r.overtime} h` : ''}
                        </p>
                        <p className="text-[12px] text-muted-foreground">Shift: {shiftText || 'none assigned'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-medium">{r ? STATUS_LABEL[r.status] ?? r.status : 'Not marked'}</p>
                        {kind === 'late_penalty' && <p className="text-[12px] text-muted-foreground">{money(Number(r?.penalty_amount ?? 0))}</p>}
                        {kind === 'overtime_amount' && <p className="text-[12px] text-muted-foreground">{money(Number(r?.overtime_amount ?? 0))}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-3 text-[13px]">
          <span className="text-muted-foreground">{days.length} day{days.length === 1 ? '' : 's'}</span>
          {kind === 'late_penalty' && <span className="font-medium">Total {money(penalty)}</span>}
          {kind === 'overtime_amount' && <span className="font-medium">Total {money(otAmount)}</span>}
          {kind !== 'late_penalty' && kind !== 'overtime_amount' && <span className="text-muted-foreground">Click a date to change it</span>}
        </footer>
      </aside>
      {edit && (
        <MarkAttendanceDrawer
          target={edit}
          token={token}
          onClose={() => setEdit(null)}
          onSaved={() => { load(); onChanged(); }}
        />
      )}
    </div>
  );
}
