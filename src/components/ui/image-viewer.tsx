import * as React from 'react';
import * as D from '@radix-ui/react-dialog';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from './icons';
import { cn } from '@/lib/utils';

export interface ViewerImage {
  src: string;
  alt: string;
}

/**
 * Full-screen lightbox. Arrow keys or the side buttons change image, click the picture to zoom, Escape closes.
 * Controlled: `index` is the open image, or `null` when closed.
 */
export function ImageViewer({ images, index, onIndexChange }: { images: ViewerImage[]; index: number | null; onIndexChange: (i: number | null) => void }) {
  const [zoom, setZoom] = React.useState(false);
  const open = index !== null;
  const go = (d: number) => { setZoom(false); onIndexChange(((index ?? 0) + d + images.length) % images.length); };
  React.useEffect(() => setZoom(false), [open]);
  const img = images[index ?? 0];
  const nav = 'absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white outline-none backdrop-blur transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60';

  return (
    <D.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/90 animate-in" />
        <D.Content
          aria-describedby={undefined}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }}
          className="fixed inset-0 z-50 grid place-items-center outline-none"
        >
          <D.Title className="sr-only">{img.alt}</D.Title>
          <div className={cn('flex size-full items-center justify-center p-12', zoom ? 'overflow-auto' : 'overflow-hidden')}>
            <img
              src={img.src}
              alt={img.alt}
              onClick={() => setZoom(!zoom)}
              className={cn('select-none rounded-lg object-contain transition-[max-width,max-height] duration-200', zoom ? 'max-h-none max-w-none cursor-zoom-out' : 'max-h-full max-w-full cursor-zoom-in')}
              style={zoom ? { width: '170%' } : undefined}
            />
          </div>
          <D.Close aria-label="Close" className={cn(nav, 'right-4 top-8 size-9')}><XIcon className="size-4" /></D.Close>
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Previous image" onClick={() => go(-1)} className={cn(nav, 'left-4')}><ChevronLeftIcon className="size-5" /></button>
              <button type="button" aria-label="Next image" onClick={() => go(1)} className={cn(nav, 'right-4')}><ChevronRightIcon className="size-5" /></button>
            </>
          )}
          <p className="absolute inset-x-0 bottom-4 text-center text-xs text-white/70">{img.alt} · {(index ?? 0) + 1} / {images.length}</p>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
