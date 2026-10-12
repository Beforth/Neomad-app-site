import * as React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface OnboardingSlide {
  title: string;
  description: string;
  /** Illustration area: an icon, image or any element. */
  visual?: React.ReactNode;
}

/** First-run intro for mobile: swipe (or tap Next) through full-width slides with a dot indicator, Skip, and a final Get started button. */
export function OnboardingCarousel({
  slides,
  onFinish,
  onSkip,
  finishLabel = 'Get started',
  className,
}: {
  slides: OnboardingSlide[];
  onFinish?: () => void;
  onSkip?: () => void;
  finishLabel?: string;
  className?: string;
}) {
  const [i, setI] = React.useState(0);
  const [drag, setDrag] = React.useState(0);
  const start = React.useRef<number | null>(null);
  const last = i === slides.length - 1;
  const go = (n: number) => setI(Math.min(slides.length - 1, Math.max(0, n)));
  const dir = () => (getComputedStyle(document.documentElement).direction === 'rtl' ? -1 : 1);

  return (
    <div className={cn('flex min-h-[32rem] w-full max-w-sm flex-col overflow-hidden rounded-3xl border bg-card', className)} role="group" aria-roledescription="carousel" aria-label="Welcome">
      <div className="flex justify-end p-3">
        {!last && <Button size="sm" variant="ghost" onClick={onSkip ?? onFinish}>Skip</Button>}
      </div>
      <div
        className="relative flex-1 touch-pan-y overflow-hidden"
        onPointerDown={(e) => { start.current = e.clientX; }}
        onPointerMove={(e) => { if (start.current != null) setDrag(e.clientX - start.current); }}
        onPointerUp={() => {
          if (start.current != null) { const d = drag * dir(); if (d < -50) go(i + 1); else if (d > 50) go(i - 1); }
          start.current = null; setDrag(0);
        }}
        onPointerCancel={() => { start.current = null; setDrag(0); }}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + dir()); if (e.key === 'ArrowLeft') go(i - dir()); }}
        tabIndex={0}
      >
        <div
          className="flex h-full"
          style={{ transform: `translateX(calc(${-i * dir()} * 100% + ${drag}px))`, transition: start.current != null ? 'none' : 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {slides.map((s, n) => (
            <div key={s.title} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${slides.length}`} aria-hidden={n !== i} className="flex w-full shrink-0 flex-col items-center justify-center gap-6 px-8 text-center">
              <div className="grid size-40 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:size-16">{s.visual}</div>
              <div className="grid gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-5 p-6">
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Slides">
          {slides.map((s, n) => (
            <button key={s.title} role="tab" aria-selected={n === i} aria-label={`Slide ${n + 1}`} onClick={() => go(n)} className={cn('h-1.5 rounded-full outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring/50', n === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30')} />
          ))}
        </div>
        <Button size="lg" onClick={() => (last ? onFinish?.() : go(i + 1))}>{last ? finishLabel : 'Next'}</Button>
      </div>
    </div>
  );
}
