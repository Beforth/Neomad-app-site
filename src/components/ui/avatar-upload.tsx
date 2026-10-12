import * as React from 'react';
import { Avatar } from './avatar';
import { ImageIcon, TrashIcon } from './icons';
import { cn } from '@/lib/utils';

/**
 * Avatar you click to choose a new picture, with a Remove link. Shows a preview straight away; `onChange` gets the File (or null when removed).
 * Upload it yourself. `src` is the current saved picture, if any.
 */
export function AvatarUpload({ name, src, onChange, maxSizeMB = 3, size = 'xl', className }: { name: string; src?: string; onChange: (file: File | null) => void; maxSizeMB?: number; size?: 'lg' | 'xl'; className?: string }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | undefined>(src);
  const [error, setError] = React.useState('');
  const blob = React.useRef<string | undefined>(undefined);
  React.useEffect(() => () => { if (blob.current) URL.revokeObjectURL(blob.current); }, []);

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Choose an image file.');
    if (f.size > maxSizeMB * 1048576) return setError(`Image must be under ${maxSizeMB} MB.`);
    setError('');
    if (blob.current) URL.revokeObjectURL(blob.current);
    blob.current = URL.createObjectURL(f);
    setPreview(blob.current);
    onChange(f);
  };

  return (
    <div className={cn('inline-grid justify-items-center gap-2', className)}>
      <button type="button" aria-label="Change picture" onClick={() => input.current?.click()} className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <Avatar name={name} src={preview} size={size} />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-foreground/55 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ImageIcon className="size-5" /></span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      {preview && <button type="button" onClick={() => { setPreview(undefined); setError(''); onChange(null); }} className="flex items-center gap-1 text-xs text-muted-foreground outline-none hover:text-destructive focus-visible:text-destructive"><TrashIcon className="size-3.5" /> Remove</button>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
