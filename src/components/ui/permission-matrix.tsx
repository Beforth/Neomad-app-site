import * as React from 'react';
import { Checkbox } from './checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { cn } from '@/lib/utils';

export type Grants = Record<string, string[]>;

/**
 * Roles down the side, permissions across the top. `value` maps each role to the permissions it has.
 * Ticking a header column toggles it for every role. Controlled: pass `value` and `onChange`.
 */
export function PermissionMatrix({
  roles,
  permissions,
  value,
  onChange,
  locked = [],
  className,
}: {
  roles: { id: string; label: string; hint?: string }[];
  permissions: { id: string; label: string }[];
  value: Grants;
  onChange: (next: Grants) => void;
  /** Role ids that cannot be edited, e.g. the owner. */
  locked?: string[];
  className?: string;
}) {
  const has = (role: string, perm: string) => value[role]?.includes(perm) ?? false;
  const set = (roleIds: string[], perm: string, on: boolean) => {
    const next = { ...value };
    for (const r of roleIds) {
      const rest = (next[r] ?? []).filter((p) => p !== perm);
      next[r] = on ? [...rest, perm] : rest;
    }
    onChange(next);
  };
  const editable = roles.filter((r) => !locked.includes(r.id)).map((r) => r.id);

  return (
    <div className={cn('overflow-hidden rounded-xl border', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="align-bottom">Role</TableHead>
            {permissions.map((p) => {
              const n = editable.filter((r) => has(r, p.id)).length;
              return (
                <TableHead key={p.id} className="text-center">
                  <div className="grid justify-items-center gap-1.5">
                    {p.label}
                    <Checkbox aria-label={`Toggle ${p.label} for all roles`} disabled={editable.length === 0} checked={n === 0 ? false : n === editable.length ? true : 'indeterminate'} onCheckedChange={(on) => set(editable, p.id, !!on)} />
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="min-w-44">
                <div className="font-medium">{r.label}</div>
                {r.hint && <div className="text-xs text-muted-foreground">{r.hint}</div>}
              </TableCell>
              {permissions.map((p) => (
                <TableCell key={p.id} className="text-center">
                  <Checkbox className="mx-auto" aria-label={`${r.label} can ${p.label}`} disabled={locked.includes(r.id)} checked={has(r.id, p.id)} onCheckedChange={(on) => set([r.id], p.id, !!on)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
