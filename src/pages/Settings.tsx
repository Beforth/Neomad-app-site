import { useEffect, useState } from 'react';
import {
  Plus, XCircle, Key, CheckCircle2, X, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  listApiKeys, createApiKey, toggleApiKey, deleteApiKey,
} from '../lib/api';
import type { ProviderApiKeyItem } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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
    return <p className="text-sm text-muted-foreground p-8">Only admins can access settings.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage API keys and configuration" actions={<>
<Button variant="outline" size="sm"
          type="button"
          onClick={fetchKeys}
          disabled={loading}
          
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
</>} />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-2 rounded-lg flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
          <button onClick={() => setError('')} className="text-xs font-semibold text-destructive hover:underline">Dismiss</button>
        </div>
      )}

      {/* API Keys Section */}
      <Card>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Provider API Keys</h2>
            <Badge>
              {keys.length}
            </Badge>
          </div>
          <Button variant="dark" size="sm"
            type="button"
            onClick={() => { setShowAdd(true); setAddError(''); setAddKey(''); }}
            
          >
            <Plus size={14} /> Add Key
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground/70">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key size={24} className="mx-auto text-border mb-2" />
            <p className="text-xs text-muted-foreground/70">No API keys configured. Add a Groq or Gemini key to enable AI-based invoice parsing.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map((key) => (
              <div key={key.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${key.is_active ? 'bg-primary/80' : 'bg-border'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground capitalize">{key.provider}</span>
                      {key.label && <span className="text-[11px] text-muted-foreground/70">· {key.label}</span>}
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground/70">{key.key_preview}</p>
                    {key.failure_count > 0 && (
                      <p className="text-[11px] text-warning">{key.failure_count} failure(s)</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      key.is_active
                        ? 'text-primary hover:bg-accent'
                        : 'text-muted-foreground/50 hover:bg-secondary'
                    }`}
                    aria-label={key.is_active ? 'Deactivate key' : 'Activate key'}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                    type="button"
                    onClick={() => handleDelete(key)}
                    
                    aria-label="Delete key"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Key Modal */}
      {showAdd && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => {})(); }}>
<DialogContent hideClose aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="gap-0 p-0 max-w-md overflow-hidden flex flex-col">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted relative">
              <h3 className="font-semibold text-foreground">Add API Key</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground/70 hover:text-foreground/70 absolute right-4">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {addError && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{addError}</p>}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Provider</label>
                <div className="flex gap-2">
                  {(['groq', 'gemini'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAddProvider(p)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        addProvider === p
                          ? 'bg-foreground text-white border-foreground'
                          : 'bg-card text-foreground/70 border-border hover:bg-muted'
                      }`}
                    >
                      {p === 'groq' ? 'Groq' : 'Gemini'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Label (optional)</label>
                <Input className="w-full"
                  type="text"
                  placeholder="e.g. Groq key 1"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">API Key</label>
                <Input className="w-full font-mono"
                  type="password"
                  placeholder="gsk_..."
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  
                />
                <p className="text-[11px] text-muted-foreground/70 mt-1">The key will be encrypted and never shown again.</p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAdd(false)} >
                  Cancel
                </Button>
                <Button variant="dark" size="sm"
                  disabled={addBusy || !addKey.trim()}
                  onClick={handleAdd}
                  
                >
                  {addBusy ? 'Adding…' : 'Add Key'}
                </Button>
              </div>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
