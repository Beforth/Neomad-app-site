import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Draw-your-signature canvas. Mouse, touch and pen. `onChange` gets a PNG data URL, or null after Clear. */
export function SignaturePad({
  onChange,
  height = 160,
  label = 'Sign here',
  className,
}: {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  label?: string;
  className?: string;
}) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = React.useState(true);

  // Match the canvas bitmap to its CSS size so lines stay sharp on retina screens.
  React.useEffect(() => {
    const c = canvas.current!;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      const g = c.getContext('2d')!;
      g.scale(dpr, dpr);
      g.lineWidth = 2.2;
      g.lineCap = g.lineJoin = 'round';
      setEmpty(true);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const draw = (e: React.PointerEvent) => {
    if (!last.current) return;
    const g = canvas.current!.getContext('2d')!;
    g.strokeStyle = getComputedStyle(canvas.current!).color;
    const p = pos(e);
    g.beginPath();
    g.moveTo(last.current.x, last.current.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };
  const end = () => {
    if (!last.current) return;
    last.current = null;
    onChange?.(canvas.current!.toDataURL('image/png'));
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange?.(null);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="relative overflow-hidden rounded-lg border bg-background text-foreground">
        <canvas
          ref={canvas}
          role="img"
          aria-label="Signature area. Draw with a mouse, finger or pen."
          style={{ height }}
          className="block w-full cursor-crosshair touch-none"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); last.current = pos(e); }}
          onPointerMove={draw}
          onPointerUp={end}
          onPointerCancel={end}
        />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground/60">{label}</span>}
        <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed" />
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" disabled={empty} onClick={clear}>Clear</Button>
      </div>
    </div>
  );
}
