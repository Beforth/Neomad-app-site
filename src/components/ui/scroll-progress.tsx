import * as React from 'react';
import { cn } from '@/lib/utils';

/** Thin bar fixed to the top that fills as the page scrolls. Pass `target` to follow a scroll container instead. */
export function ScrollProgress({ target, className }: { target?: React.RefObject<HTMLElement | null>; className?: string }) {
  const bar = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = target?.current ?? null;
    const src: HTMLElement | Window = el ?? window;
    const update = () => {
      const top = el ? el.scrollTop : window.scrollY;
      const max = el ? el.scrollHeight - el.clientHeight : document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? top / max : 0})`;
    };
    update();
    src.addEventListener('scroll', update, { passive: true });
    return () => src.removeEventListener('scroll', update);
  }, [target]);
  return (
    <div className={cn(target ? 'sticky top-0' : 'fixed inset-x-0 top-0', 'z-50 h-0.5', className)}>
      <div ref={bar} className="h-full origin-left scale-x-0 bg-primary" />
    </div>
  );
}
