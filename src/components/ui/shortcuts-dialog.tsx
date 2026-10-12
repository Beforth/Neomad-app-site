import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Kbd } from './kbd';

export interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

/**
 * Cheat sheet that opens when you press ? (anywhere outside a text field). Pass `open` and `onOpenChange` to control it yourself,
 * for example from a Help menu. Keys are shown as keycaps; use '⌘', 'Ctrl', 'Shift' and so on.
 */
export function ShortcutsDialog({ groups, open, onOpenChange, hotkey = true }: { groups: ShortcutGroup[]; open?: boolean; onOpenChange?: (open: boolean) => void; hotkey?: boolean }) {
  const [inner, setInner] = React.useState(false);
  const shown = open ?? inner;
  const setShown = (v: boolean) => { setInner(v); onOpenChange?.(v); };

  React.useEffect(() => {
    if (!hotkey) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '?' || e.metaKey || e.ctrlKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      setShown(!shown);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  return (
    <Dialog open={shown} onOpenChange={setShown}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Press <Kbd>?</Kbd> any time to open this.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((g) => (
            <section key={g.title} className="grid content-start gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.title}</h3>
              <ul className="grid gap-1.5">
                {g.items.map((it) => (
                  <li key={it.label} className="flex items-center justify-between gap-3 text-[13px]">
                    {it.label}
                    <span className="flex gap-1">{it.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
