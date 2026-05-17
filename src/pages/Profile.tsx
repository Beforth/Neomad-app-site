import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  changePassword,
  completeGmailOAuth,
  disconnectGmail,
  getGmailAuthUrl,
  getGmailStatus,
  listGmailEmails,
  markGmailEmailRead,
  syncRecentGmailEmails,
  toggleGmailEmailStar,
  type GmailEmail,
} from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, LogOut, Mail, Lock, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, Search, Star
} from 'lucide-react';

export default function Profile() {
  const gmailCodeVerifierKey = 'gmail_oauth_code_verifier';

  const { user, token, logout } = useAuth();
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLastSyncAt, setGmailLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailQuery, setEmailQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [oauthHandling, setOauthHandling] = useState(false);
  const [syncResult, setSyncResult] = useState<'success' | 'error' | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const loadGmail = async () => {
    if (!token) return;
    setGmailLoading(true);
    try {
      const status = await getGmailStatus(token);
      setGmailConnected(status.connected);
      setGmailEmail(status.account?.email ?? null);
      setGmailLastSyncAt(status.account?.last_sync_at ?? null);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Failed to load Gmail status');
      setSyncResult('error');
    } finally {
      setGmailLoading(false);
    }
  };

  const loadEmails = async () => {
    if (!token || !gmailConnected) {
      setEmails([]);
      return;
    }
    setEmailsLoading(true);
    try {
      const res = await listGmailEmails(token, {
        q: emailQuery || undefined,
        unread_only: showUnreadOnly || undefined,
        starred_only: showStarredOnly || undefined,
        page: 1,
        page_size: 50,
      });
      setEmails(res.items);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Failed to load emails');
      setSyncResult('error');
    } finally {
      setEmailsLoading(false);
    }
  };

  useEffect(() => {
    loadGmail();
  }, [token]);

  useEffect(() => {
    loadEmails();
  }, [token, gmailConnected, emailQuery, showUnreadOnly, showStarredOnly]);

  useEffect(() => {
    if (!token) return;
    const sp = new URLSearchParams(window.location.search);
    const code = sp.get('code');
    if (!code) return;
    const state = sp.get('state') || undefined;
    const codeVerifier = sessionStorage.getItem(gmailCodeVerifierKey) || undefined;
    setOauthHandling(true);
    completeGmailOAuth(token, code, state, codeVerifier)
      .then(() => {
        setSyncResult('success');
        setSyncMessage('Gmail connected successfully. Initial email sync completed.');
        loadGmail();
        loadEmails();
      })
      .catch((err) => {
        setSyncResult('error');
        setSyncMessage(err instanceof Error ? err.message : 'Failed to complete Gmail OAuth');
      })
      .finally(() => {
        setOauthHandling(false);
        sessionStorage.removeItem(gmailCodeVerifierKey);
        const clean = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, clean);
        setTimeout(() => setSyncResult(null), 3500);
      });
  }, [token]);

  const handleConnect = async () => {
    if (!token) return;
    try {
      setSyncResult(null);
      const auth = await getGmailAuthUrl(token);
      if (auth.code_verifier) {
        sessionStorage.setItem(gmailCodeVerifierKey, auth.code_verifier);
      }
      window.location.assign(auth.authorization_url);
    } catch (err) {
      setSyncResult('error');
      setSyncMessage(err instanceof Error ? err.message : 'Failed to start Gmail OAuth');
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    try {
      await disconnectGmail(token);
      setGmailConnected(false);
      setGmailEmail(null);
      setGmailLastSyncAt(null);
      setEmails([]);
      setSyncResult('success');
      setSyncMessage('Gmail disconnected.');
    } catch (err) {
      setSyncResult('error');
      setSyncMessage(err instanceof Error ? err.message : 'Failed to disconnect Gmail');
    } finally {
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  const handleFetch = async () => {
    if (!token) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncRecentGmailEmails(token, 20);
      await loadGmail();
      await loadEmails();
      setSyncResult('success');
      setSyncMessage(res.message);
    } catch (err) {
      setSyncResult('error');
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  const toggleRead = async (email: GmailEmail) => {
    if (!token) return;
    try {
      const updated = await markGmailEmailRead(token, email.id, !email.is_read);
      setEmails((prev) => prev.map((e) => (e.id === email.id ? updated : e)));
    } catch {
      /* ignore */
    }
  };

  const toggleStar = async (email: GmailEmail) => {
    if (!token) return;
    try {
      const updated = await toggleGmailEmailStar(token, email.id);
      setEmails((prev) => prev.map((e) => (e.id === email.id ? updated : e)));
    } catch {
      /* ignore */
    }
  };

  const unreadCount = useMemo(() => emails.filter((e) => !e.is_read).length, [emails]);

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

          {/* Gmail Connect + Emails */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Mail size={20} className="text-red-500" />
                  Gmail Emails
                </h3>
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                  gmailConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${gmailConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  {gmailConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>

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
                    {syncResult === 'success' ? syncMessage : (syncMessage || 'Sync failed. Please try again.')}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Invoices are created from <strong className="text-zinc-700">inbox emails with PDF attachments</strong> (text must be readable in the PDF).
                  Connect Gmail as an <strong className="text-zinc-700">admin or manager</strong> user, then use Sync — new invoices appear under Invoices.
                </p>
                {gmailConnected ? (
                  <>
                    {/* Connected info */}
                    <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                          G
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{gmailEmail}</p>
                          <p className="text-xs text-zinc-500">Connected Gmail account</p>
                        </div>
                      </div>
                      {gmailLastSyncAt && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-100 pt-3">
                          <Clock size={12} />
                          <span>Last synced: {new Date(gmailLastSyncAt).toLocaleString()}</span>
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
                        {syncing ? 'Fetching...' : 'Sync Recent Emails'}
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={15} />
                        Disconnect
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={emailQuery}
                          onChange={(e) => setEmailQuery(e.target.value)}
                          placeholder="Search subject/sender/snippet..."
                          className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowUnreadOnly((v) => !v)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border ${showUnreadOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-zinc-500 border-zinc-200'}`}
                        >
                          Unread
                        </button>
                        <button
                          onClick={() => setShowStarredOnly((v) => !v)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border ${showStarredOnly ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-zinc-500 border-zinc-200'}`}
                        >
                          Starred
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500 flex items-center justify-between">
                      <span>{emails.length} emails</span>
                      <span>{unreadCount} unread</span>
                    </div>

                    <div className="max-h-80 overflow-y-auto border border-zinc-100 rounded-xl divide-y divide-zinc-100">
                      {emailsLoading ? (
                        <div className="p-4 text-sm text-zinc-500">Loading emails...</div>
                      ) : emails.length === 0 ? (
                        <div className="p-4 text-sm text-zinc-500">No emails found.</div>
                      ) : (
                        emails.map((email) => (
                          <div key={email.id} className="p-3 hover:bg-zinc-50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`text-sm truncate ${email.is_read ? 'text-zinc-600' : 'text-zinc-900 font-semibold'}`}>
                                  {email.subject || '(No subject)'}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">{email.sender}</p>
                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{email.snippet}</p>
                                {email.import_status ? (
                                  <p
                                    className={`text-[10px] mt-1 font-semibold ${
                                      email.import_status === 'imported'
                                        ? 'text-emerald-600'
                                        : email.import_status === 'error'
                                          ? 'text-red-600'
                                          : 'text-amber-600'
                                    }`}
                                    title={email.import_error || undefined}
                                  >
                                    Invoice: {email.import_status.replace(/_/g, ' ')}
                                    {email.imported_invoice_id
                                      ? ` (#${email.imported_invoice_id})`
                                      : ''}
                                    {email.import_error ? ` — ${email.import_error}` : ''}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-zinc-400 mt-1">Invoice: pending scan</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => toggleRead(email)}
                                  className="px-2 py-1 text-[10px] rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                >
                                  {email.is_read ? 'Mark unread' : 'Mark read'}
                                </button>
                                <button
                                  onClick={() => toggleStar(email)}
                                  className={`p-1.5 rounded-lg border ${email.is_starred ? 'bg-amber-50 border-amber-200 text-amber-600' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-100'}`}
                                >
                                  <Star size={13} />
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-2">{new Date(email.sent_at).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Connect your Gmail account, scrape recent emails, and view them directly in this Profile section.
                    </p>
                    <button
                      onClick={handleConnect}
                      disabled={oauthHandling || gmailLoading}
                      className="w-full flex items-center justify-center gap-3 py-3 border-2 border-zinc-200 rounded-xl font-bold text-sm text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 transition-all"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-black">G</div>
                      {oauthHandling ? 'Completing OAuth...' : 'Connect with Google'}
                    </button>
                  </>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
