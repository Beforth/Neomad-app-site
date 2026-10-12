import * as React from 'react';

const COLORS = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--destructive)', 'var(--info)'];

/** Burst of confetti from a point. `fire(x, y)` defaults to the middle of the screen; each call is independent and cleans itself up. */
export function fireConfetti(x = innerWidth / 2, y = innerHeight / 2, count = 40) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;overflow:hidden';
  document.body.appendChild(layer);
  const anims = Array.from({ length: count }, () => {
    const el = document.createElement('i');
    const s = 6 + Math.random() * 6;
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s * (Math.random() > 0.5 ? 1 : 0.4)}px;background:${COLORS[(Math.random() * COLORS.length) | 0]};border-radius:${Math.random() > 0.6 ? '50%' : '1px'}`;
    layer.appendChild(el);
    const a = Math.random() * Math.PI * 2;
    const v = 120 + Math.random() * 260;
    const dx = Math.cos(a) * v;
    const dy = Math.sin(a) * v - 140;
    return el.animate(
      [
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.2}px,${dy + 320}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
    ).finished;
  });
  Promise.allSettled(anims).then(() => layer.remove());
}

/** Wraps a button (or any element) so a click fires confetti from it. */
export function Confetti({ children }: { children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }> }) {
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      fireConfetti(r.left + r.width / 2, r.top + r.height / 2);
      children.props.onClick?.(e);
    },
  });
}
