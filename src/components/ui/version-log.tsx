import * as React from 'react';
import { Badge } from './badge';
import { ChevronDownIcon } from './icons';
import { Segmented } from './segmented';
import { cn } from '@/lib/utils';

export type VersionKind = 'added' | 'changed' | 'fixed' | 'removed';
export interface VersionEntry {
  kind: VersionKind;
  text: React.ReactNode;
  /** Anything shown under the text: chips, links, a screenshot. */
  extra?: React.ReactNode;
}
export interface VersionRelease {
  version: string;
  /** ISO date (2026-10-08) is formatted for you; any other string is shown as is. */
  date: string;
  title?: string;
  entries: VersionEntry[];
}

const badge = { added: 'success', changed: 'info', fixed: 'warning', removed: 'danger' } as const;
const dot = { added: 'bg-success', changed: 'bg-info', fixed: 'bg-warning', removed: 'bg-destructive' } as const;
/** "Label: details" text gets a bold label, so a long list can be skimmed. */
function lead(text: React.ReactNode) {
  const m = typeof text === 'string' ? text.match(/^([^:.]{3,48}):\s+([\s\S]+)$/) : null;
  return m ? <><strong className="font-semibold text-foreground">{m[1]}.</strong> <span className="text-muted-foreground">{m[2]}</span></> : <span className="text-foreground/90">{text}</span>;
}
const kinds: VersionKind[] = ['added', 'changed', 'fixed', 'removed'];
const fmtDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : d);

/** True once the element has scrolled into view. */
function useSeen<T extends HTMLElement>(threshold = 0.1) {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

function Release({ r, latest, open, onToggle, kind, active, id }: { r: VersionRelease; latest: boolean; open: boolean; onToggle: () => void; kind: 'all' | VersionKind; active: boolean; id: string }) {
  const [ref, seen] = useSeen<HTMLLIElement>(0.08);
  const shown = r.entries.filter((e) => kind === 'all' || e.kind === kind);
  const counts = kinds.map((k) => [k, r.entries.filter((e) => e.kind === k).length] as const).filter(([, n]) => n > 0);
  if (!shown.length) return null;
  const ease = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

  return (
    <li ref={ref} id={id} className="relative scroll-mt-24 pl-8 sm:pl-10">
      {/* the rail: draws downward when the release appears */}
      <span aria-hidden className={cn('absolute bottom-[-2.5rem] left-[11px] top-3 w-px origin-top bg-border transition-transform duration-1000 motion-reduce:transition-none', ease)} style={{ transform: seen ? 'scaleY(1)' : 'scaleY(0)' }} />
      <span aria-hidden className={cn('absolute left-0 top-1.5 grid size-6 place-items-center rounded-full border-2 bg-background transition-[transform,opacity,border-color] duration-500 motion-reduce:transition-none', ease, active || latest ? 'border-primary' : 'border-border')} style={{ transform: seen ? 'scale(1)' : 'scale(0.3)', opacity: seen ? 1 : 0 }}>
        <span className={cn('size-2 rounded-full transition-colors', active || latest ? 'bg-primary' : 'bg-muted-foreground/40')} />
        {latest && <span className="absolute inset-0 animate-ping rounded-full border border-primary/40 [animation-duration:2.4s] motion-reduce:hidden" />}
      </span>

      <button type="button" aria-expanded={open} onClick={onToggle} className="group flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg py-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <span className="font-mono text-xl font-semibold tracking-tight">{r.version}</span>
        {latest && <Badge variant="primary">Latest</Badge>}
        <time className="text-xs text-muted-foreground">{fmtDate(r.date)}</time>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex">
          {counts.map(([k, n]) => <Badge key={k} variant={badge[k]} className="capitalize">{n} {k}</Badge>)}
        </span>
        <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {r.title && <p className="text-base font-medium">{r.title}</p>}

      <div className={cn('grid transition-[grid-template-rows] duration-500 motion-reduce:transition-none', ease)} style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="grid gap-6 pb-2 pt-5">
            {kinds.map((k) => {
              const group = shown.filter((e) => e.kind === k);
              if (!group.length) return null;
              const before = shown.filter((e) => kinds.indexOf(e.kind) < kinds.indexOf(k)).length;
              return (
                <section key={k} aria-label={k} className="grid gap-3">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className={cn('size-2 rounded-full', dot[k])} /> {k}
                    <span className="rounded-full bg-secondary px-1.5 py-px text-[10px] tabular-nums normal-case tracking-normal">{group.length}</span>
                  </h4>
                  <ul className="grid gap-4 border-s ps-4">
                    {group.map((e, i) => (
                      <li
                        key={`${kind}-${k}-${i}`}
                        className="grid gap-2 transition-[opacity,transform] duration-600 motion-reduce:transition-none"
                        style={{ opacity: seen && open ? 1 : 0, transform: seen && open ? 'none' : 'translateX(-12px)', transitionDelay: `${Math.min(before + i, 10) * 70 + 150}ms`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                      >
                        <p className="text-[15px] leading-relaxed">{lead(e.text)}</p>
                        {e.extra}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Animated version history. The rail draws and the dots pop as each release scrolls in, entries slide in one after another,
 * and releases fold open and closed. A filter narrows to added, changed, fixed or removed, and a version strip jumps between releases.
 * `openCount` releases start open (the newest first). Motion is off for people who prefer reduced motion.
 */
export function VersionLog({ releases, openCount = 2, showFilter = true, className }: { releases: VersionRelease[]; openCount?: number; showFilter?: boolean; className?: string }) {
  const uid = React.useId().replace(/:/g, '');
  const [kind, setKind] = React.useState<'all' | VersionKind>('all');
  const [open, setOpen] = React.useState<Set<string>>(() => new Set(releases.slice(0, openCount).map((r) => r.version)));
  const [active, setActive] = React.useState(releases[0]?.version);
  const list = React.useRef<HTMLOListElement>(null);
  const idOf = (v: string) => `${uid}-v${v.replace(/\./g, '-')}`;
  const present = kinds.filter((k) => releases.some((r) => r.entries.some((e) => e.kind === k)));

  React.useEffect(() => {
    const els = [...(list.current?.querySelectorAll<HTMLElement>('li[id]') ?? [])];
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((hits) => {
      const top = hits.filter((h) => h.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      const hit = top && releases.find((r) => idOf(r.version) === top.target.id);
      if (hit) setActive(hit.version);
    }, { rootMargin: '-20% 0px -65% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });

  const flip = (v: string) => setOpen((s) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; });
  const jump = (v: string) => {
    setOpen((s) => new Set(s).add(v));
    document.getElementById(idOf(v))?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className={cn('grid gap-8', className)}>
      <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-center gap-3 bg-background/85 px-1 py-2 backdrop-blur">
        <nav aria-label="Versions" className="flex max-w-full gap-1 overflow-x-auto">
          {releases.filter((r) => kind === 'all' || r.entries.some((e) => e.kind === kind)).map((r) => (
            <button key={r.version} type="button" onClick={() => jump(r.version)} aria-current={active === r.version ? 'true' : undefined} className={cn('shrink-0 rounded-full border px-2.5 py-1 font-mono text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40', active === r.version ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>{r.version}</button>
          ))}
        </nav>
        {showFilter && present.length > 1 && (
          <Segmented<'all' | VersionKind>
            className="ml-auto"
            value={kind}
            onValueChange={setKind}
            options={[{ value: 'all', label: 'Everything' }, ...present.map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))]}
          />
        )}
      </div>
      <ol ref={list} className="grid gap-10">
        {releases.map((r, i) => (
          <Release key={r.version} r={r} latest={i === 0} open={open.has(r.version)} onToggle={() => flip(r.version)} kind={kind} active={active === r.version} id={idOf(r.version)} />
        ))}
      </ol>
    </div>
  );
}
