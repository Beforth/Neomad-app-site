import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Keys a screen adds while it is on show. KeyboardLayer runs them and lists them
 * in the Ctrl + / cheat sheet, so a shortcut is declared once and can never be
 * missing from the list.
 *
 * `keys` is written like "ctrl+alt+m", "ctrl+s" or "escape".
 */
export interface ScreenShortcut {
  keys: string;
  label: string;
  run: () => void;
}

interface Registered {
  title: string;
  items: ScreenShortcut[];
}

const store = new Map<symbol, Registered>();
const listeners = new Set<() => void>();
let snapshot: Registered[] = [];

const publish = () => {
  snapshot = Array.from(store.values());
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

/** Register a screen's shortcuts for as long as the component is mounted. */
export function useScreenShortcuts(title: string, items: ScreenShortcut[]) {
  const latest = useRef(items);
  latest.current = items;
  // Re-register only when the list itself (keys and labels) changes, not on every render.
  const signature = items.map((i) => `${i.keys}|${i.label}`).join(';');
  useEffect(() => {
    const id = Symbol(title);
    // Handlers are read through the ref, so they always see the screen's current state.
    store.set(id, { title, items: latest.current.map((it, i) => ({ ...it, run: () => latest.current[i]?.run() })) });
    publish();
    return () => { store.delete(id); publish(); };
  }, [title, signature]);
}

export const useRegisteredShortcuts = (): Registered[] => useSyncExternalStore(subscribe, () => snapshot);

const keyOf = (e: KeyboardEvent): string => {
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
  return e.key.toLowerCase();
};

const matches = (spec: string, e: KeyboardEvent): boolean => {
  const parts = spec.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  return (
    (e.ctrlKey || e.metaKey) === mods.has('ctrl') &&
    e.altKey === mods.has('alt') &&
    e.shiftKey === mods.has('shift') &&
    keyOf(e) === key
  );
};

/** Runs the registered shortcut this key press belongs to. True when one ran. */
export function runScreenShortcut(e: KeyboardEvent): boolean {
  for (const group of snapshot) {
    for (const it of group.items) {
      if (matches(it.keys, e)) {
        e.preventDefault();
        it.run();
        return true;
      }
    }
  }
  return false;
}

const LABELS: Record<string, string> = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', enter: 'Enter', escape: 'Esc', backspace: '⌫' };

/** "ctrl+alt+m" -> ['Ctrl', 'Alt', 'M'] for keycaps. */
export const keycaps = (spec: string): string[] =>
  spec.split('+').map((p) => LABELS[p.toLowerCase()] ?? (p.length === 1 ? p.toUpperCase() : p));
