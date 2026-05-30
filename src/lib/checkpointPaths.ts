import type { DeliveryCheckpointRow } from './api';

/** Human-readable labels for checkpoint types stored by the backend. */
export const CHECKPOINT_TYPE_LABELS: Record<string, string> = {
  invoice_accepted: 'Invoice accepted',
  invoice_return: 'Invoice return',
  invoice_returned_store: 'Returned to store',
  task_accepted: 'Task accepted',
  task_delivered: 'Task delivered',
  task_completed: 'Task completed',
  task_cancelled: 'Task cancelled',
  manual_offline: 'Went offline',
  ws_disconnect: 'Disconnected',
  segment_superseded: 'Segment closed',
};

export const CHECKPOINT_SEGMENT_COLORS: Record<string, string> = {
  invoice_accepted: '#3b82f6',
  task_accepted: '#3b82f6',
  invoice_return: '#10b981',
  task_delivered: '#10b981',
  invoice_returned_store: '#8b5cf6',
  task_completed: '#8b5cf6',
  task_cancelled: '#f59e0b',
  manual_offline: '#ef4444',
  ws_disconnect: '#ef4444',
  segment_superseded: '#94a3b8',
};

export function checkpointTypeLabel(type: string): string {
  return CHECKPOINT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

export function segmentColorForCheckpoint(type: string): string {
  return CHECKPOINT_SEGMENT_COLORS[type] ?? '#6366f1';
}

export function checkpointJobRef(row: DeliveryCheckpointRow): string {
  if (row.invoice_id != null) return `Invoice #${row.invoice_id}`;
  if (row.task_id != null) return `Task #${row.task_id}`;
  return '—';
}

export function sortCheckpointsChronological(rows: DeliveryCheckpointRow[]): DeliveryCheckpointRow[] {
  return [...rows].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
}

export function checkpointsToMapMarkers(
  rows: DeliveryCheckpointRow[],
  selectedId: number | null,
) {
  return rows
    .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
    .map((r) => ({
      id: r.id,
      pos: [r.lat as number, r.lng as number] as [number, number],
      label: checkpointTypeLabel(r.checkpoint_type),
      time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: (selectedId === r.id ? 'active' : 'completed') as 'active' | 'completed',
      sublabel: checkpointJobRef(r),
    }));
}
