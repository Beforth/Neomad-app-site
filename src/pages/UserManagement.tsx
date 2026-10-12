import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, Shield, Trash2, Edit2, CheckCircle2,
  XCircle, Search, Key, X, Save, Eye, EyeOff, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, getRoles, createUser, updateUser, resetUserPassword, mapBackendRoleToFrontend, normalizeFetchError } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';

import Modal from '../components/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, fieldClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-destructive/10 text-destructive',
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-info/10 text-info',
  delivery: 'bg-muted text-foreground/70',
  delivery_boy: 'bg-muted text-foreground/70',
  staff: 'bg-accent text-accent-foreground',
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/85 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClassName = fieldClass;

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
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const DUMMY_USERS = [
    { id: 101, username: 'Rahul Sharma', email: 'rahul@neomed.in', phone: '+91 98765 43210', role: 'admin', role_code: 'admin', status: 'active' as const },
    { id: 102, username: 'Priya Verma', email: 'priya@neomed.in', phone: '+91 91234 56789', role: 'manager', role_code: 'manager', status: 'active' as const },
    { id: 103, username: 'Amit Patel', email: 'amit@neomed.in', phone: '+91 99887 66554', role: 'delivery_boy', role_code: 'delivery_boy', status: 'active' as const },
    { id: 104, username: 'Sneha Gupta', email: 'sneha@neomed.in', phone: '+91 88776 55443', role: 'staff', role_code: 'staff', status: 'active' as const },
    { id: 105, username: 'Vikram Singh', email: 'vikram@neomed.in', phone: '+91 77665 44332', role: 'delivery_boy', role_code: 'delivery_boy', status: 'inactive' as const },
    { id: 106, username: 'Neha Reddy', email: 'neha@neomed.in', phone: '+91 66554 33221', role: 'manager', role_code: 'manager', status: 'active' as const },
    { id: 107, username: 'Arjun Nair', email: 'arjun@neomed.in', phone: '+91 55443 22110', role: 'delivery_boy', role_code: 'delivery_boy', status: 'active' as const },
    { id: 108, username: 'Kavitha Iyer', email: 'kavitha@neomed.in', phone: '+91 44332 11009', role: 'staff', role_code: 'staff', status: 'active' as const },
    { id: 109, username: 'Sanjay Mishra', email: 'sanjay@neomed.in', phone: '+91 33221 00998', role: 'delivery_boy', role_code: 'delivery_boy', status: 'inactive' as const },
    { id: 110, username: 'Pooja Das', email: 'pooja@neomed.in', phone: '+91 22110 99887', role: 'manager', role_code: 'manager', status: 'active' as const },
    { id: 111, username: 'Ravi Kumar', email: 'ravi@neomed.in', phone: '+91 11009 88776', role: 'delivery_boy', role_code: 'delivery_boy', status: 'active' as const },
    { id: 112, username: 'Anita Joshi', email: 'anita@neomed.in', phone: '+91 00998 77665', role: 'staff', role_code: 'staff', status: 'active' as const },
    { id: 113, username: 'Deepak Rao', email: 'deepak@neomed.in', phone: '+91 99887 11223', role: 'delivery_boy', role_code: 'delivery_boy', status: 'active' as const },
    { id: 114, username: 'Meena Pillai', email: 'meena@neomed.in', phone: '+91 88776 22334', role: 'manager', role_code: 'manager', status: 'inactive' as const },
    { id: 115, username: 'Karthik Menon', email: 'karthik@neomed.in', phone: '+91 77665 33445', role: 'delivery_boy', role_code: 'delivery_boy', status: 'active' as const },
  ];

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
    setLoading(true);
    setError(null);
    try {
      if (token) {
        const data = await getUsers(token);
        const real = data.map(toTableUser);
        const realIds = new Set(real.map((u: any) => u.id));
        const extras = DUMMY_USERS.filter(d => !realIds.has(d.id));
        setUsers([...real, ...extras]);
      } else {
        setUsers(DUMMY_USERS);
      }
    } catch (e) {
      setUsers(DUMMY_USERS);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (!token) {
      setUsers(prev => prev.filter(x => x.id !== u.id));
      showToast('User deleted (demo)');
      setDeleteConfirm(null);
      return;
    }
    try {
      await updateUser(token, u.id, { is_active: false });
      fetchUsers();
      showToast('User deleted successfully');
      setDeleteConfirm(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete user');
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
            className="fixed top-6 right-6 z-[9999] bg-foreground text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-primary" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader title="User Management" description="Manage system users and permissions" actions={<>
<Button variant="dark" size="sm"
          onClick={() => {
            setShowAddModal(true);
            setNewUser((prev) => ({ ...prev, role: prev.role || roles.find((r) => r.code !== 'user')?.code || 'staff' }));
          }}
          disabled={!token}
          
        >
          <UserPlus size={14} /> New User
        </Button>
</>} />
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg space-y-1">
          <p className="font-medium">{error}</p>
          {error.includes('Admin access') && (
            <p className="text-xs text-destructive">
              Your account may not have the Admin role assigned. An existing admin can run the backend script{' '}
              <code className="bg-destructive/15 px-1 rounded">python -m scripts.create_super_admin</code> with your email to grant admin access.
            </p>
          )}
        </div>
      )}

      <Card className="overflow-hidden" >
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
            <Input data-search="" className="w-full pl-9 pr-4" type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
               />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow>
                <TableHead className="uppercase">
                  <button
                    type="button"
                    onClick={() => setUserSort(s => (s === 'asc' ? 'desc' : 'asc'))}
                    className="flex items-center gap-1 hover:text-foreground/70 transition-colors cursor-pointer"
                    title={userSort === 'asc' ? 'Sort A–Z (click for Z–A)' : 'Sort Z–A (click for A–Z)'}
                  >
                    User
                    {userSort === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  </button>
                </TableHead>
                {['Phone', 'Role', 'Status', 'Actions'].map(h => (
                  <TableHead key={h} className="uppercase">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground/70">Loading users...</TableCell></TableRow>
              ) : sortedFiltered.map(u => (
                <TableRow key={u.id} className="">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground/70 font-semibold text-xs border border-border shadow-sm">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{u.username}</p>
                        <p className="text-[11px] text-muted-foreground/70 font-medium">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground/70">{u.phone || <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${ROLE_COLORS[u.role]}`}>
                      <Shield size={10} />{u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border ${u.status === 'active' ? 'bg-accent text-accent-foreground border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-accent hover:text-accent-foreground hover:border-primary/20'
                        }`} title="Click to toggle">
                      {u.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                    </button>
                  </TableCell>
                  <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => setEditingUser({ ...u })}><Edit2 /> Edit User</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setResetUser(u); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }}><Key /> Reset Password</DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setDeleteConfirm(u)}><Trash2 /> Delete User</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {sortedFiltered.map(u => (
            <div key={u.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70 font-semibold">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingUser({ ...u })} ><Edit2 size={16} /></Button>
                  <Button variant="ghost" size="icon-sm" className="hover:text-info" onClick={() => { setResetUser(u); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }} ><Key size={16} /></Button>
                  <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => setDeleteConfirm(u)} ><Trash2 size={16} /></Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className={`capitalize ${ROLE_COLORS[u.role]}`}>
                  <Shield size={10} />{u.role.replace('_', ' ')}
                </Badge>
                <button onClick={() => handleToggleStatus(u)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${u.status === 'active' ? 'bg-primary/15 text-accent-foreground' : 'bg-destructive/15 text-destructive'}`}>
                  {u.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <Modal title="Add New User" onClose={() => setShowAddModal(false)} closeOnBackdropClick={false}>
          <form onSubmit={handleAddUser} className="p-5 space-y-4">
            <Field label="Username"><Input type="text" required value={newUser.username} onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))} placeholder="johndoe"  /></Field>
            <Field label="Email"><Input type="email" required value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} placeholder="john@example.com"  /></Field>
            <Field label="Phone"><Input type="tel" value={newUser.phone} onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+91 98765 43210"  /></Field>
            <Field label="Password"><Input type="password" required value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} placeholder="Min. 6 characters"  /></Field>
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
                <p className="mt-1 text-xs text-destructive flex items-center gap-2">
                  {rolesError}
                  <button type="button" onClick={fetchRoles} className="text-primary font-medium hover:underline">
                    Retry
                  </button>
                </p>
              )}
            </Field>
            <Button size="lg" className="w-full"
              type="submit"
              disabled={addLoading || !newUser.role || roles.filter((r) => r.code !== 'user').length === 0}
              
            >
              <Save size={16} /> {addLoading ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </Modal>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
          <form onSubmit={handleEditSave} className="p-5 space-y-4">
            <Field label="Username"><Input type="text" required value={editingUser.username} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, username: e.target.value }))}  /></Field>
            <Field label="Email"><Input type="email" required value={editingUser.email} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, email: e.target.value }))}  /></Field>
            <Field label="Phone"><Input type="tel" value={editingUser.phone || ''} onChange={(e) => setEditingUser((prev: any) => ({ ...prev, phone: e.target.value }))} placeholder="+91 98765 43210"  /></Field>
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
                <p className="mt-1 text-xs text-destructive flex items-center gap-2">
                  {rolesError}
                  <button type="button" onClick={fetchRoles} className="text-primary font-medium hover:underline">
                    Retry
                  </button>
                </p>
              )}
            </Field>
            <Button variant="dark" size="lg" className="w-full" type="submit" disabled={editLoading || (roles.length === 0 && !rolesError)} >
              <Save size={16} /> {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.username}`} onClose={() => setResetUser(null)}>
          <form onSubmit={handleResetPassword} className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Enter a new password for <strong>{resetUser.username}</strong>.</p>
            <div className="relative">
              <Input type={showAdminPw ? 'text' : 'password'} placeholder="Your admin password"
                value={adminPw} onChange={(e) => setAdminPw(e.target.value)} required  />
              <button type="button" onClick={() => setShowAdminPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                {showAdminPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} placeholder="New password (min 6 chars)"
                value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={6} required  />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button size="lg" className="w-full bg-info text-white hover:bg-info hover:text-white bg-info text-white hover:bg-info" type="submit" disabled={resetLoading} >
              <Key size={16} /> {resetLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <Modal title="Delete User" onClose={() => setDeleteConfirm(null)}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteConfirm.username}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}
                >
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDeleteUser(deleteConfirm)}
                >
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
