import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { cn } from '@/lib/utils';

/** Scroll-snap carousel. Swipe, trackpad and keyboard scroll work natively; arrows and dots are extras. */
export function Carousel({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [i, setI] = React.useState(0);
  const slides = React.Children.toArray(children);
  const go = (n: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: Math.max(0, Math.min(slides.length - 1, n)) * el.clientWidth, behavior: 'smooth' });
  };
  const arrow = 'absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition-all hover:scale-110 disabled:pointer-events-none disabled:opacity-0';
  return (
    <div className={cn('relative', className)}>
      <div ref={ref} tabIndex={0} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-xl outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden">
        {slides.map((s, n) => <div key={n} className="w-full shrink-0 snap-center">{s}</div>)}
      </div>
      <button type="button" aria-label="Previous" disabled={i === 0} onClick={() => go(i - 1)} className={cn(arrow, 'left-2')}><ChevronLeftIcon className="size-4" /></button>
      <button type="button" aria-label="Next" disabled={i === slides.length - 1} onClick={() => go(i + 1)} className={cn(arrow, 'right-2')}><ChevronRightIcon className="size-4" /></button>
      <div className="mt-3 flex justify-center gap-1.5">
        {slides.map((_, n) => <button key={n} type="button" aria-label={`Slide ${n + 1}`} onClick={() => go(n)} className={cn('h-1.5 rounded-full bg-border transition-all duration-300', n === i ? 'w-5 bg-primary' : 'w-1.5 hover:bg-muted-foreground')} />)}
      </div>
    </div>
  );
}
