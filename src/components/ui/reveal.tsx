import * as React from 'react';
import { cn } from '@/lib/utils';

function useInView<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/** Fades and lifts its children in when they scroll into view. Wrap a list item and pass `delay` for a stagger. */
export function Reveal({
  delay = 0,
  y = 16,
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { delay?: number; y?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn('transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none', className)}
      style={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transitionDelay: `${delay}ms`, ...style }}
      {...props}
    />
  );
}

/** Headline that reveals word by word with a blur-to-sharp effect. */
export function TextReveal({ text, className, step = 60 }: { text: string; className?: string; step?: number }) {
  const [ref, seen] = useInView<HTMLParagraphElement>();
  return (
    <p ref={ref} className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            opacity: seen ? 1 : 0,
            filter: seen ? 'none' : 'blur(8px)',
            transform: seen ? 'none' : 'translateY(0.4em)',
            transitionDelay: `${i * step}ms`,
          }}
        >
          {w}&nbsp;
        </span>
      ))}
    </p>
  );
}
