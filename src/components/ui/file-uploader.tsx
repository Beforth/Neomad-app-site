import * as React from 'react';
import { AlertCircleIcon, CheckCircleIcon, FileIcon, RefreshIcon, UploadIcon, XIcon } from './icons';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

type Status = 'uploading' | 'done' | 'error';
interface Item { id: string; file: File; progress: number; status: Status; error?: string; controller: AbortController }

const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Drop several files and watch each one upload. You supply `upload(file, onProgress, signal)`: call `onProgress(0..100)` as bytes go
 * (XHR's upload.onprogress works) and resolve when done, or throw to show an error. Each row can be cancelled, retried and removed.
 */
export function FileUploader({
  upload,
  accept,
  maxSizeMB = 25,
  maxFiles = 10,
  concurrency = 3,
  onComplete,
  hint = 'Drop files here or click to browse',
  className,
}: {
  upload: (file: File, onProgress: (percent: number) => void, signal: AbortSignal) => Promise<unknown>;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  /** How many uploads run at the same time. */
  concurrency?: number;
  /** Called with the files that finished, after each one completes. */
  onComplete?: (files: File[]) => void;
  hint?: string;
  className?: string;
}) {
  const [items, setItems] = React.useState<Item[]>([]);
  const [over, setOver] = React.useState(false);
  const [note, setNote] = React.useState('');
  const input = React.useRef<HTMLInputElement>(null);
  const started = React.useRef(new Set<string>());
  const patch = (id: string, p: Partial<Item>) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));

  // Start queued rows (progress 0 and not yet started) up to the concurrency limit.
  React.useEffect(() => {
    const running = items.filter((i) => i.status === 'uploading' && started.current.has(i.id)).length;
    items.filter((i) => i.status === 'uploading' && !started.current.has(i.id)).slice(0, Math.max(0, concurrency - running)).forEach((i) => {
      started.current.add(i.id);
      upload(i.file, (p) => patch(i.id, { progress: Math.round(p) }), i.controller.signal)
        .then(() => patch(i.id, { status: 'done', progress: 100 }))
        .catch((e) => { if (!i.controller.signal.aborted) patch(i.id, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed' }); });
    });
  }, [items, concurrency, upload]);

  const done = items.filter((i) => i.status === 'done').length;
  React.useEffect(() => { if (done) onComplete?.(items.filter((i) => i.status === 'done').map((i) => i.file)); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const fine = incoming.filter((f) => f.size <= maxSizeMB * 1048576).slice(0, Math.max(0, maxFiles - items.length));
    setNote(fine.length < incoming.length ? `Skipped ${incoming.length - fine.length}: over ${maxSizeMB} MB or past the ${maxFiles} file limit.` : '');
    setItems((l) => [...l, ...fine.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: 'uploading' as const, controller: new AbortController() }))]);
  };
  const remove = (i: Item) => { i.controller.abort(); started.current.delete(i.id); setItems((l) => l.filter((x) => x.id !== i.id)); };
  const retry = (i: Item) => { started.current.delete(i.id); const controller = new AbortController(); patch(i.id, { status: 'uploading', progress: 0, error: undefined, controller }); };

  return (
    <div className={cn('grid gap-3', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={cn('flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center outline-none transition-all duration-200 hover:border-primary/50 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50', over && 'scale-[1.01] border-primary bg-accent')}
      >
        <span className={cn('grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground transition-transform duration-300', over && '-translate-y-1 bg-primary text-primary-foreground')}><UploadIcon className="size-5" /></span>
        <span className="text-sm font-medium">{hint}</span>
        <span className="text-xs text-muted-foreground">Up to {maxFiles} files, {maxSizeMB} MB each</span>
        <input ref={input} type="file" hidden multiple accept={accept} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {note && <p role="alert" className="text-xs text-destructive">{note}</p>}
      {items.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground" aria-live="polite">{done} of {items.length} uploaded</p>
          <ul className="grid gap-2">
            {items.map((i) => (
              <li key={i.id} className="grid gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  {i.status === 'done' ? <CheckCircleIcon className="size-4 shrink-0 text-success" /> : i.status === 'error' ? <AlertCircleIcon className="size-4 shrink-0 text-destructive" /> : <FileIcon className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0 flex-1 truncate">{i.file.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{i.status === 'uploading' ? `${i.progress}%` : size(i.file.size)}</span>
                  {i.status === 'error' && <button type="button" aria-label={`Retry ${i.file.name}`} onClick={() => retry(i)} className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><RefreshIcon className="size-3.5" /></button>}
                  <button type="button" aria-label={`${i.status === 'uploading' ? 'Cancel' : 'Remove'} ${i.file.name}`} onClick={() => remove(i)} className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><XIcon className="size-3.5" /></button>
                </div>
                {i.status !== 'done' && <Progress value={i.progress} tone={i.status === 'error' ? 'danger' : 'primary'} />}
                {i.status === 'error' && <p role="alert" className="text-xs text-destructive">{i.error}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
