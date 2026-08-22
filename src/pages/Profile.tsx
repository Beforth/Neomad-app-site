import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  changePassword,
  clearGmailDelayRecords,
  completeGmailOAuth,
  createStoreGeoSetting,
  createWorkingLocation,
  deleteStoreGeoSetting,
  deleteWorkingLocation,
  disconnectGmail,
  getGmailAuthUrl,
  getGmailDelayRecords,
  getGmailMonitorSettings,
  getGmailStatus,
  listGmailEmails,
  listStoreGeoSettings,
  listWorkingLocations,
  markGmailEmailRead,
  syncRecentGmailEmails,
  toggleGmailEmailStar,
  updateGmailMonitorSettings,
  updateStoreGeoSetting,
  updateWorkingLocation,
  type GmailDelayRecord,
  type GmailEmail,
  type StoreGeoSetting,
  type WorkingLocation,
} from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, LogOut, Mail, Lock, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, Search, Star, MapPin, ChevronLeft
} from 'lucide-react';

export default function Profile() {
  const gmailCodeVerifierKey = 'gmail_oauth_code_verifier';

  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLastSyncAt, setGmailLastSyncAt] = useState<string | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailQuery, setEmailQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [oauthHandling, setOauthHandling] = useState(false);
  const [pollInterval, setPollInterval] = useState(60);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [delayRecords, setDelayRecords] = useState<GmailDelayRecord[]>([]);

  const [syncResult, setSyncResult] = useState<'success' | 'error' | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const canManageStoreGeo = user?.role === 'admin' || user?.role === 'manager';
  const [geoForm, setGeoForm] = useState({ latitude: '', longitude: '', radius_meters: '500' });
  const [geoList, setGeoList] = useState<StoreGeoSetting[]>([]);
  const [editingGeoId, setEditingGeoId] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSaving, setGeoSaving] = useState(false);
  const [geoMsg, setGeoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManageWorkLoc = user?.role === 'admin' || user?.role === 'manager';
  const [wlForm, setWlForm] = useState({ name: '', latitude: '', longitude: '', radius_meters: '100' });
  const [wlList, setWlList] = useState<WorkingLocation[]>([]);
  const [editingWlId, setEditingWlId] = useState<number | null>(null);
  const [wlLoading, setWlLoading] = useState(false);
  const [wlSaving, setWlSaving] = useState(false);
  const [wlMsg, setWlMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadGmail = async () => {
    if (!token) return;
    setGmailLoading(true);
    try {
      const status = await getGmailStatus(token);
      setGmailConnected(status.connected);
      setGmailEmail(status.account?.email ?? null);
      setGmailLastSyncAt(status.account?.last_sync_at ?? null);
      setGmailError(status.account?.error_message ?? null);
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
    const loadStoreGeo = async () => {
      if (!token || !canManageStoreGeo) return;
      setGeoLoading(true);
      try {
        const geo = await listStoreGeoSettings(token);
        setGeoList(geo);
      } catch (err) {
        setGeoMsg({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load store geofence',
        });
      } finally {
        setGeoLoading(false);
      }
    };
    loadStoreGeo();
  }, [token, canManageStoreGeo]);

  useEffect(() => {
    const loadWorkLocs = async () => {
      if (!token || !canManageWorkLoc) return;
      setWlLoading(true);
      try {
        const locs = await listWorkingLocations(token);
        setWlList(locs);
      } catch (err) {
        setWlMsg({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load working locations',
        });
      } finally {
        setWlLoading(false);
      }
    };
    loadWorkLocs();
  }, [token, canManageWorkLoc]);

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
      setGmailError(null);
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

  const loadMonitorSettings = async () => {
    if (!token || !gmailConnected) return;
    try {
      const settings = await getGmailMonitorSettings(token);
      setPollInterval(settings.poll_interval_seconds);
    } catch {
      /* use default */
    }
  };

  const saveMonitorSettings = async () => {
    if (!token) return;
    setSettingsSaving(true);
    try {
      await updateGmailMonitorSettings(token, pollInterval);
    } catch {
      /* silent */
    } finally {
      setSettingsSaving(false);
    }
  };

  const fetchDelayRecords = async () => {
    if (!token || !gmailConnected) return;
    try {
      const records = await getGmailDelayRecords(token, 50);
      setDelayRecords(records);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    loadMonitorSettings();
  }, [token, gmailConnected]);

  useEffect(() => {
    if (!gmailConnected) return;
    fetchDelayRecords();
    const id = setInterval(fetchDelayRecords, 5000);
    return () => clearInterval(id);
  }, [token, gmailConnected]);

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

  const handleSaveStoreGeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const latitude = Number(geoForm.latitude);
    const longitude = Number(geoForm.longitude);
    const radiusMeters = Number(geoForm.radius_meters);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setGeoMsg({ type: 'error', text: 'Latitude must be between -90 and 90.' });
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setGeoMsg({ type: 'error', text: 'Longitude must be between -180 and 180.' });
      return;
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > 10000) {
      setGeoMsg({ type: 'error', text: 'Radius must be between 1 and 10000 meters.' });
      return;
    }
    setGeoSaving(true);
    setGeoMsg(null);
    try {
      if (editingGeoId) {
        await updateStoreGeoSetting(token, editingGeoId, {
          latitude,
          longitude,
          radius_meters: radiusMeters,
        });
      } else {
        await createStoreGeoSetting(token, {
          latitude,
          longitude,
          radius_meters: radiusMeters,
        });
      }
      const next = await listStoreGeoSettings(token);
      setGeoList(next);
      setGeoForm({ latitude: '', longitude: '', radius_meters: '500' });
      setEditingGeoId(null);
      setGeoMsg({ type: 'success', text: editingGeoId ? 'Store geofence updated.' : 'Store geofence added.' });
    } catch (err) {
      setGeoMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save store geofence',
      });
    } finally {
      setGeoSaving(false);
    }
  };

  const startEditGeo = (row: StoreGeoSetting) => {
    setEditingGeoId(row.id);
    setGeoForm({
      latitude: String(row.latitude),
      longitude: String(row.longitude),
      radius_meters: String(row.radius_meters),
    });
    setGeoMsg(null);
  };

  const cancelEditGeo = () => {
    setEditingGeoId(null);
    setGeoForm({ latitude: '', longitude: '', radius_meters: '500' });
    setGeoMsg(null);
  };

  const handleDeleteGeo = async (id: number) => {
    if (!token) return;
    const ok = window.confirm('Delete this store geofence?');
    if (!ok) return;
    setGeoSaving(true);
    setGeoMsg(null);
    try {
      await deleteStoreGeoSetting(token, id);
      const next = await listStoreGeoSettings(token);
      setGeoList(next);
      if (editingGeoId === id) {
        cancelEditGeo();
      }
      setGeoMsg({ type: 'success', text: 'Store geofence deleted.' });
    } catch (err) {
      setGeoMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete store geofence',
      });
    } finally {
      setGeoSaving(false);
    }
  };

  // ── Working Location handlers ─────────────────────────────────────────

  const handleSaveWorkLoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const name = wlForm.name.trim();
    if (!name) {
      setWlMsg({ type: 'error', text: 'Location name is required.' });
      return;
    }
    const latitude = Number(wlForm.latitude);
    const longitude = Number(wlForm.longitude);
    const radiusMeters = Number(wlForm.radius_meters);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setWlMsg({ type: 'error', text: 'Latitude must be between -90 and 90.' });
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setWlMsg({ type: 'error', text: 'Longitude must be between -180 and 180.' });
      return;
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > 10000) {
      setWlMsg({ type: 'error', text: 'Radius must be between 1 and 10000 meters.' });
      return;
    }
    setWlSaving(true);
    setWlMsg(null);
    try {
      if (editingWlId) {
        await updateWorkingLocation(token, editingWlId, { name, latitude, longitude, radius_meters: radiusMeters });
      } else {
        await createWorkingLocation(token, { name, latitude, longitude, radius_meters: radiusMeters });
      }
      const next = await listWorkingLocations(token);
      setWlList(next);
      setWlForm({ name: '', latitude: '', longitude: '', radius_meters: '100' });
      setEditingWlId(null);
      setWlMsg({ type: 'success', text: editingWlId ? 'Working location updated.' : 'Working location added.' });
    } catch (err) {
      setWlMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save working location',
      });
    } finally {
      setWlSaving(false);
    }
  };

  const startEditWl = (row: WorkingLocation) => {
    setEditingWlId(row.id);
    setWlForm({
      name: row.name,
      latitude: String(row.latitude),
      longitude: String(row.longitude),
      radius_meters: String(row.radius_meters),
    });
    setWlMsg(null);
  };

  const cancelEditWl = () => {
    setEditingWlId(null);
    setWlForm({ name: '', latitude: '', longitude: '', radius_meters: '100' });
    setWlMsg(null);
  };

  const handleDeleteWl = async (id: number) => {
    if (!token) return;
    const ok = window.confirm('Delete this working location?');
    if (!ok) return;
    setWlSaving(true);
    setWlMsg(null);
    try {
      await deleteWorkingLocation(token, id);
      const next = await listWorkingLocations(token);
      setWlList(next);
      if (editingWlId === id) {
        cancelEditWl();
      }
      setWlMsg({ type: 'success', text: 'Working location deleted.' });
    } catch (err) {
      setWlMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete working location',
      });
    } finally {
      setWlSaving(false);
    }
  };

  const sectionTabs = [
    { id: 'account', label: 'Account', icon: ShieldCheck },
  ] as const;
  type SectionId = (typeof sectionTabs)[number]['id'];
  const [activeSection, setActiveSection] = useState<SectionId>('account');

  return (
    <div className="min-h-full bg-zinc-50">
      {/* Profile hero — negative margins to punch through parent padding */}
      <div className="-mx-4 md:-mx-8 lg:-mx-10 bg-gradient-to-br from-emerald-600 to-emerald-800 pt-10 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {(user?.role === 'delivery_boy' || user?.role === 'staff') && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-4 p-1.5 text-white/80 hover:text-white rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl md:text-3xl text-white font-bold ring-4 ring-white/30 shrink-0">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white truncate">{user?.username}</h1>
              <p className="text-sm text-emerald-100 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl transition-colors text-sm font-semibold backdrop-blur-sm"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-1 flex gap-1 overflow-x-auto">
          {sectionTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeSection === tab.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-4xl mx-auto px-4 pb-10">
        {activeSection === 'account' && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">Account Details</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Your personal information and security settings</p>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center justify-between py-3 border-b border-zinc-50">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Username</p>
                  <p className="text-base font-semibold text-zinc-900 mt-0.5">{user?.username}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
                  {user?.username[0].toUpperCase()}
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-zinc-50">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Email</p>
                  <p className="text-base font-semibold text-zinc-900 mt-0.5 break-all">{user?.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                  @
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Role</p>
                  <p className="text-base font-semibold text-zinc-900 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold capitalize">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>

              {/* Change Password */}
              <div className="pt-4 border-t border-zinc-100">
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
                >
                  <Lock size={15} />
                  {showChangePassword ? 'Cancel' : 'Change Password'}
                </button>
                <AnimatePresence>
                  {showChangePassword && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleChangePassword}
                      className="mt-5 space-y-3 overflow-hidden"
                    >
                      {['current', 'next', 'confirm'].map((field, i) => (
                        <input
                          key={field}
                          type="password"
                          placeholder={['Current password', 'New password', 'Confirm new password'][i]}
                          value={pwForm[field as keyof typeof pwForm]}
                          onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                          className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                          required
                        />
                      ))}
                      {pwMsg && (
                        <p className={`text-sm font-medium ${pwMsg.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg}</p>
                      )}
                      <button
                        type="submit"
                        disabled={pwLoading}
                        className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                      >
                        {pwLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}



        <div className="mt-6 text-center">
          <Link to="/privacy-policy" className="text-xs font-semibold text-zinc-400 hover:text-emerald-600 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
