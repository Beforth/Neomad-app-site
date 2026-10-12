import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TocItem {
  id: string;
  label: string;
  level?: 1 | 2;
}

/** "On this page" list that highlights the section in view. Items point at element ids; clicking scrolls smoothly. */
export function TableOfContents({ items, className }: { items: TocItem[]; className?: string }) {
  const [active, setActive] = React.useState(items[0]?.id);
  React.useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="On this page" className={cn('text-[13px]', className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
      <ul className="grid border-l">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth' }); setActive(i.id); }}
              aria-current={active === i.id ? 'location' : undefined}
              className={cn('-ml-px block border-l py-1 pr-2 transition-colors', i.level === 2 ? 'pl-6' : 'pl-3', active === i.id ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
