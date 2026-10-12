/**
 * Department master: list with employee counts, add, rename, delete.
 *
 * Deleting is refused server-side while employees are still assigned, so the
 * error from the API is surfaced as-is.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { SearchInput, FilterSelect, SortableTh, Pagination } from '../../components/ListControls';
import { useListControls } from '../../hooks/useListControls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input, fieldClass } from '@/components/ui/input';
import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  type DepartmentOut,
} from '../../lib/hrmsStaff';

const inputClass = fieldClass;

export default function Departments() {
  const { token } = useAuth();
  const [rows, setRows] = useState<DepartmentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('');

  const list = useListControls({ defaultSortBy: 'name', pageSize: 25 });

  const [saving, setSaving] = useState(false);
  /** null = closed; { id: null } = create; { id: n } = rename. */
  const [dialog, setDialog] = useState<{ id: number | null; name: string } | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DepartmentOut | null>(null);

  const { query, absorb } = list;
  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    listDepartments(token, {
      ...query,
      is_active: activeFilter === '' ? undefined : activeFilter === 'active',
    })
      .then((res) => { setRows(absorb(res)); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load departments'))
      .finally(() => setLoading(false));
  }, [token, query, activeFilter, absorb]);

  // Re-fetches whenever search, sort, page or the filter changes.
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!token || !dialog) return;
    const name = dialog.name.trim();
    if (!name) { setDialogError('Department name is required.'); return; }
    setSaving(true);
    setDialogError(null);
    try {
      if (dialog.id === null) await createDepartment(token, name);
      else await updateDepartment(token, dialog.id, { name });
      setDialog(null);
      load();
    } catch (e) {
      // Keep the dialog open so the name can be corrected (e.g. duplicate).
      setDialogError(e instanceof Error ? e.message : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      await deleteDepartment(token, confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete department');
      setConfirmDelete(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Departments <span className="text-muted-foreground/70 font-semibold">({list.total})</span>
          </h1>
          <p className="text-[13px] text-muted-foreground">Used to group staff and drive the HRMS dashboard chart</p>
        </div>
        <Button variant="dark" size="sm" type="button" onClick={() => { setDialog({ id: null, name: '' }); setDialogError(null); }}
          >
          <Plus size={14} /> Add New
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={list.search}
          onChange={list.setSearch}
          placeholder="Search departments…"
          pending={list.searchPending}
        />
        <FilterSelect
          value={activeFilter}
          onChange={setActiveFilter}
          label="Status"
          allLabel="All statuses"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      <Card className="overflow-hidden" >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTh field="name" sortBy={list.sortBy} sortOrder={list.sortOrder} onSort={list.toggleSort}>
                Department Name
              </SortableTh>
              <TableHead className="text-left uppercase">
                Employee Count
              </TableHead>
              <SortableTh field="created_at" sortBy={list.sortBy} sortOrder={list.sortOrder} onSort={list.toggleSort}>
                Created
              </SortableTh>
              <TableHead className="text-right uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !rows.length && (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground/70">Loading…</TableCell></TableRow>
            )}

            {!loading && !rows.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <Building2 size={28} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-semibold text-foreground/70">
                    {list.search ? `No departments match “${list.search}”` : 'No departments yet'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {list.search
                      ? 'Try a different search term.'
                      : 'Add one, then assign staff to it from the employee form.'}
                  </p>
                </TableCell>
              </TableRow>
            )}

            {rows.map((d) => (
              <TableRow key={d.id} className="">
                <TableCell>
                  <span className="text-sm font-medium text-foreground">{d.name}</span>
                </TableCell>
                <TableCell>
                  {d.employee_count > 0 ? (
                    <Link to={`/hrms/staff?department_id=${d.id}`}
                      className="text-sm text-primary font-semibold hover:underline">
                      {d.employee_count}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground/70">0</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  }) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" type="button"
                      onClick={() => { setDialog({ id: d.id, name: d.name }); setDialogError(null); }}
                      
                      title="Rename">
                      <Pencil size={15} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" type="button" onClick={() => setConfirmDelete(d)}
                      
                      title="Delete">
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          pageSize={list.pageSize}
          onPage={list.setPage}
          onPageSize={list.setPageSize}
        />
      </Card>

      {dialog && (
        <Modal
          title={dialog.id === null ? 'Add Department' : 'Rename Department'}
          onClose={() => setDialog(null)}
          closeOnBackdropClick={!saving}
        >
          <form
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            className="p-5 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1.5">
                Department Name<span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                autoFocus
                value={dialog.name}
                onChange={(e) => setDialog((d) => (d ? { ...d, name: e.target.value } : d))}
                placeholder="e.g. Billing"
                className={`${inputClass} w-full`}
              />
            </div>

            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => setDialog(null)}
                >
                Cancel
              </Button>
              <Button variant="dark" className="flex-1" type="submit" disabled={saving || !dialog.name.trim()}
                >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : dialog.id === null ? 'Create' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setConfirmDelete(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-sm">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <h3 className="font-semibold text-foreground">Delete “{confirmDelete.name}”?</h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              {confirmDelete.employee_count > 0
                ? `${confirmDelete.employee_count} employee(s) are assigned to it. Reassign them first — the server will refuse this.`
                : 'This cannot be undone.'}
            </p>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => setConfirmDelete(null)}
                >
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" type="button" onClick={handleDelete} disabled={saving}
                >
                {saving ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
