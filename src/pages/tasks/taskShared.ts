export const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export type AssigneeLike = {
  id: number;
  full_name?: string | null;
  email?: string;
  name?: string;
  username?: string;
};

export function assigneeName(assignees: AssigneeLike[], assignedToId: number | undefined): string {
  const a = assignees.find((x) => x.id === assignedToId);
  return (a?.full_name ?? a?.email ?? a?.name ?? a?.username ?? '') || 'Unassigned';
}

export function assigneeInitial(assignees: AssigneeLike[], assignedToId: number | undefined): string {
  const name = assigneeName(assignees, assignedToId);
  return name !== 'Unassigned' ? (name[0]?.toUpperCase() ?? '?') : '?';
}

/** Prefer API `assignee_name` when present (detail fetch), else resolve from user list. */
export function displayAssigneeName(
  task: { assignee_name?: string | null; assigned_to?: number | null },
  assignees: AssigneeLike[]
): string {
  const fromApi = task.assignee_name?.trim();
  if (fromApi) return fromApi;
  return assigneeName(assignees, task.assigned_to ?? undefined);
}

export function parseTaskRouteId(param: string | undefined): number | null {
  if (!param || !/^\d+$/.test(param)) return null;
  const n = Number(param);
  return Number.isFinite(n) ? n : null;
}
