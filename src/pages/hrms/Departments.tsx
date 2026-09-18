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
import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  type DepartmentOut,
} from '../../lib/hrmsStaff';

const inputClass =
  'px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition';

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
          <h1 className="text-xl font-extrabold text-zinc-900">
            Departments <span className="text-zinc-400 font-bold">({list.total})</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Used to group staff and drive the HRMS dashboard chart</p>
        </div>
        <button type="button" onClick={() => { setDialog({ id: null, name: '' }); setDialogError(null); }}
          className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
          <Plus size={14} /> Add New
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-3">
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

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <SortableTh field="name" sortBy={list.sortBy} sortOrder={list.sortOrder} onSort={list.toggleSort}>
                Department Name
              </SortableTh>
              <th className="text-left px-5 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Employee Count
              </th>
              <SortableTh field="created_at" sortBy={list.sortBy} sortOrder={list.sortOrder} onSort={list.toggleSort}>
                Created
              </SortableTh>
              <th className="text-right px-5 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading && !rows.length && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-400">Loading…</td></tr>
            )}

            {!loading && !rows.length && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <Building2 size={28} className="mx-auto text-zinc-300 mb-2" />
                  <p className="text-sm font-semibold text-zinc-600">
                    {list.search ? `No departments match “${list.search}”` : 'No departments yet'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {list.search
                      ? 'Try a different search term.'
                      : 'Add one, then assign staff to it from the employee form.'}
                  </p>
                </td>
              </tr>
            )}

            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-5 py-3">
                  <span className="text-sm font-medium text-zinc-900">{d.name}</span>
                </td>
                <td className="px-5 py-3">
                  {d.employee_count > 0 ? (
                    <Link to={`/hrms/staff?department_id=${d.id}`}
                      className="text-sm text-emerald-600 font-semibold hover:underline">
                      {d.employee_count}
                    </Link>
                  ) : (
                    <span className="text-sm text-zinc-400">0</span>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-zinc-500">
                  {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  }) : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button"
                      onClick={() => { setDialog({ id: d.id, name: d.name }); setDialogError(null); }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      title="Rename">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(d)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          pageSize={list.pageSize}
          onPage={list.setPage}
          onPageSize={list.setPageSize}
        />
      </div>

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
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Department Name<span className="text-rose-500 ml-0.5">*</span>
              </label>
              <input
                autoFocus
                value={dialog.name}
                onChange={(e) => setDialog((d) => (d ? { ...d, name: e.target.value } : d))}
                placeholder="e.g. Billing"
                className={`${inputClass} w-full`}
              />
            </div>

            {dialogError && (
              <p className="text-sm text-rose-600">{dialogError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setDialog(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving || !dialog.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : dialog.id === null ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900">Delete “{confirmDelete.name}”?</h3>
            <p className="text-sm text-zinc-500 mt-1.5">
              {confirmDelete.employee_count > 0
                ? `${confirmDelete.employee_count} employee(s) are assigned to it. Reassign them first — the server will refuse this.`
                : 'This cannot be undone.'}
            </p>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
