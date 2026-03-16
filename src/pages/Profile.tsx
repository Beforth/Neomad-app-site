import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, LogOut, Mail, Lock, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, Download
} from 'lucide-react';

const GMAIL_STORAGE_KEY = 'gmail_connection';

function getGmailState() {
  const stored = localStorage.getItem(GMAIL_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {
    connected: false,
    email: null,
    lastSync: null,
    tokenExpired: false,
  };
}

function saveGmailState(state: any) {
  localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify(state));
}

export default function Profile() {
  const { user, token, logout } = useAuth();
  const [gmailState, setGmailState] = useState(getGmailState());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<'success' | 'error' | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleConnect = () => {
    // Mock OAuth — in real app this would open Google OAuth popup
    const mockEmail = 'invoices@yourdomain.com';
    const next = { connected: true, email: mockEmail, lastSync: new Date().toISOString(), tokenExpired: false };
    saveGmailState(next);
    setGmailState(next);
    setSyncResult('success');
    setTimeout(() => setSyncResult(null), 3000);
  };

  const handleDisconnect = () => {
    const next = { connected: false, email: null, lastSync: null, tokenExpired: false };
    saveGmailState(next);
    setGmailState(next);
  };

  const handleFetch = async () => {
    setSyncing(true);
    setSyncResult(null);
    await new Promise(r => setTimeout(r, 1800));
    const next = { ...gmailState, lastSync: new Date().toISOString(), tokenExpired: false };
    saveGmailState(next);
    setGmailState(next);
    setSyncing(false);
    setSyncResult('success');
    setTimeout(() => setSyncResult(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg('Passwords do not match');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg('Password must be at least 6 characters');
      return;
    }
    if (!token) {
      setPwMsg('You must be logged in to change password.');
      return;
    }
    setPwMsg('');
    setPwLoading(true);
    try {
      await changePassword(token, pwForm.current, pwForm.next);
      setPwMsg('Password changed successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => {
        setPwMsg('');
        setShowChangePassword(false);
      }, 2000);
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : 'Change password failed');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Profile</h1>
        <p className="text-zinc-500">Manage your account and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl text-white font-bold">
              {user?.username[0].toUpperCase()}
            </div>
            <h3 className="text-lg font-bold text-zinc-900">{user?.username}</h3>
            <p className="text-sm text-zinc-500 capitalize">{user?.role?.replace('_', ' ')}</p>
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

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          {/* Account Details */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" />
              Account Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Username</label>
                <p className="text-zinc-900 font-medium">{user?.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Email Address</label>
                <p className="text-zinc-900 font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Role</label>
                <p className="text-zinc-900 font-medium capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>

              {/* Change Password */}
              <div className="pt-2">
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="flex items-center gap-2 text-emerald-600 text-sm font-semibold hover:text-emerald-700"
                >
                  <Lock size={14} />
                  {showChangePassword ? 'Cancel' : 'Change Password'}
                </button>
                <AnimatePresence>
                  {showChangePassword && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleChangePassword}
                      className="mt-4 space-y-3 overflow-hidden"
                    >
                      {['current', 'next', 'confirm'].map((field, i) => (
                        <input
                          key={field}
                          type="password"
                          placeholder={['Current password', 'New password', 'Confirm new password'][i]}
                          value={pwForm[field as keyof typeof pwForm]}
                          onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                          required
                        />
                      ))}
                      {pwMsg && (
                        <p className={`text-xs font-medium ${pwMsg.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg}</p>
                      )}
                      <button
                        type="submit"
                        disabled={pwLoading}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                      >
                        {pwLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Gmail Connect — Admin only */}
          {user?.role === 'admin' && (
            <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Mail size={20} className="text-red-500" />
                  Connect Gmail
                </h3>
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                  gmailState.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${gmailState.connected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  {gmailState.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              {/* Token expired warning */}
              {gmailState.tokenExpired && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-amber-800 text-sm">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  <p>Your Gmail token has expired. Please reconnect to resume invoice sync.</p>
                </div>
              )}

              {/* Sync result banner */}
              <AnimatePresence>
                {syncResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mb-4 rounded-xl p-3 flex items-center gap-3 text-sm font-medium ${
                      syncResult === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {syncResult === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {syncResult === 'success' ? 'Invoices fetched successfully!' : 'Sync failed. Please try again.'}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {gmailState.connected ? (
                  <>
                    {/* Connected info */}
                    <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                          G
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{gmailState.email}</p>
                          <p className="text-xs text-zinc-500">Connected Gmail account</p>
                        </div>
                      </div>
                      {gmailState.lastSync && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-100 pt-3">
                          <Clock size={12} />
                          <span>Last synced: {new Date(gmailState.lastSync).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleFetch}
                        disabled={syncing}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-60"
                      >
                        <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Fetching...' : 'Fetch Latest Invoices'}
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={15} />
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Connect your Gmail account to automatically fetch invoice PDFs from Marg software emails. New invoices will be imported automatically.
                    </p>
                    <button
                      onClick={handleConnect}
                      className="w-full flex items-center justify-center gap-3 py-3 border-2 border-zinc-200 rounded-xl font-bold text-sm text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 transition-all"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-black">G</div>
                      Connect with Google
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
