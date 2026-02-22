import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Profile</h1>
        <p className="text-zinc-500">Manage your account and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl text-white font-bold">
              {user?.username[0].toUpperCase()}
            </div>
            <h3 className="text-lg font-bold text-zinc-900">{user?.username}</h3>
            <p className="text-sm text-zinc-500 capitalize">{user?.role}</p>
            <div className="mt-6 pt-6 border-t border-zinc-100">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" />
              Account Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Email Address</label>
                <p className="text-zinc-900 font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Role</label>
                <p className="text-zinc-900 font-medium capitalize">{user?.role}</p>
              </div>
              <button className="text-emerald-600 text-sm font-medium hover:underline">Change Password</button>
            </div>
          </div>

{/* Gmail integration disabled in UI-only mode */}
        </div>
      </div>
    </div>
  );
}
