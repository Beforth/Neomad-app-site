import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, Shield, Trash2, Edit2, CheckCircle2,
  XCircle, Search, Key, X, Save, Eye, EyeOff, ChevronLeft, ChevronRight,
  Users, UserCheck, UserX, Plus, ArrowUpDown, ChevronUp,
  ChevronDown, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, getRoles, createUser, updateUser, resetUserPassword, mapBackendRoleToFrontend, normalizeFetchError } from '../../lib/api';
import SearchableSelect from '../../components/SearchableSelect';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-rose-50 text-rose-700',
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  delivery: 'bg-zinc-50 text-zinc-600',
  delivery_boy: 'bg-zinc-50 text-zinc-600',
  staff: 'bg-emerald-50 text-emerald-700',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  inactive: 'bg-zinc-50 text-zinc-500 border-zinc-100',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

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

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'delivery_boy', label: 'Delivery Boy' },
  { value: 'staff', label: 'Staff' },
];

const PAGE_SIZE = 10;

export default function Staff() {
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  type SortKey = 'name' | 'role' | 'status';
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-zinc-900" /> : <ChevronDown size={12} className="text-zinc-900" />;
  }

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

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
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [roleFilter, searchDebounced]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      if (token) {
        const data = await getUsers(token);
        setStaff(data.map(toTableUser));
      } else {
        setStaff([]);
      }
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

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
      fetchStaff();
      showToast('Staff created successfully');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create staff');
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
      fetchStaff();
      showToast('Staff updated successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update staff');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (u: any) => {
    if (!token) return;
    try {
      await updateUser(token, u.id, { is_active: u.status !== 'active' });
      fetchStaff();
      showToast(u.status === 'active' ? 'Staff deactivated' : 'Staff activated');
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

  const handleDeleteUser = async (u: any) => {
    if (!token) return;
    try {
      await updateUser(token, u.id, { is_active: false });
      fetchStaff();
      showToast('Staff member deactivated');
      setDeleteConfirm(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete staff');
    }
  };

  const filtered = useMemo(() => {
    const q = searchDebounced.toLowerCase().trim();
    return staff.filter((s) => {
      const matchSearch = !q || s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || s.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [staff, searchDebounced, roleFilter]);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.username.localeCompare(b.username);
    else if (sortBy === 'role') cmp = a.role.localeCompare(b.role);
    else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, sorted.length);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = staff.length;
  const active = staff.filter((s) => s.status === 'active').length;
  const inactive = staff.filter((s) => s.status === 'inactive').length;

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const hasFilters = search || roleFilter !== 'all';

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Staff</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Manage your team members</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setShowAddModal(true);
              setNewUser((prev) => ({ ...prev, role: prev.role || roles.find((r) => r.code !== 'user')?.code || 'staff' }));
            }}
            className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Plus size={16} />Add Staff
          </button>
        )}
      </motion.header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total Staff', value: total, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: active, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactive', value: inactive, icon: UserX, color: 'bg-zinc-100 text-zinc-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center"
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
          />
        </div>
        <div className="w-[160px]">
          <SearchableSelect
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
            options={ROLE_FILTER_OPTIONS}
            placeholder="Role"
            className="w-full"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); }}
            className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden"
      >

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                {[
                  { key: 'name' as SortKey, label: 'Name' },
                  { key: null, label: 'Phone' },
                  { key: 'role' as SortKey, label: 'Role' },
                  { key: 'status' as SortKey, label: 'Status' },
                  ...(canManage ? [{ key: null, label: 'Actions' }] : []),
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={col.key ? () => toggleSort(col.key) : undefined}
                    className={`px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap text-left ${col.key ? 'cursor-pointer hover:text-zinc-600 select-none' : ''}`}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortIcon col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">Loading staff...</td></tr>
              ) : paged.map((s, i) => {
                const isSelf = s.id === currentUser?.id;
                return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-xs border border-zinc-200 shadow-sm">
                          {s.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{s.username}</p>
                          <p className="text-xs text-zinc-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{s.phone || <span className="text-zinc-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize ${ROLE_COLORS[s.role] || 'bg-zinc-50 text-zinc-600'}`}>
                        <Shield size={10} />{s.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleStatus(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-red-50 text-red-700 border-red-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
                        title="Click to toggle">
                        {s.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                      </button>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingUser({ ...s })}
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="Edit Staff">
                            <Edit2 size={14} />
                          </button>
                          {!isSelf && (
                            <button onClick={() => { setResetUser(s); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }}
                              className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Reset Password">
                              <Key size={14} />
                            </button>
                          )}
                          {!isSelf && (
                            <button onClick={() => setDeleteConfirm(s)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Staff">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
              {sorted.length === 0 && !loading && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                        <Inbox size={24} className="text-zinc-300" />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 mb-1">No staff members found</h3>
                      <p className="text-xs text-zinc-400 max-w-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-zinc-100">
          {paged.map((s, i) => (
            <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 space-y-2"
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                    {s.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{s.username}</p>
                    <p className="text-xs text-zinc-500">{s.email}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingUser({ ...s })} className="p-2 text-zinc-400 hover:text-zinc-700"><Edit2 size={16} /></button>
                    <button onClick={() => { setResetUser(s); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }} className="p-2 text-zinc-400 hover:text-blue-600"><Key size={16} /></button>
                    <button onClick={() => setDeleteConfirm(s)} className="p-2 text-zinc-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${ROLE_COLORS[s.role] || 'bg-zinc-50 text-zinc-600'}`}>
                  <Shield size={10} />{s.role.replace('_', ' ')}
                </span>
                <button onClick={() => handleToggleStatus(s)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {s.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                </button>
              </div>
            </motion.div>
          ))}
          {sorted.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
                <Inbox size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">No staff members found</h3>
              <p className="text-xs text-zinc-400 max-w-xs">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
            <p className="text-xs text-zinc-500">
              Showing <span className="font-bold text-zinc-900">{startRow}</span>–
              <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
              <span className="font-bold text-zinc-900">{sorted.length}</span> staff
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-zinc-600" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-zinc-600" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ADD STAFF MODAL */}
      {showAddModal && (
        <Modal title="Add New Staff" onClose={() => setShowAddModal(false)} closeOnBackdropClick={false}>
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
                  <button type="button" onClick={fetchRoles} className="text-emerald-600 font-medium hover:underline">Retry</button>
                </p>
              )}
            </Field>
            <button
              type="submit"
              disabled={addLoading || !newUser.role || roles.filter((r) => r.code !== 'user').length === 0}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save size={16} /> {addLoading ? 'Creating...' : 'Create Staff'}
            </button>
          </form>
        </Modal>
      )}

      {/* EDIT STAFF MODAL */}
      {editingUser && (
        <Modal title="Edit Staff" onClose={() => setEditingUser(null)}>
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
                  <button type="button" onClick={fetchRoles} className="text-emerald-600 font-medium hover:underline">Retry</button>
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

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <Modal title="Remove Staff" onClose={() => setDeleteConfirm(null)}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-zinc-500">
              Are you sure you want to deactivate <strong>{deleteConfirm.username}</strong>? This will remove their access.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 transition-colors text-sm">
                Cancel
              </button>
              <button onClick={() => handleDeleteUser(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm">
                <Trash2 size={14} /> Deactivate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
