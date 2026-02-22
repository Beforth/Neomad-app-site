import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal, Database, Play, Trash2, Edit3, Plus, RefreshCw,
  Lock, LogOut, AlertTriangle, Info, CheckCircle, XCircle,
  ChevronRight, Download, Search, Filter, Eye, Save, X
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const DEV_PIN = 'dev1234';

const LOG_LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const;
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const DB_TABLES = ['mock_users', 'mock_invoices'] as const;
type TableKey = typeof DB_TABLES[number];

const INITIAL_USERS = [
  { id: 1, username: 'admin', email: 'admin@example.com', password: 'admin123', role: 'admin', status: 'active' },
  { id: 2, username: 'manager', email: 'manager@example.com', password: 'manager123', role: 'manager', status: 'active' },
  { id: 3, username: 'delivery1', email: 'boy1@example.com', password: 'boy123', role: 'delivery_boy', status: 'active' }
];

const INITIAL_INVOICES = [
  { id: 1, invoice_number: 'INV-2024-001', hospital_name: 'City Hospital', amount: 4500, status: 'pending', created_at: new Date().toISOString() },
  { id: 2, invoice_number: 'INV-2024-002', hospital_name: 'Metro Clinic', amount: 2800, status: 'pending', created_at: new Date().toISOString() },
  { id: 3, invoice_number: 'INV-2024-003', hospital_name: 'St. Mary Medical', amount: 3200, status: 'delivered', assigned_to: 3, created_at: new Date().toISOString(), delivered_at: new Date().toISOString() },
];

interface LogEntry {
  id: number;
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
}

// ─── Log Generator ──────────────────────────────────────────────────────────
const LOG_TEMPLATES: { level: LogLevel; source: string; messages: string[] }[] = [
  { level: 'INFO', source: 'HTTP', messages: ['GET /api/invoices 200 12ms', 'POST /api/login 200 34ms', 'GET /api/stats 200 8ms', 'GET /api/users 200 15ms'] },
  { level: 'INFO', source: 'DB', messages: ['Query executed: SELECT * FROM invoices', 'Connection pool: 3/10 active', 'Index scan on invoices.status'] },
  { level: 'WARN', source: 'AUTH', messages: ['Token expires in 5 minutes for user admin', 'Rate limit 80% reached on /api/login', 'Session refresh triggered'] },
  { level: 'ERROR', source: 'GMAIL', messages: ['OAuth token refresh failed: 401 Unauthorized', 'Failed to fetch emails: NETWORK_ERROR', 'Retry attempt 3/3 failed'] },
  { level: 'DEBUG', source: 'WS', messages: ['Socket connected: client_892', 'Ping received from client_892', 'Broadcast to 3 clients: invoice_update'] },
  { level: 'INFO', source: 'CRON', messages: ['Invoice sync job started', 'Processed 12 new email attachments', 'Delivery status check completed'] },
  { level: 'WARN', source: 'DB', messages: ['Slow query detected (>100ms): SELECT * FROM invoices JOIN users', 'Connection pool nearing limit: 9/10'] },
];

let logIdCounter = 1;
function generateLog(): LogEntry {
  const t = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
  const msg = t.messages[Math.floor(Math.random() * t.messages.length)];
  return {
    id: logIdCounter++,
    ts: new Date().toISOString(),
    level: t.level,
    source: t.source,
    message: msg,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const getStored = (key: string, fallback: any) => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
};
const setStored = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

const LEVEL_STYLE: Record<LogLevel, string> = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-zinc-500',
};
const LEVEL_BADGE: Record<LogLevel, string> = {
  INFO: 'bg-blue-500/20 text-blue-300',
  WARN: 'bg-yellow-500/20 text-yellow-300',
  ERROR: 'bg-red-500/20 text-red-300',
  DEBUG: 'bg-zinc-700/60 text-zinc-400',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>(() => Array.from({ length: 20 }, generateLog));
  const [filter, setFilter] = useState<'ALL' | LogLevel>('ALL');
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setLogs(prev => [...prev.slice(-499), generateLog()]);
    }, 1200);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const visible = logs.filter(l => {
    if (filter !== 'ALL' && l.level !== filter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportLogs = () => {
    const text = visible.map(l => `[${l.ts}] [${l.level}] [${l.source}] ${l.message}`).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/plain,' + encodeURIComponent(text);
    a.download = 'server-logs.txt'; a.click();
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…"
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="flex gap-1">
          {LOG_LEVELS.map(l => (
            <button key={l} onClick={() => setFilter(l)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${filter === l ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => setPaused(p => !p)}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-all ${paused ? 'bg-yellow-500/20 text-yellow-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button onClick={exportLogs} className="px-3 py-1.5 text-xs rounded-lg font-medium bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
          <Download size={12} /> Export
        </button>
        <button onClick={() => setLogs([])} className="px-3 py-1.5 text-xs rounded-lg font-medium bg-zinc-800 text-red-400 hover:text-red-300 flex items-center gap-1.5">
          <Trash2 size={12} /> Clear
        </button>
      </div>

      <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden font-mono text-xs">
        <div className="h-full overflow-y-auto p-3 space-y-0.5" onScroll={e => {
          const el = e.currentTarget;
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}>
          <AnimatePresence initial={false}>
            {visible.map(log => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 py-0.5 hover:bg-zinc-900/50 rounded px-1 group">
                <span className="text-zinc-600 shrink-0 text-[10px] mt-0.5 group-hover:text-zinc-500">
                  {new Date(log.ts).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${LEVEL_BADGE[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-purple-400 shrink-0 text-[10px] min-w-[44px]">[{log.source}]</span>
                <span className={`${LEVEL_STYLE[log.level]} break-all`}>{log.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>{visible.length} entries shown</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="accent-emerald-500" />
          Auto-scroll
        </label>
      </div>
    </div>
  );
}

// ─── DB Viewer ───────────────────────────────────────────────────────────────
function DatabaseViewer() {
  const [activeTable, setActiveTable] = useState<TableKey>('mock_users');
  const [rows, setRows] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState<string>('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const FALLBACKS: Record<TableKey, any[]> = { mock_users: INITIAL_USERS, mock_invoices: INITIAL_INVOICES };

  const loadTable = useCallback(() => {
    setRows(getStored(activeTable, FALLBACKS[activeTable]));
    setError('');
    setEditingRow(null);
    setSearch('');
  }, [activeTable]);

  useEffect(() => { loadTable(); }, [loadTable]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const save = (updated: any[]) => {
    setStored(activeTable, updated);
    setRows(updated);
  };

  const deleteRow = (idx: number) => {
    save(rows.filter((_, i) => i !== idx));
  };

  const startEdit = (row: any) => {
    setEditingRow(row);
    setEditDraft(JSON.stringify(row, null, 2));
    setError('');
  };

  const commitEdit = () => {
    try {
      const updated = JSON.parse(editDraft);
      save(rows.map(r => r.id === editingRow.id ? updated : r));
      setEditingRow(null);
    } catch { setError('Invalid JSON'); }
  };

  const commitAdd = () => {
    try {
      const newRow = JSON.parse(newRowDraft);
      save([...rows, newRow]);
      setIsAdding(false);
      setNewRowDraft('');
    } catch { setError('Invalid JSON'); }
  };

  const startAdd = () => {
    const template = rows.length > 0 ? { ...rows[0] } : {};
    Object.keys(template).forEach(k => { template[k] = typeof template[k] === 'number' ? 0 : ''; });
    template.id = (Math.max(0, ...rows.map((r: any) => r.id || 0)) + 1);
    setNewRowDraft(JSON.stringify(template, null, 2));
    setIsAdding(true);
    setError('');
  };

  const exportTable = () => {
    const text = JSON.stringify(rows, null, 2);
    const a = document.createElement('a'); a.href = 'data:application/json,' + encodeURIComponent(text);
    a.download = `${activeTable}.json`; a.click();
  };

  const resetTable = () => {
    save(FALLBACKS[activeTable]);
  };

  const filtered = rows.filter(row =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Table Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {DB_TABLES.map(t => (
            <button key={t} onClick={() => setActiveTable(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTable === t ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:border-emerald-500" />
        </div>
        <button onClick={startAdd} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium transition-all">
          <Plus size={14} /> Add Row
        </button>
        <button onClick={exportTable} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-3 py-1.5 rounded-lg font-medium transition-all">
          <Download size={14} /> Export
        </button>
        <button onClick={resetTable} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-yellow-400 text-sm px-3 py-1.5 rounded-lg font-medium transition-all" title="Reset to defaults">
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {(editingRow || isAdding) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
              <h3 className="text-zinc-100 font-bold mb-4 flex items-center gap-2">
                {isAdding ? <><Plus size={16} className="text-emerald-400" /> Add New Row</> : <><Edit3 size={16} className="text-yellow-400" /> Edit Row</>}
              </h3>
              <textarea
                value={isAdding ? newRowDraft : editDraft}
                onChange={e => isAdding ? setNewRowDraft(e.target.value) : setEditDraft(e.target.value)}
                className="w-full h-56 bg-zinc-950 border border-zinc-700 text-emerald-300 font-mono text-sm p-3 rounded-lg resize-none focus:outline-none focus:border-emerald-500"
              />
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => { setEditingRow(null); setIsAdding(false); setError(''); }}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium">Cancel</button>
                <button onClick={isAdding ? commitAdd : commitEdit}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1.5">
                  <Save size={14} /> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
            <tr>
              {columns.map(col => (
                <th key={col} className="text-left px-4 py-3 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  {col}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors group">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2.5 text-zinc-300 max-w-[200px] truncate">
                    {col === 'password' ? <span className="text-zinc-600">••••••••</span> : String(row[col] ?? '—')}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(row)} className="p-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => deleteRow(idx)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="text-center py-12 text-zinc-600">No rows found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-zinc-600">{filtered.length} rows in <span className="text-zinc-400 font-mono">{activeTable}</span></div>
    </div>
  );
}

// ─── Query Runner ──────────────────────────────────────────────────────────
function QueryRunner() {
  const [query, setQuery] = useState('SELECT * FROM mock_users WHERE role = "admin"');
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const EXAMPLE_QUERIES = [
    'SELECT * FROM mock_users',
    'SELECT * FROM mock_users WHERE role = "manager"',
    'SELECT * FROM mock_invoices WHERE status = "pending"',
    'SELECT * FROM mock_invoices WHERE amount > 3000',
    'DELETE FROM mock_invoices WHERE status = "cancelled"',
    'UPDATE mock_users SET status = "active" WHERE id = 2',
    'INSERT INTO mock_users VALUES {"id":99,"username":"test","email":"t@t.com","password":"test123","role":"manager","status":"active"}',
  ];

  const runQuery = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    await new Promise(r => setTimeout(r, 300));
    try {
      const q = query.trim().toUpperCase();
      const tableMatch = query.match(/FROM\s+(\w+)/i) || query.match(/INTO\s+(\w+)/i) || query.match(/UPDATE\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : null;

      if (!tableName) throw new Error('Could not determine table name from query');
      const fallbacks: Record<string, any[]> = { mock_users: INITIAL_USERS, mock_invoices: INITIAL_INVOICES };
      let data: any[] = getStored(tableName, fallbacks[tableName] || []);

      if (q.startsWith('SELECT')) {
        const whereMatch = query.match(/WHERE\s+(.+)/i);
        if (whereMatch) {
          const cond = whereMatch[1].trim();
          const colMatch = cond.match(/(\w+)\s*([=><!]+)\s*["']?([^"']+)["']?/);
          if (colMatch) {
            const [, col, op, val] = colMatch;
            data = data.filter(row => {
              const rv = String(row[col] ?? '');
              const nv = Number(val);
              if (op === '=' || op === '==') return rv === val || row[col] === (isNaN(nv) ? val : nv);
              if (op === '>') return Number(row[col]) > nv;
              if (op === '<') return Number(row[col]) < nv;
              if (op === '>=') return Number(row[col]) >= nv;
              if (op === '<=') return Number(row[col]) <= nv;
              if (op === '!=') return rv !== val;
              return true;
            });
          }
        }
        setResult(data);
        setHistory(prev => [query, ...prev.slice(0, 9)]);

      } else if (q.startsWith('DELETE')) {
        const whereMatch = query.match(/WHERE\s+(.+)/i);
        let removed = 0;
        if (whereMatch) {
          const cond = whereMatch[1].trim();
          const colMatch = cond.match(/(\w+)\s*[=><!]+\s*["']?([^"']+)["']?/);
          if (colMatch) {
            const [, col, val] = colMatch;
            const original = data.length;
            data = data.filter(row => String(row[col]) !== val && row[col] !== (isNaN(Number(val)) ? val : Number(val)));
            removed = original - data.length;
          }
        }
        setStored(tableName, data);
        setResult([{ _result: `Deleted ${removed} row(s)` }]);
        setHistory(prev => [query, ...prev.slice(0, 9)]);

      } else if (q.startsWith('UPDATE')) {
        const setMatch = query.match(/SET\s+(\w+)\s*=\s*["']?([^"'\s]+)["']?/i);
        const whereMatch = query.match(/WHERE\s+(.+)/i);
        let updated = 0;
        if (setMatch) {
          const [, col, val] = setMatch;
          data = data.map(row => {
            if (whereMatch) {
              const cond = whereMatch[1].trim();
              const cm = cond.match(/(\w+)\s*[=><!]+\s*["']?([^"']+)["']?/);
              if (cm && String(row[cm[1]]) !== cm[2] && row[cm[1]] !== Number(cm[2])) return row;
            }
            updated++;
            return { ...row, [col]: isNaN(Number(val)) ? val : Number(val) };
          });
        }
        setStored(tableName, data);
        setResult([{ _result: `Updated ${updated} row(s)` }]);
        setHistory(prev => [query, ...prev.slice(0, 9)]);

      } else if (q.startsWith('INSERT')) {
        const jsonMatch = query.match(/VALUES\s+(\{.+\})/is);
        if (!jsonMatch) throw new Error('INSERT requires VALUES { json object }');
        const newRow = JSON.parse(jsonMatch[1]);
        data.push(newRow);
        setStored(tableName, data);
        setResult([{ _result: 'Row inserted successfully' }]);
        setHistory(prev => [query, ...prev.slice(0, 9)]);

      } else {
        throw new Error(`Unsupported statement. Supported: SELECT, DELETE, UPDATE, INSERT`);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Editor */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Query Editor</div>
        <div className="relative">
          <textarea value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runQuery(); }}
            rows={6}
            className="w-full bg-zinc-950 border border-zinc-700 text-emerald-300 font-mono text-sm p-4 rounded-xl resize-none focus:outline-none focus:border-emerald-500 pr-16"
            placeholder="SELECT * FROM mock_users" />
          <span className="absolute bottom-3 right-3 text-zinc-600 text-[10px]">Ctrl+Enter</span>
        </div>
        <button onClick={runQuery} disabled={running}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 self-start">
          <Play size={14} /> {running ? 'Running…' : 'Run Query'}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <XCircle size={14} /> {error}
          </div>
        )}

        {result && (
          <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
            {result.length === 0 ? (
              <div className="text-center py-10 text-zinc-600 text-sm">No results returned</div>
            ) : result[0]?._result ? (
              <div className="p-4 flex items-center gap-2 text-emerald-400 font-medium text-sm">
                <CheckCircle size={16} /> {result[0]._result}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                  <tr>{Object.keys(result[0]).map(col => (
                    <th key={col} className="text-left px-4 py-3 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">{col}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {result.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-4 py-2.5 text-zinc-300 font-mono">{String(v ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Right: Examples + History */}
      <div className="w-64 flex flex-col gap-4 shrink-0">
        <div>
          <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Example Queries</div>
          <div className="space-y-1">
            {EXAMPLE_QUERIES.map((q, i) => (
              <button key={i} onClick={() => setQuery(q)}
                className="w-full text-left text-xs text-zinc-400 hover:text-emerald-400 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 rounded-lg font-mono transition-colors truncate">
                {q}
              </button>
            ))}
          </div>
        </div>
        {history.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">History</div>
            <div className="space-y-1">
              {history.map((q, i) => (
                <button key={i} onClick={() => setQuery(q)}
                  className="w-full text-left text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 hover:bg-zinc-900 px-3 py-2 rounded-lg font-mono transition-colors truncate">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
const TABS = [
  { id: 'logs', label: 'Server Logs', icon: Terminal },
  { id: 'db', label: 'Database', icon: Database },
  { id: 'query', label: 'Query Runner', icon: Play },
] as const;

type TabId = typeof TABS[number]['id'];

export default function DeveloperPortal() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('dev_authed') === '1');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [tab, setTab] = useState<TabId>('logs');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === DEV_PIN) {
      sessionStorage.setItem('dev_authed', '1');
      setAuthed(true);
    } else {
      setPinError('Invalid developer PIN');
      setPin('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dev_authed');
    setAuthed(false);
    setPin('');
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Lock size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-zinc-100 font-bold text-lg">Developer Portal</h1>
              <p className="text-zinc-500 text-xs">Restricted access – authorised personnel only</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {pinError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} /> {pinError}
              </div>
            )}
            <div>
              <label className="block text-zinc-400 text-sm mb-1.5 font-medium">Developer PIN</label>
              <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(''); }}
                placeholder="Enter PIN"
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-mono text-center text-2xl tracking-widest" />
              <p className="text-zinc-600 text-xs mt-1.5">Hint: dev1234</p>
            </div>
            <button type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Authenticate
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
            <Terminal size={14} className="text-emerald-400" />
          </div>
          <span className="font-bold text-zinc-100">Developer Portal</span>
          <span className="text-zinc-700 text-xs font-mono">v1.0.0</span>
        </div>

        <div className="flex gap-1 ml-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-zinc-500">Connected to mock DB</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="h-full" style={{ height: 'calc(100vh - 100px)' }}>
            {tab === 'logs' && <LogViewer />}
            {tab === 'db' && <DatabaseViewer />}
            {tab === 'query' && <QueryRunner />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
