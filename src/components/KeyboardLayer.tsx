/**
 * App-wide keyboard control. Rendered once inside the app shell.
 *
 *   Ctrl/⌘ + K   command palette (jump to any page, run common actions)
 *   g then …     go to a page (g d = Dashboard, g i = Invoices …)
 *   /            focus the page's search box
 *   n            start the page's main "New / Add / Create" action
 *   r            refresh the page (clicks its Refresh button)
 *   [            collapse / expand the sidebar
 *   ?            show this list
 *   ↓ ↑ (or j k) move between table rows, Enter opens the row
 *   Esc          leave a text box / close a popup
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, PanelLeft, Keyboard, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useSidebar } from '@/components/ui/sidebar';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ShortcutsDialog, type ShortcutGroup } from '@/components/ui/shortcuts-dialog';
import { Kbd } from '@/components/ui/kbd';
import { DELIVERY_ITEMS, HRMS_ITEMS, type NavItem } from './Sidebar';

/** key after "g" -> route */
const GO: Record<string, { path: string; label: string }> = {
  d: { path: '/', label: 'Dashboard' },
  i: { path: '/invoices', label: 'Invoices' },
  t: { path: '/tasks', label: 'Tasks' },
  l: { path: '/tracking', label: 'Live Tracking' },
  r: { path: '/reports', label: 'Reports' },
  u: { path: '/users', label: 'User Management' },
  s: { path: '/settings', label: 'Settings' },
  n: { path: '/notifications', label: 'Notifications' },
  p: { path: '/profile', label: 'Profile' },
  h: { path: '/hrms/dashboard', label: 'HRMS Dashboard' },
  a: { path: '/hrms/attendance', label: 'Attendance' },
  f: { path: '/hrms/staff', label: 'Staff' },
  y: { path: '/hrms/payroll', label: 'Payroll' },
  e: { path: '/hrms/expenses', label: 'Expenses' },
  v: { path: '/hrms/leave', label: 'Leave' },
  w: { path: '/hrms/shifts', label: 'Shifts' },
};

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};
const dialogOpen = () => !!document.querySelector('[role="dialog"][data-state="open"]');

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Everywhere',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Command palette' },
      { keys: ['?'], label: 'This list' },
      { keys: ['['], label: 'Collapse sidebar' },
      { keys: ['Esc'], label: 'Leave a field / close a popup' },
    ],
  },
  {
    title: 'Go to (press g, then)',
    items: [
      { keys: ['g', 'd'], label: 'Dashboard' },
      { keys: ['g', 'i'], label: 'Invoices' },
      { keys: ['g', 't'], label: 'Tasks' },
      { keys: ['g', 'l'], label: 'Live tracking' },
      { keys: ['g', 'r'], label: 'Reports' },
      { keys: ['g', 'u'], label: 'Users' },
      { keys: ['g', 's'], label: 'Settings' },
      { keys: ['g', 'h'], label: 'HRMS dashboard' },
      { keys: ['g', 'a'], label: 'Attendance' },
      { keys: ['g', 'f'], label: 'Staff' },
      { keys: ['g', 'y'], label: 'Payroll' },
      { keys: ['g', 'e'], label: 'Expenses' },
      { keys: ['g', 'v'], label: 'Leave' },
      { keys: ['g', 'w'], label: 'Shifts' },
    ],
  },
  {
    title: 'On a page',
    items: [
      { keys: ['/'], label: 'Search' },
      { keys: ['n'], label: 'New / Add / Create' },
      { keys: ['r'], label: 'Refresh' },
      { keys: ['↓', '↑'], label: 'Move between rows' },
      { keys: ['j', 'k'], label: 'Move between rows' },
      { keys: ['Enter'], label: 'Open the row' },
    ],
  },
];

export default function KeyboardLayer() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeApp, setActiveApp } = useApp();
  const { collapsed, setCollapsed, isDesktop, setMobileOpen } = useSidebar();
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const gPending = useRef<number | null>(null);

  // The top-bar search button asks for the palette through this event.
  useEffect(() => {
    const open = () => setPalette(true);
    window.addEventListener('neomed:open-palette', open);
    return () => window.removeEventListener('neomed:open-palette', open);
  }, []);

  const role = user?.role ?? '';
  const canSwitch = role === 'admin' || role === 'manager';

  const pages = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; path: string; group: string }[] = [];
    const add = (items: NavItem[], group: string) => {
      for (const it of items) {
        if (!it.roles.includes(role)) continue;
        if (it.path && !seen.has(it.path)) { seen.add(it.path); out.push({ label: it.label, path: it.path, group }); }
        for (const c of it.children ?? []) {
          if (!seen.has(c.path)) { seen.add(c.path); out.push({ label: `${it.label} · ${c.label}`, path: c.path, group }); }
        }
      }
    };
    add(DELIVERY_ITEMS, 'Delivery');
    add(HRMS_ITEMS, 'HRMS');
    return out;
  }, [role]);

  const allowedPaths = useMemo(() => new Set(pages.map((p) => p.path.split('?')[0])), [pages]);

  const focusSearch = useCallback(() => {
    const main = document.querySelector('main') ?? document;
    const el = Array.from(main.querySelectorAll<HTMLInputElement>('input[data-search], input[type="search"], input[placeholder*="earch" i]'))
      .find((i) => i.offsetParent !== null && !i.disabled);
    if (el) { el.focus(); el.select(); return true; }
    return false;
  }, []);

  const clickMainAction = useCallback((pattern: RegExp) => {
    const main = document.querySelector('main') ?? document;
    const marked = main.querySelector<HTMLElement>('[data-hotkey-new]');
    if (pattern.source.startsWith('^(add') && marked) { marked.click(); return true; }
    const btn = Array.from(main.querySelectorAll<HTMLElement>('button, a'))
      .find((b) => b.offsetParent !== null && !(b as HTMLButtonElement).disabled && pattern.test((b.textContent || '').trim()));
    if (btn) { btn.click(); return true; }
    return false;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Command palette works everywhere, even inside fields.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        const el = document.activeElement as HTMLElement | null;
        if (el && isTyping(el) && !dialogOpen()) el.blur();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target) || palette || help) return;

      if (e.key === '?') { e.preventDefault(); setHelp(true); return; }
      if (dialogOpen()) return;

      if (gPending.current !== null) {
        window.clearTimeout(gPending.current); gPending.current = null;
        const dest = GO[e.key.toLowerCase()];
        if (dest && allowedPaths.has(dest.path)) { e.preventDefault(); navigate(dest.path); }
        return;
      }
      switch (e.key) {
        case 'g':
          gPending.current = window.setTimeout(() => { gPending.current = null; }, 1200);
          return;
        case '/':
          if (focusSearch()) e.preventDefault();
          return;
        case 'n':
          if (clickMainAction(/^(add|new|create|assign|apply|generate)\b/i)) e.preventDefault();
          return;
        case 'r': {
          const main = document.querySelector('main');
          const marked = main?.querySelector<HTMLElement>('[data-hotkey-refresh]:not([disabled])');
          if (marked) { marked.click(); e.preventDefault(); }
          else if (clickMainAction(/^refresh\b/i)) e.preventDefault();
          return;
        }
        case '[':
          if (isDesktop) setCollapsed(!collapsed); else setMobileOpen(true);
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette, help, allowedPaths, navigate, focusSearch, clickMainAction, collapsed, setCollapsed, isDesktop, setMobileOpen]);

  // ArrowDown from the search box jumps into the first table row.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown') return;
      const el = e.target as HTMLElement;
      if (!(el instanceof HTMLInputElement) || el.closest('[role="dialog"]')) return;
      const row = document.querySelector<HTMLElement>('main tbody tr[data-row]');
      if (row) { e.preventDefault(); row.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const run = (fn: () => void) => { setPalette(false); window.setTimeout(fn, 0); };
  const goKey = (path: string) => Object.entries(GO).find(([, v]) => v.path === path)?.[0];

  return (
    <>
      <CommandDialog open={palette} onOpenChange={setPalette}>
        <CommandInput placeholder="Go to a page or run an action…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          {['Delivery', 'HRMS'].map((g) => {
            const items = pages.filter((p) => p.group === g);
            if (!items.length) return null;
            return (
              <CommandGroup key={g} heading={`Go to · ${g}`}>
                {items.map((p) => {
                  const k = goKey(p.path);
                  return (
                    <CommandItem key={p.path} value={`${g} ${p.label}`} onSelect={() => run(() => navigate(p.path))}>
                      {p.label}
                      {k && <span className="ml-auto flex gap-1"><Kbd>g</Kbd><Kbd>{k}</Kbd></span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
          <CommandGroup heading="Actions">
            {canSwitch && (
              <CommandItem value="switch app delivery hrms" onSelect={() => run(() => { const next = activeApp === 'hrms' ? 'delivery' : 'hrms'; setActiveApp(next); navigate(next === 'hrms' ? '/hrms/attendance' : '/'); })}>
                <ArrowRightLeft /> Switch to {activeApp === 'hrms' ? 'Delivery' : 'HRMS'}
              </CommandItem>
            )}
            <CommandItem value="toggle sidebar" onSelect={() => run(() => (isDesktop ? setCollapsed(!collapsed) : setMobileOpen(true)))}>
              <PanelLeft /> Toggle sidebar <span className="ml-auto"><Kbd>[</Kbd></span>
            </CommandItem>
            <CommandItem value="keyboard shortcuts help" onSelect={() => run(() => setHelp(true))}>
              <Keyboard /> Keyboard shortcuts <span className="ml-auto"><Kbd>?</Kbd></span>
            </CommandItem>
            <CommandItem value="sign out logout" onSelect={() => run(logout)}>
              <LogOut /> Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <ShortcutsDialog groups={SHORTCUTS} open={help} onOpenChange={setHelp} hotkey={false} />
    </>
  );
}
