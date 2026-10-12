import * as React from 'react';

/** Types each phrase, holds, deletes it and moves on. Pass one phrase for a one-off type-in. Static text for reduced motion. */
export function Typewriter({
  phrases,
  speed = 55,
  hold = 1400,
  loop = true,
  className,
}: {
  phrases: string[];
  /** Milliseconds per character. */
  speed?: number;
  hold?: number;
  loop?: boolean;
  className?: string;
}) {
  const [text, setText] = React.useState('');
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  React.useEffect(() => {
    if (reduce) return setText(phrases[0] ?? '');
    let i = 0;
    let n = 0;
    let del = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = phrases[i];
      n += del ? -1 : 1;
      setText(word.slice(0, n));
      let wait = del ? speed / 2 : speed;
      if (!del && n === word.length) {
        if (!loop && i === phrases.length - 1) return;
        del = true;
        wait = hold;
      } else if (del && n === 0) {
        del = false;
        i = (i + 1) % phrases.length;
        wait = 300;
      }
      t = setTimeout(tick, wait);
    };
    t = setTimeout(tick, speed);
    return () => clearTimeout(t);
  }, [phrases, speed, hold, loop, reduce]);
  return (
    <span className={className} aria-label={phrases.join('. ')}>
      <span aria-hidden>{text}</span>
      <span aria-hidden className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] animate-pulse bg-current" />
    </span>
  );
}
