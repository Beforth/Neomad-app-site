import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  Shield, 
  Mail, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle,
  Search,
  Key
} from 'lucide-react';
import { motion } from 'motion/react';

export default function UserManagement() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'delivery_boy' });

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      setShowAddModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'delivery_boy' });
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">User Management</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage system users and permissions</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <UserPlus size={14} />
          New User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-zinc-100 bg-zinc-50/30">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="text" 
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">User</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Role</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-400">Loading users...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-xs border border-zinc-200 shadow-sm">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 tracking-tight">{u.username}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 
                      u.role === 'manager' ? 'bg-blue-50 text-blue-700' : 
                      'bg-zinc-50 text-zinc-600'
                    }`}>
                      <Shield size={10} />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                      u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {u.status === 'active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-all" title="Edit User">
                        <Edit2 size={14} />
                      </button>
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-all" title="Reset Password">
                        <Key size={14} />
                      </button>
                      <button className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Delete User">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading users...</div>
          ) : users.map((u) => (
            <div key={u.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{u.username}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-zinc-400 hover:text-blue-500">
                    <Edit2 size={16} />
                  </button>
                  <button className="p-2 text-zinc-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                  u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 
                  'bg-zinc-100 text-zinc-700'
                }`}>
                  <Shield size={10} />
                  {u.role}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {u.status === 'active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {u.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
                <select 
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="delivery_boy">Delivery Boy</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors mt-4"
              >
                Create User
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
