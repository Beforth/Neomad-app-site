import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, Shield, Trash2, Edit2, CheckCircle2,
  XCircle, Search, Key, X, Save, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockApi } from '../lib/mockApi';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  delivery_boy: 'bg-zinc-50 text-zinc-600',
  staff: 'bg-emerald-50 text-emerald-700',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', phone: '', password: '', role: 'delivery_boy' });
  const [toast, setToast] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const data = await mockApi.getUsers();
    setUsers(data);
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await mockApi.addUser(newUser);
    setShowAddModal(false);
    setNewUser({ username: '', email: '', phone: '', password: '', role: 'delivery_boy' });
    fetchUsers();
    showToast('User created successfully');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await mockApi.updateUser(editingUser.id, editingUser);
    setEditingUser(null);
    fetchUsers();
    showToast('User updated successfully');
  };

  const handleToggleStatus = async (u: any) => {
    await mockApi.toggleUserStatus(u.id);
    fetchUsers();
    showToast(`User ${u.status === 'active' ? 'deactivated' : 'activated'}`);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) return;
    await mockApi.updateUser(resetUser.id, { password: newPw });
    setResetUser(null);
    setNewPw('');
    showToast('Password reset successfully');
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const Modal = ({ title, onClose, children }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );

  const Field = ({ label, children }: any) => (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {children}
    </div>
  );

  const Input = (props: any) => (
    <input {...props} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all" />
  );

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
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <UserPlus size={14} /> New User
        </button>
      </div>

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
                {['User', 'Phone', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-zinc-400">Loading users...</td></tr>
              ) : filtered.map(u => (
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
                      <button onClick={() => { setResetUser(u); setNewPw(''); }}
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
          {filtered.map(u => (
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
                  <button onClick={() => { setResetUser(u); setNewPw(''); }} className="p-2 text-zinc-400 hover:text-blue-600"><Key size={16} /></button>
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
        <Modal title="Add New User" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddUser} className="p-5 space-y-4">
            <Field label="Username"><Input type="text" required value={newUser.username} onChange={(e: any) => setNewUser({ ...newUser, username: e.target.value })} placeholder="johndoe" /></Field>
            <Field label="Email"><Input type="email" required value={newUser.email} onChange={(e: any) => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@example.com" /></Field>
            <Field label="Phone"><Input type="tel" value={newUser.phone} onChange={(e: any) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
            <Field label="Password"><Input type="password" required value={newUser.password} onChange={(e: any) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min. 6 characters" /></Field>
            <Field label="Role">
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm">
                <option value="delivery_boy">Delivery Boy</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <button type="submit" className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
              <Save size={16} /> Create User
            </button>
          </form>
        </Modal>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
          <form onSubmit={handleEditSave} className="p-5 space-y-4">
            <Field label="Username"><Input type="text" required value={editingUser.username} onChange={(e: any) => setEditingUser({ ...editingUser, username: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" required value={editingUser.email} onChange={(e: any) => setEditingUser({ ...editingUser, email: e.target.value })} /></Field>
            <Field label="Phone"><Input type="tel" value={editingUser.phone || ''} onChange={(e: any) => setEditingUser({ ...editingUser, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
            <Field label="Role">
              <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm">
                <option value="delivery_boy">Delivery Boy</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <button type="submit" className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
              <Save size={16} /> Save Changes
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
              <Input type={showPw ? 'text' : 'password'} placeholder="New password (min 6 chars)"
                value={newPw} onChange={(e: any) => setNewPw(e.target.value)} minLength={6} required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Key size={16} /> Reset Password
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
