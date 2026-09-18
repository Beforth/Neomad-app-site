/**
 * Legal document upload grid for the staff form.
 *
 * Uploads happen immediately against an existing staff id, so this step is only
 * available once the employee record exists (edit mode).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DOC_TYPES, listStaffDocuments, uploadStaffDocument, deleteStaffDocument,
  type DocType, type StaffDocument,
} from '../../lib/hrmsStaff';

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocSlot({
  docType, label, side, doc, staffId, onChanged,
}: {
  docType: DocType; label: string; side: string | null;
  doc?: StaffDocument; staffId: number; onChanged: () => void;
}) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const send = useCallback(async (file: File) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await uploadStaffDocument(token, staffId, docType, file);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }, [token, staffId, docType, onChanged]);

  const remove = async () => {
    if (!token || !doc) return;
    setBusy(true);
    setError(null);
    try {
      await deleteStaffDocument(token, staffId, doc.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const isImage = doc?.content_type.startsWith('image/');
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  return (
    <div>
      {side && <p className="text-xs font-medium text-zinc-500 mb-1.5">{side}</p>}
      {doc ? (
        <div className="relative border border-zinc-200 rounded-xl overflow-hidden bg-white group">
          {isImage ? (
            <img src={`${base}${doc.url}`} alt={label}
              className="w-full h-36 object-cover" />
          ) : (
            <div className="w-full h-36 flex flex-col items-center justify-center gap-2 bg-zinc-50 text-zinc-400">
              <FileText size={28} />
              <span className="text-xs font-medium">PDF</span>
            </div>
          )}
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-zinc-100">
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-700 truncate">{doc.original_name || label}</p>
              <p className="text-[10px] text-zinc-400">{humanSize(doc.size_bytes)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Replace">
                <Upload size={14} />
              </button>
              <button type="button" onClick={remove} disabled={busy}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) send(f);
          }}
          disabled={busy}
          className={`w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors ${
            dragging ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
          }`}
        >
          {busy ? <Loader2 size={20} className="animate-spin text-zinc-400" />
                : <Upload size={20} className="text-zinc-400" />}
          <span className="text-xs font-medium text-zinc-500">
            {busy ? 'Uploading…' : 'Drag to Upload'}
          </span>
          {!busy && <span className="text-[11px] text-emerald-600 font-semibold underline">Browse Files</span>}
        </button>
      )}
      <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) send(f);
          e.target.value = '';
        }} />
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

export default function StaffDocuments({ staffId }: { staffId: number | null }) {
  const { token } = useAuth();
  const [docs, setDocs] = useState<StaffDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!token || !staffId) return;
    setLoading(true);
    listStaffDocuments(token, staffId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [token, staffId]);

  useEffect(() => { reload(); }, [reload]);

  if (!staffId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Save the employee first — documents attach to an existing record.
      </div>
    );
  }

  const byType = (t: DocType) => docs.find((d) => d.doc_type === t);
  const groups = [
    { title: 'Aadhaar Card', types: ['aadhaar_front', 'aadhaar_back'] as DocType[] },
    { title: 'Driving Licence', types: ['driving_licence_front', 'driving_licence_back'] as DocType[] },
    { title: 'PAN Card', types: ['pan_card'] as DocType[] },
    { title: 'Passport Size Photo', types: ['passport_photo'] as DocType[] },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 flex items-center gap-1.5">
        <FileText size={13} />
        Supported: PNG, JPG, JPEG and PDF &nbsp;|&nbsp; Max size: 10 MB (images) and 1 MB (PDFs)
      </p>
      {loading && <p className="text-sm text-zinc-400">Loading documents…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((g) => (
          <div key={g.title} className="border border-zinc-200 rounded-xl p-4 bg-white">
            <h4 className="text-sm font-semibold text-zinc-900 mb-3">{g.title}</h4>
            <div className={`grid gap-3 ${g.types.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {g.types.map((t) => {
                const meta = DOC_TYPES.find((d) => d.value === t)!;
                return (
                  <DocSlot key={t} docType={t} label={meta.label} side={meta.side}
                    doc={byType(t)} staffId={staffId} onChanged={reload} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
