import type { ReactNode } from 'react';
import type { KpiItem } from '@/components/KpiStrip';
import BarList from '@/components/BarList';

/** Which controls a report has above its table. */
export type ReportFilter = 'range' | 'month' | 'none';

export interface ReportColumn {
  key: string;
  header: string;
  /** Right-aligned number column; also sorts numerically. */
  num?: boolean;
  /** Cell content. Default: the raw value. */
  render?: (row: any) => ReactNode;
  /** Plain-text value for CSV and sorting. Default: row[key]. */
  value?: (row: any) => string | number;
}

export interface ReportDef {
  id: string;
  group: 'Money' | 'Deliveries' | 'Riders' | 'People';
  title: string;
  /** One sentence: what question this answers. */
  description: string;
  filter: ReportFilter;
  /** Re-fetch every minute (queues and live lists). */
  live?: boolean;
  endpoint?: string;
  /** Extra controls (for example Day / Month / Hospital). */
  options?: { name: string; label: string; choices: { value: string; label: string }[]; default: string };
  kpis?: (d: any) => KpiItem[];
  columns?: ReportColumn[];
  rows?: (d: any) => any[];
  /** Where Enter on a row goes. */
  rowLink?: (row: any) => string | null;
  /** Small note under the table. */
  note?: string;
  /** Content between the headline numbers and the table (charts). */
  extra?: (d: any) => ReactNode;
  /** Show only the numbers and extra content. */
  hideTable?: boolean;
  /** Text shown when the list is empty. */
  empty?: string;
}

export const inr = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const mins = (m: number | null | undefined) => {
  if (m === null || m === undefined) return '—';
  const v = Math.round(m);
  if (v < 60) return `${v}m`;
  const h = Math.floor(v / 60);
  if (h < 48) return `${h}h ${v % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const day = (iso?: string | null) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export const REPORTS: ReportDef[] = [
  {
    id: 'collections',
    group: 'Money',
    title: 'Collections',
    description: 'Cash and cheques riders collected, per rider per day, and what nobody has confirmed yet.',
    filter: 'range',
    endpoint: 'collections',
    kpis: (d) => [
      { label: 'Invoices delivered', value: d.summary.invoices },
      { label: 'Cash collected', value: inr(d.summary.cash) },
      { label: 'Cheques collected', value: inr(d.summary.cheque) },
      { label: 'Not confirmed yet', value: inr(d.summary.cash_unconfirmed + d.summary.cheque_unconfirmed), tone: d.summary.cash_unconfirmed + d.summary.cheque_unconfirmed > 0 ? 'warning' : 'default' },
    ],
    rows: (d) => d.rows,
    columns: [
      { key: 'day', header: 'Day', render: (r) => day(r.day), value: (r) => r.day ?? '' },
      { key: 'rider', header: 'Rider' },
      { key: 'invoices', header: 'Invoices', num: true },
      { key: 'cash', header: 'Cash', num: true, render: (r) => inr(r.cash) },
      { key: 'cheque', header: 'Cheque', num: true, render: (r) => inr(r.cheque) },
      { key: 'unconfirmed', header: 'Not confirmed', num: true, value: (r) => r.cash_unconfirmed + r.cheque_unconfirmed, render: (r) => { const v = r.cash_unconfirmed + r.cheque_unconfirmed; return v > 0 ? <span className="font-medium text-warning">{inr(v)}</span> : <span className="text-muted-foreground">—</span>; } },
      { key: 'invoice_value', header: 'Invoice value', num: true, render: (r) => inr(r.invoice_value) },
    ],
    empty: 'No deliveries in this period.',
  },
  {
    id: 'revenue',
    group: 'Money',
    title: 'Revenue',
    description: 'How much was invoiced and how much was delivered, by day, month or hospital.',
    filter: 'range',
    endpoint: 'revenue',
    options: { name: 'group', label: 'Group by', default: 'day', choices: [{ value: 'day', label: 'Day' }, { value: 'month', label: 'Month' }, { value: 'hospital', label: 'Hospital' }] },
    kpis: (d) => [
      { label: 'Invoiced', value: inr(d.summary.invoiced_value) },
      { label: 'Invoices', value: d.summary.invoiced_count },
      { label: 'Delivered', value: inr(d.summary.delivered_value) },
      { label: 'Delivered invoices', value: d.summary.delivered_count },
    ],
    rows: (d) => d.rows,
    columns: [
      { key: 'key', header: 'Period / hospital', render: (r) => (/^\d{4}-\d{2}-\d{2}$/.test(r.key) ? day(r.key) : r.key) },
      { key: 'invoiced_count', header: 'Invoices', num: true },
      { key: 'invoiced_value', header: 'Invoiced', num: true, render: (r) => inr(r.invoiced_value) },
      { key: 'delivered_count', header: 'Delivered', num: true },
      { key: 'delivered_value', header: 'Delivered value', num: true, render: (r) => inr(r.delivered_value) },
    ],
    note: 'Invoiced is counted on the invoice date and excludes cancelled invoices. Delivered is counted on the delivery date. Hospital names are typed text, so spelling variants show as separate rows.',
    empty: 'No invoices in this period.',
  },
  {
    id: 'turnaround',
    group: 'Deliveries',
    title: 'Delivery speed',
    description: 'How long invoices wait to be accepted, and how long riders take once they accept.',
    filter: 'range',
    endpoint: 'turnaround',
    kpis: (d) => [
      { label: 'Deliveries', value: d.summary.deliveries },
      { label: 'Waited to be accepted', value: mins(d.summary.avg_minutes_to_accept) },
      { label: 'Accept to delivered', value: mins(d.summary.avg_minutes_to_deliver) },
      { label: 'Slowest 1 in 10', value: mins(d.summary.p90_minutes_to_deliver) },
    ],
    rows: (d) => d.rows,
    columns: [
      { key: 'rider', header: 'Rider' },
      { key: 'deliveries', header: 'Deliveries', num: true },
      { key: 'avg_minutes_to_accept', header: 'Avg wait to accept', num: true, render: (r) => mins(r.avg_minutes_to_accept) },
      { key: 'avg_minutes_to_deliver', header: 'Avg accept to delivered', num: true, render: (r) => mins(r.avg_minutes_to_deliver) },
      { key: 'p90_minutes_to_deliver', header: 'Slowest 1 in 10', num: true, render: (r) => mins(r.p90_minutes_to_deliver) },
      { key: 'slowest_minutes', header: 'Slowest', num: true, render: (r) => mins(r.slowest_minutes) },
    ],
    note: 'A delivery time of about a minute usually means the rider tapped Accept at the customer, not when they set off.',
    empty: 'No accepted-and-delivered invoices in this period.',
  },
  {
    id: 'pending',
    group: 'Deliveries',
    title: 'Waiting for a rider',
    description: 'Invoices nobody has accepted yet, oldest first.',
    filter: 'none',
    live: true,
    endpoint: 'pending-aging',
    kpis: (d) => [
      { label: 'Waiting now', value: d.summary.pending, tone: d.summary.pending > 0 ? 'warning' : 'default' },
      { label: 'Value waiting', value: inr(d.summary.value) },
      { label: 'Over 24 hours', value: d.summary.over_24h, tone: d.summary.over_24h > 0 ? 'danger' : 'default' },
      ...d.buckets.slice(0, 2).map((b: any) => ({ label: b.label, value: b.count })),
    ].slice(0, 5),
    rows: (d) => d.rows,
    rowLink: (r) => `/invoices/${r.id}`,
    columns: [
      { key: 'invoice_number', header: 'Invoice' },
      { key: 'hospital_name', header: 'Hospital' },
      { key: 'amount', header: 'Amount', num: true, render: (r) => inr(r.amount) },
      { key: 'waiting_minutes', header: 'Waiting', num: true, render: (r) => <span className={r.waiting_minutes >= 240 ? 'font-medium text-warning' : ''}>{mins(r.waiting_minutes)}</span> },
    ],
    note: 'Shows the 100 oldest. Press Enter on a row to open the invoice.',
    empty: 'Nothing is waiting. Every invoice has a rider.',
  },
  {
    id: 'cancellations',
    group: 'Deliveries',
    title: 'Cancelled and returned',
    description: 'Why invoices were cancelled or came back, and what they were worth.',
    filter: 'range',
    endpoint: 'cancellations',
    kpis: (d) => [
      { label: 'Cancelled', value: d.summary.cancelled },
      { label: 'Returned', value: d.summary.returned },
      { label: 'Value affected', value: inr(d.summary.value) },
    ],
    rows: (d) => d.rows,
    columns: [
      { key: 'kind', header: 'What happened' },
      { key: 'reason', header: 'Reason' },
      { key: 'count', header: 'Invoices', num: true },
      { key: 'value', header: 'Value', num: true, render: (r) => inr(r.value) },
    ],
    note: 'The system has no separate cancel date, so the period uses the last time the invoice changed.',
    empty: 'Nothing cancelled or returned in this period.',
  },
  {
    id: 'released',
    group: 'Deliveries',
    title: 'Given back by riders',
    description: 'Invoices a rider accepted and then released to the pool, with the reason they gave.',
    filter: 'range',
    endpoint: 'release-to-pool',
    kpis: (d) => [
      { label: 'Released', value: d.summary.released },
      { label: 'Riders involved', value: d.summary.riders },
      ...d.by_rider.slice(0, 2).map((b: any) => ({ label: b.rider, value: b.count })),
    ],
    rows: (d) => d.rows,
    rowLink: (r) => `/invoices/${r.id}`,
    columns: [
      { key: 'at', header: 'When', render: (r) => when(r.at), value: (r) => r.at ?? '' },
      { key: 'invoice_number', header: 'Invoice' },
      { key: 'hospital_name', header: 'Hospital' },
      { key: 'rider', header: 'Rider' },
      { key: 'reason', header: 'Reason' },
    ],
    empty: 'No invoices were given back in this period.',
  },
  {
    id: 'break',
    group: 'Riders',
    title: 'Riders on break',
    description: 'Riders who went off duty while still holding invoices they have not delivered.',
    filter: 'none',
    live: true,
    endpoint: 'riders-on-break',
    kpis: (d) => [
      { label: 'Riders on break', value: d.summary.riders, tone: d.summary.riders > 0 ? 'warning' : 'default' },
      { label: 'Invoices held', value: d.summary.invoices },
    ],
    rows: (d) => d.rows,
    rowLink: () => '/tracking',
    columns: [
      { key: 'rider', header: 'Rider' },
      { key: 'invoices', header: 'Invoices held', num: true },
      { key: 'value', header: 'Value', num: true, render: (r) => inr(r.value) },
      { key: 'since', header: 'On break since', render: (r) => (r.since ? `${when(r.since)} (${mins(r.minutes)})` : 'Not recorded'), value: (r) => r.since ?? '' },
      { key: 'last_seen', header: 'Last location', render: (r) => when(r.last_seen), value: (r) => r.last_seen ?? '' },
      { key: 'battery', header: 'Battery', num: true, render: (r) => (r.battery === null || r.battery === undefined ? '—' : `${r.battery}%`) },
    ],
    empty: 'No rider is on break with undelivered invoices.',
  },
  {
    id: 'volume',
    group: 'Riders',
    title: 'Delivery volume',
    description: 'How many invoices came in, on which weekdays, and where they stand now.',
    filter: 'range',
    endpoint: 'delivery-volume',
    hideTable: true,
    kpis: (d) => [
      { label: 'Invoices', value: d.summary.total },
      { label: 'Waiting for a rider', value: d.summary.pending, tone: d.summary.pending > 0 ? 'warning' : 'default' },
      { label: 'With a rider', value: d.summary.assigned },
      { label: 'Delivered', value: d.summary.delivered + d.summary.completed },
      { label: 'Returned', value: d.summary.return },
      { label: 'Cancelled', value: d.summary.cancelled },
    ],
    extra: (d) => (
      <div className="grid gap-4 md:grid-cols-2">
        <BarList title="Invoices by weekday" items={d.weekdays.map((w: any) => ({ label: w.day, value: w.count }))} />
        <BarList
          title="Invoices by status"
          items={d.statuses.map((s: any) => ({
            label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
            value: s.count,
            tone: s.status === 'pending' ? 'warning' : s.status === 'cancelled' || s.status === 'return' ? 'danger' : s.status === 'completed' || s.status === 'delivered' ? 'success' : 'default',
          }))}
        />
      </div>
    ),
  },
  {
    id: 'workload',
    group: 'Riders',
    title: 'Rider workload',
    description: 'Invoices per rider in the period: how many they took, delivered, returned or still hold.',
    filter: 'range',
    endpoint: 'rider-workload',
    kpis: (d) => [
      { label: 'Riders with invoices', value: d.summary.riders },
      { label: 'Invoices', value: d.summary.invoices },
      { label: 'Still held', value: d.summary.still_open, tone: d.summary.still_open > 0 ? 'warning' : 'default' },
      { label: 'Returned', value: d.summary.returned },
    ],
    rows: (d) => d.rows,
    columns: [
      { key: 'rider', header: 'Rider' },
      { key: 'total', header: 'Invoices', num: true },
      { key: 'assigned', header: 'Still held', num: true },
      { key: 'delivered', header: 'Delivered', num: true, value: (r) => r.delivered + r.completed },
      { key: 'returned', header: 'Returned', num: true },
      { key: 'cancelled', header: 'Cancelled', num: true },
      { key: 'value', header: 'Value', num: true, render: (r) => inr(r.value) },
    ],
    empty: 'No invoices were assigned in this period.',
  },
  {
    id: 'path',
    group: 'Riders',
    title: 'Travel path',
    description: 'A rider’s route for one day: distance, moving, slow and idle time, on a map.',
    filter: 'none',
  },
  {
    id: 'attendance',
    group: 'People',
    title: 'Late, absent and overtime',
    description: 'Per employee for one month: late days, half days, absences, overtime and penalties.',
    filter: 'month',
    endpoint: 'attendance-exceptions',
    kpis: (d) => [
      { label: 'Employees', value: d.summary.employees },
      { label: 'Late days', value: d.summary.late_days },
      { label: 'Absent days', value: d.summary.absent_days },
      { label: 'Overtime hours', value: d.summary.overtime_hours },
      { label: 'Penalties', value: inr(d.summary.penalty_amount) },
    ],
    rows: (d) => d.rows,
    columns: [
      { key: 'employee', header: 'Employee' },
      { key: 'present_days', header: 'Present', num: true },
      { key: 'late_days', header: 'Late', num: true },
      { key: 'half_days', header: 'Half day', num: true },
      { key: 'absent_days', header: 'Absent', num: true },
      { key: 'overtime_hours', header: 'Overtime (h)', num: true },
      { key: 'overtime_amount', header: 'Overtime pay', num: true, render: (r) => inr(r.overtime_amount) },
      { key: 'penalty_amount', header: 'Penalty', num: true, render: (r) => inr(r.penalty_amount) },
    ],
    note: 'Absent days include days the system marked absent automatically.',
    empty: 'No attendance records for this month.',
  },
];

export const REPORT_GROUPS: ReportDef['group'][] = ['Money', 'Deliveries', 'Riders', 'People'];
