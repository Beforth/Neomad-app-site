import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, ShieldCheck, LogOut, RefreshCw, Unlink, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { user, logout, token } = useAuth();
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean }>({ connected: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/gmail/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setGmailStatus(data));
    }
  }, [user, token]);

  const handleConnectGmail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google/url', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Failed to get auth URL');
        return;
      }

      const { url } = data;
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url,
        'google_auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          setGmailStatus({ connected: true });
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

          {user?.role === 'admin' && (
            <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Mail size={20} className="text-blue-500" />
                  Gmail Integration
                </h3>
                {gmailStatus.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={12} />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                    <AlertCircle size={12} />
                    Not Connected
                  </span>
                )}
              </div>
              
              <p className="text-sm text-zinc-500 mb-6">
                Connect your Gmail account to automatically extract invoices sent from Marg. 
                The system will fetch PDF attachments and create invoice records.
              </p>

              <div className="flex flex-wrap gap-4">
                {!gmailStatus.connected ? (
                  <button 
                    onClick={handleConnectGmail}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
                  >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Connect Google Account
                  </button>
                ) : (
                  <>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium">
                      <RefreshCw size={18} />
                      Fetch Latest Invoices
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors font-medium">
                      <Unlink size={18} />
                      Disconnect
                    </button>
                  </>
                )}
              </div>
              
              {gmailStatus.connected && (
                <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Last synced:</span>
                    <span className="font-medium text-zinc-900">Today, 10:45 AM</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-zinc-500">Sync status:</span>
                    <span className="font-medium text-emerald-600">Active</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
