import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, Shield, Trash2, Edit2, CheckCircle2,
  XCircle, Search, Key, X, Save, Eye, EyeOff, ArrowUp, ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, getRoles, createUser, updateUser, resetUserPassword, mapBackendRoleToFrontend, normalizeFetchError } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-rose-50 text-rose-700',
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  delivery: 'bg-zinc-50 text-zinc-600',
  delivery_boy: 'bg-zinc-50 text-zinc-600',
  staff: 'bg-emerald-50 text-emerald-700',
};

/** Map API user to FE table shape */
function toTableUser(u: { id: number; email: string; full_name: string | null; phone?: string | null; is_active: boolean; role_codes: string[] }) {
  const username = u.full_name || u.email.split('@')[0];
  const role = mapBackendRoleToFrontend(u.role_codes);
  const role_code = u.role_codes?.[0] ?? 'user';
  return {
    id: u.id,
    username,
    email: u.email,
    phone: u.phone ?? undefined,
    role,
    role_code,
    status: (u.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
  };
}

/** Stable modal/field components (defined outside so modal does not remount on every keystroke) */
function Modal({ title, onClose, children, closeOnBackdropClick = true }: { title: string; onClose: () => void; children: React.ReactNode; closeOnBackdropClick?: boolean }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (closeOnBackdropClick) onClose();
      else e.preventDefault();
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
      onClick={closeOnBackdropClick ? onClose : undefined}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClassName = "w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all";

export default function UserManagement() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPw, setNewPw] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string; code: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', phone: '', password: '', role: 'staff' });
  const [toast, setToast] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [userSort, setUserSort] = useState<'asc' | 'desc'>('asc');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUsers([]);
      setRoles([]);
      setRolesError(null);
      return;
    }
    fetchUsers();
    fetchRoles();
  }, [token]);

  const fetchRoles = async () => {
    if (!token) return;
    setRolesLoading(true);
    setRolesError(null);
    try {
      const data = await getRoles(token);
      setRoles(data);
      setNewUser((prev) => ({ ...prev, role: prev.role || data.find((r) => r.code !== 'user')?.code || 'staff' }));
    } catch (e) {
      setRoles([]);
      setRolesError(normalizeFetchError(e, 'Failed to load roles'));
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers(token);
      setUsers(data.map(toTableUser));
    } catch (e) {
      setError(normalizeFetchError(e, 'Failed to load users'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setAddLoading(true);
    try {
      await createUser(token, {
        full_name: newUser.username.trim() || undefined,
        email: newUser.email,
        phone: newUser.phone.trim() || undefined,
        password: newUser.password,
        role_code: newUser.role,
      });
      setShowAddModal(false);
      setNewUser({ username: '', email: '', phone: '', password: '', role: roles.find((r) => r.code !== 'user')?.code || 'staff' });
      fetchUsers();
      showToast('User created successfully');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUser?.id) return;
    setEditLoading(true);
    try {
      await updateUser(token, editingUser.id, {
        full_name: editingUser.username?.trim() || undefined,
        email: editingUser.email,
        phone: editingUser.phone ?? undefined,
        role_code: editingUser.role_code ?? editingUser.role,
      });
      setEditingUser(null);
      fetchUsers();
      showToast('User updated successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (u: any) => {
    if (!token) return;
    try {
      await updateUser(token, u.id, { is_active: u.status !== 'active' });
      fetchUsers();
      showToast(u.status === 'active' ? 'User deactivated' : 'User activated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resetUser?.id) return;
    if (newPw.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    if (!adminPw) {
      showToast('Enter admin password to continue');
      return;
    }
    setResetLoading(true);
    try {
      await resetUserPassword(token, resetUser.id, adminPw, newPw);
      setResetUser(null);
      setNewPw('');
      setAdminPw('');
      setShowPw(false);
      setShowAdminPw(false);
      showToast('Password reset successfully');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const sortedFiltered = [...filtered].sort((a, b) => {
    const cmp = (a.username || '').localeCompare(b.username || '', undefined, { sensitivity: 'base' });
    return userSort === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-6 right-6 z-99 bg-zinc-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">User Management</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setNewUser((prev) => ({ ...prev, role: prev.role || roles.find((r) => r.code !== 'user')?.code || 'staff' }));
          }}
          disabled={!token}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
        >
          <UserPlus size={14} /> New User
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg space-y-1">
          <p className="font-medium">{error}</p>
          {error.includes('Admin access') && (
            <p className="text-xs text-red-600/90">
              Your account may not have the Admin role assigned. An existing admin can run the backend script{' '}
              <code className="bg-red-100 px-1 rounded">python -m scripts.create_super_admin</code> with your email to grant admin access.
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-zinc-100 bg-zinc-50/30">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all shadow-sm" />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <button
                    type="button"
                    onClick={() => setUserSort(s => (s === 'asc' ? 'desc' : 'asc'))}
                    className="flex items-center gap-1 hover:text-zinc-600 transition-colors cursor-pointer"
                    title={userSort === 'asc' ? 'Sort A–Z (click for Z–A)' : 'Sort Z–A (click for A–Z)'}
                  >
                    User
                    {userSort === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  </button>
                </th>
                {['Phone', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-zinc-400">Loading users...</td></tr>
              ) : sortedFiltered.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-xs border border-zinc-200 shadow-sm">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{u.username}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{u.phone || <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize ${ROLE_COLORS[u.role]}`}>
                      <Shield size={10} />{u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                        }`} title="Click to toggle">
                      {u.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingUser({ ...u })}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-all" title="Edit User">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { setResetUser(u); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Reset Password">
                        <Key size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {sortedFiltered.map(u => (
            <div key={u.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-sm">{u.username}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingUser({ ...u })} className="p-2 text-zinc-400 hover:text-zinc-700"><Edit2 size={16} /></button>
                  <button onClick={() => { setResetUser(u); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }} className="p-2 text-zinc-400 hover:text-blue-600"><Key size={16} /></button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${ROLE_COLORS[u.role]}`}>
                  <Shield size={10} />{u.role.replace('_', ' ')}
                </span>
                <button onClick={() => handleToggleStatus(u)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {u.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <Modal title="Add New User" onClose={() => setShowAddModal(false)} closeOnBackdropClick={false}>
          <form onSubmit={handleAddUser} className="p-5 space-y-4">
            <Field label="Username"><input type="text" required value={newUser.username} onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))} placeholder="johndoe" className={inputClassName} /></Field>
            <Field label="Email"><input type="email" required value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} placeholder="john@example.com" className={inputClassName} /></Field>
            <Field label="Phone"><input type="tel" value={newUser.phone} onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputClassName} /></Field>
            <Field label="Password"><input type="password" required value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} placeholder="Min. 6 characters" className={inputClassName} /></Field>
            <Field label="Role">
              <SearchableSelect
                value={newUser.role}
                onChange={(v) => setNewUser((prev) => ({ ...prev, role: v }))}
                disabled={rolesLoading}
                className="w-full"
                options={
                  rolesLoading
                    ? [{ value: '', label: 'Loading roles...' }]
                    : rolesError
                    ? [{ value: '', label: 'Failed to load roles' }]
                    : roles.length === 0
                    ? [{ value: '', label: 'No roles' }]
                    : roles.filter((r) => r.code !== 'user').map((r) => ({ value: r.code, label: r.name }))
                }
              />
              {rolesError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-2">
                  {rolesError}
                  <button type="button" onClick={fetchRoles} className="text-emerald-600 font-medium hover:underline">
                    Retry
                  </button>
                </p>
              )}
            </Field>
            <button
              type="submit"
              disabled={addLoading || !newUser.role || roles.filter((r) => r.code !== 'user').length === 0}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save size={16} /> {addLoading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </Modal>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
          <form onSubmit={handleEditSave} className="p-5 space-y-4">
            <Field label="Username"><input type="text" required value={editingUser.username} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, username: e.target.value }))} className={inputClassName} /></Field>
            <Field label="Email"><input type="email" required value={editingUser.email} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, email: e.target.value }))} className={inputClassName} /></Field>
            <Field label="Phone"><input type="tel" value={editingUser.phone || ''} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputClassName} /></Field>
            <Field label="Role">
              <SearchableSelect
                value={editingUser.role_code ?? editingUser.role ?? ''}
                onChange={(v) => setEditingUser((prev: any) => ({ ...prev, role_code: v }))}
                disabled={rolesLoading}
                className="w-full"
                options={
                  rolesLoading
                    ? [{ value: '', label: 'Loading roles...' }]
                    : rolesError
                    ? [{ value: '', label: 'Failed to load roles' }]
                    : roles.map((r) => ({ value: r.code, label: r.name }))
                }
              />
              {rolesError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-2">
                  {rolesError}
                  <button type="button" onClick={fetchRoles} className="text-emerald-600 font-medium hover:underline">
                    Retry
                  </button>
                </p>
              )}
            </Field>
            <button type="submit" disabled={editLoading || (roles.length === 0 && !rolesError)} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              <Save size={16} /> {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.username}`} onClose={() => setResetUser(null)}>
          <form onSubmit={handleResetPassword} className="p-5 space-y-4">
            <p className="text-sm text-zinc-500">Enter a new password for <strong>{resetUser.username}</strong>.</p>
            <div className="relative">
              <input type={showAdminPw ? 'text' : 'password'} placeholder="Your admin password"
                value={adminPw} onChange={(e) => setAdminPw(e.target.value)} required className={inputClassName} />
              <button type="button" onClick={() => setShowAdminPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                {showAdminPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} placeholder="New password (min 6 chars)"
                value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={6} required className={inputClassName} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" disabled={resetLoading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              <Key size={16} /> {resetLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
