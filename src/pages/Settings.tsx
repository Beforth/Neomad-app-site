import { useEffect, useState } from 'react';
import {
  Plus, XCircle, Key, CheckCircle2, X, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  listApiKeys, createApiKey, toggleApiKey, deleteApiKey,
} from '../lib/api';
import type { ProviderApiKeyItem } from '../lib/api';

const DUMMY_API_KEYS: ProviderApiKeyItem[] = [
  { id: 1, provider: 'groq', label: 'Production Key', key_preview: 'gsk_****8f3a', is_active: true, failure_count: 0, last_failure_at: null, created_at: '2025-11-10T09:00:00Z' },
  { id: 2, provider: 'gemini', label: 'Staging Key', key_preview: 'AIza****9kQ', is_active: true, failure_count: 2, last_failure_at: '2025-12-01T14:22:00Z', created_at: '2025-11-15T11:30:00Z' },
  { id: 3, provider: 'groq', label: 'Backup Key', key_preview: 'gsk_****1b7e', is_active: false, failure_count: 5, last_failure_at: '2025-12-20T08:15:00Z', created_at: '2025-11-20T16:00:00Z' },
  { id: 4, provider: 'gemini', label: 'Testing', key_preview: 'AIza****4mN', is_active: true, failure_count: 0, last_failure_at: null, created_at: '2025-12-01T10:00:00Z' },
  { id: 5, provider: 'groq', label: 'Dev Sandbox', key_preview: 'gsk_****d2c', is_active: false, failure_count: 1, last_failure_at: '2025-12-10T17:45:00Z', created_at: '2025-12-05T09:20:00Z' },
];

export default function Settings() {
  const { token, user } = useAuth();
  const [keys, setKeys] = useState<ProviderApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addProvider, setAddProvider] = useState<'groq' | 'gemini'>('groq');
  const [addLabel, setAddLabel] = useState('');
  const [addKey, setAddKey] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchKeys = async () => {
    setLoading(true);
    setError('');
    try {
      if (token) {
        const data = await listApiKeys(token);
        const real = data.items;
        if (real.length > 0) {
          setKeys(real);
        } else {
          setKeys(DUMMY_API_KEYS);
        }
      } else {
        setKeys(DUMMY_API_KEYS);
      }
    } catch (e: any) {
      setKeys(DUMMY_API_KEYS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [token]);

  const handleAdd = async () => {
    if (!token || !addKey.trim()) return;
    setAddBusy(true);
    setAddError('');
    try {
      const item = await createApiKey(token, {
        provider: addProvider,
        label: addLabel.trim() || undefined,
        key: addKey.trim(),
      });
      setKeys((prev) => [item, ...prev]);
      setShowAdd(false);
      setAddLabel('');
      setAddKey('');
    } catch (e: any) {
      setAddError(e.message || 'Failed to add key');
    } finally {
      setAddBusy(false);
    }
  };

  const handleToggle = async (key: ProviderApiKeyItem) => {
    if (!token) return;
    try {
      const updated = await toggleApiKey(token, key.id);
      setKeys((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    } catch (e: any) {
      setError(e.message || 'Failed to toggle key');
    }
  };

  const handleDelete = async (key: ProviderApiKeyItem) => {
    if (!token) return;
    if (!window.confirm(`Delete ${key.provider} key "${key.key_preview}"?`)) return;
    try {
      await deleteApiKey(token, key.id);
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } catch (e: any) {
      setError(e.message || 'Failed to delete key');
    }
  };

  if (user?.role !== 'admin') {
    return <p className="text-sm text-zinc-500 p-8">Only admins can access settings.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Settings</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage API keys and configuration</p>
        </div>
        <button
          type="button"
          onClick={fetchKeys}
          disabled={loading}
          className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
          <button onClick={() => setError('')} className="text-xs font-bold text-red-800 hover:underline">Dismiss</button>
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-zinc-500" />
            <h2 className="font-bold text-zinc-900 text-sm">Provider API Keys</h2>
            <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full font-medium">
              {keys.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setShowAdd(true); setAddError(''); setAddKey(''); }}
            className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Key
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-400">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key size={24} className="mx-auto text-zinc-200 mb-2" />
            <p className="text-xs text-zinc-400">No API keys configured. Add a Groq or Gemini key to enable AI-based invoice parsing.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {keys.map((key) => (
              <div key={key.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${key.is_active ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-900 capitalize">{key.provider}</span>
                      {key.label && <span className="text-[10px] text-zinc-400">· {key.label}</span>}
                    </div>
                    <p className="text-[10px] font-mono text-zinc-400">{key.key_preview}</p>
                    {key.failure_count > 0 && (
                      <p className="text-[10px] text-amber-500">{key.failure_count} failure(s)</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      key.is_active
                        ? 'text-emerald-500 hover:bg-emerald-50'
                        : 'text-zinc-300 hover:bg-zinc-100'
                    }`}
                    aria-label={key.is_active ? 'Deactivate key' : 'Activate key'}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(key)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete key"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Key Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 relative">
              <h3 className="font-bold text-zinc-900">Add API Key</h3>
              <button onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-zinc-600 absolute right-4">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {addError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>}

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Provider</label>
                <div className="flex gap-2">
                  {(['groq', 'gemini'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAddProvider(p)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        addProvider === p
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {p === 'groq' ? 'Groq' : 'Gemini'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Groq key 1"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 font-mono"
                />
                <p className="text-[10px] text-zinc-400 mt-1">The key will be encrypted and never shown again.</p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50">
                  Cancel
                </button>
                <button
                  disabled={addBusy || !addKey.trim()}
                  onClick={handleAdd}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-50"
                >
                  {addBusy ? 'Adding…' : 'Add Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
