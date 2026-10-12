import * as React from 'react';
import { ImageIcon, PlusIcon, XIcon } from './icons';
import { cn } from '@/lib/utils';

/**
 * Grid of image thumbnails with a drop tile to add more. You own the File[] state. Previews are revoked when files go away.
 * `max` caps the count; images over `maxSizeMB` are skipped with a message.
 */
export function ImageUpload({ files, onFilesChange, max = 6, maxSizeMB = 5, className }: { files: File[]; onFilesChange: (files: File[]) => void; max?: number; maxSizeMB?: number; className?: string }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const [note, setNote] = React.useState('');
  const urls = React.useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  React.useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const ok = imgs.filter((f) => f.size <= maxSizeMB * 1048576);
    const room = ok.slice(0, Math.max(0, max - files.length));
    setNote(imgs.length < list.length ? 'Only images are accepted.' : ok.length < imgs.length ? `Images over ${maxSizeMB} MB were skipped.` : room.length < ok.length ? `Limit is ${max} images.` : '');
    if (room.length) onFilesChange([...files, ...room]);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {files.map((f, i) => (
          <div key={urls[i]} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <img src={urls[i]} alt={f.name} className="size-full object-cover" />
            {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">Cover</span>}
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onFilesChange(files.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-foreground/80 text-background opacity-0 outline-none transition-opacity focus-visible:opacity-100 group-hover:opacity-100"><XIcon className="size-3.5" /></button>
          </div>
        ))}
        {files.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
            className={cn('grid aspect-square place-items-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/40', over && 'border-primary bg-accent')}
          >
            <span className="grid place-items-center gap-1">{files.length ? <PlusIcon className="size-5" /> : <ImageIcon className="size-5" />}{files.length ? 'Add' : 'Add images'}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <p className={cn('text-xs', note ? 'text-destructive' : 'text-muted-foreground')}>{note || `${files.length} of ${max} · first image is the cover · up to ${maxSizeMB} MB each`}</p>
    </div>
  );
}
