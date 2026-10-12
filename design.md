# Design System — UI Patterns

## befui (current standard)

The app uses [befui](https://github.com/RandomKid24/befui): copy-paste React components on Radix + Tailwind 4 + CSS variables. Full catalog: https://raw.githubusercontent.com/RandomKid24/befui/main/public/llms-full.txt

**Rule: for any new UI, use a befui component or a theme token. Do not hard-code `zinc-*`, `emerald-*`, `red-*` or hex colours.** The sections further down describe the older hand-written patterns (markup only: their colours were already converted to tokens). Pages still use hand-written buttons, inputs and tables; when you touch such a page, swap them for the befui components below.

### Where things live

| What | Where |
|---|---|
| Components (one file each) | `src/components/ui/` (`button`, `input`, `label`, `card`, `badge`, `avatar`, `alert`, `spinner`, `tooltip`, `toast`, `dialog`, `sidebar`, `bottom-nav`, `app-shell`, ...) |
| Import | `import { Button } from '@/components/ui/button'` (`@` = `src/`, set in `vite.config.ts` and `tsconfig.json`) |
| Class merge helper | `cn()` from `@/lib/utils` |
| Theme colours, radius, animations | `src/index.css` |

Add a missing component with `npx github:RandomKid24/befui add <name>` (several names allowed), never by retyping its code. Run `npx github:RandomKid24/befui update` if an animated component looks static. Edit the copied file freely; it is ours after install.

### Theme tokens (set in `src/index.css`)

Brand palette is emerald on zinc, as before befui. Dark mode is ready (`dark` class on `<html>`) but nothing switches it on yet.

| Use | Class | Light value |
|---|---|---|
| Page background | `bg-muted` | `#f8f9fa` |
| Cards, popovers, inputs | `bg-card`, `bg-popover`, `bg-background` | white |
| Main text | `text-foreground` | zinc-900 |
| Secondary text, icons | `text-muted-foreground` | zinc-500 |
| Borders | `border` (default colour), `border-input` | zinc-200 |
| Hover / subtle fill | `bg-secondary` | zinc-100 |
| Main action, links, active tab | `bg-primary text-primary-foreground`, `text-primary` | emerald-600 |
| Selected nav item, soft highlight | `bg-accent text-accent-foreground` | emerald-50 / emerald-700 |
| Focus ring | `ring-ring` | emerald-500 |
| Delete / error | `text-destructive`, `bg-destructive` | red-600 |
| Success / warning / info | `text-success`, `text-warning`, `text-info` | emerald / amber / blue |
| Tinted backgrounds | add opacity: `bg-primary/10`, `bg-destructive/10` | |

Radius is `rounded-md` for buttons and inputs, `rounded-lg` for menus, `rounded-xl` for cards.

### Old class to new class

| Old | New |
|---|---|
| `bg-white border border-zinc-100 rounded-xl shadow-sm` (card) | `Card` from `@/components/ui/card`, or `bg-card border rounded-xl shadow-sm` |
| `text-zinc-900` / `text-zinc-500` / `text-zinc-400` | `text-foreground` / `text-muted-foreground` |
| `bg-zinc-50`, `hover:bg-zinc-100` | `bg-muted`, `hover:bg-secondary` |
| `border-zinc-200`, `border-zinc-100` | `border` |
| `bg-emerald-500 text-white hover:bg-emerald-600` | `<Button>` (variant `primary`) |
| `bg-zinc-900 text-white` header action | `<Button variant="dark">` |
| `bg-emerald-50 text-emerald-700` | `bg-accent text-accent-foreground` |
| `bg-red-50 text-red-600` | `bg-destructive/10 text-destructive` |
| hand-written `<input className="... focus:ring-emerald-500/20">` | `<Input>` with `<Label>` |
| spinner `border-2 ... animate-spin` | `<Spinner>` or `<Button loading>` |
| status pill (`bg-emerald-50 text-emerald-600`, `bg-amber-50 ...`) | `<Badge>` |

### Standard patterns

Every page is built from befui components. Do not write new `<button>`, `<input>`, `<textarea>`, modal overlays, tab strips, badges or empty states by hand.

| Need | Use |
|---|---|
| Page title, description, header actions | `PageHeader` (`@/components/ui/app-shell`) |
| Buttons (primary, outline, ghost, destructive, icon) | `Button` with `variant` and `size` |
| Text, number, date, email fields | `Input` (supports `leftIcon`, `rightSlot`); multi-line: `Textarea` |
| Dropdown with search | `SearchableSelect` (our wrapper over befui `Combobox`) |
| Plain dropdown | native `<select className={selectClass}>` from `@/components/ui/input` |
| Checkbox | `Checkbox` (`checked`, `onCheckedChange`) |
| Pill switcher / tabs | `Segmented` |
| Cards and sections | `Card`, `CardHeader`, `CardTitle`, `CardContent` |
| Numbers on a dashboard | `StatCard` |
| Status labels | `Badge` (`success`, `warning`, `danger`, `info`, `default`) |
| Tables | `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` |
| Popups | `Modal` (`src/components/Modal.tsx`) or `Dialog` directly |
| Empty lists | `EmptyState` |
| Loading | `Spinner`, `Skeleton` |
| Notifications that pop up | `toast.success/error/info` from `@/components/ui/toast` (`ToastManager` already bridges the old event) |

**Form field:**

```tsx
<div className="space-y-1.5">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
</div>
```

**Submit:** `<Button type="submit" className="w-full" loading={loading} disabled={loading}>Save</Button>`

**Error message:** `Alert`, or `rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive` with `role="alert"`.

**Shell:** `Sidebar.tsx`, `BottomNav.tsx` and the top bar in `App.tsx` use befui `AppShell`, `Sidebar`, `Topbar`, `Breadcrumb` and `DropdownMenu`. Sidebar items are grouped (Overview, Operations, Insights, People, Finance, Admin).

**Login:** `src/pages/Login.tsx` is a reference example of a finished befui page.

**Reports:** `src/pages/Reports.tsx` is a hub (report list on the left, chosen report on the right). To add a report, add an entry to `src/pages/reports/definitions.tsx` (endpoint, KPI numbers, columns) and an endpoint in `neomed-be/app/api/v1/reports.py`. Do not build a new page per report.

### Keyboard rules (every screen must work without a mouse)

Global handling lives in `src/components/KeyboardLayer.tsx`. Do not add per-page key listeners for these.

| Key | Does |
|---|---|
| `Ctrl/⌘ K` | command palette: jump to any page, switch app, sign out |
| `g` then `d i t l r u s h a f y e v w` | go to a page (`g i` = Invoices) |
| `/` | focus the page's search box (mark it with `data-search`) |
| `n` | the page's main add/new action (mark the button with `data-hotkey-new`) |
| `r` | refresh (mark the button with `data-hotkey-refresh`) |
| `↓ ↑` / `j k`, `Home`, `End` | move between table rows; `↓` from the search box enters the table |
| `Enter` | open the focused row (its `data-primary` element, first link, or the row's onClick) |
| `.` or `m` | open the focused row's actions menu (mark the ⋯ button with `data-row-menu`) |
| `[` | collapse the sidebar |
| `?` | shortcut cheat sheet |
| `Esc` | leave a text box / close a popup |

New list pages: one `PageHeader` with a single primary action, a flat filter row (no card around it), a `Table` whose rows have `onClick`, and all row actions in one `⋯` menu (`DropdownMenu` + `data-row-menu`). Use `KpiStrip` for headline numbers instead of a grid of stat cards.

### Rules for components

- Controlled inputs: keep state in the parent.
- Wrap the app in `TooltipProvider` before using `Tooltip`.
- Do not edit `src/components/ui/*` for one page; wrap or pass `className`.
- Check `src/components/ui/` first before building a new button, input, badge, dialog or table.

---

# Older patterns (historical)

Everything below is the pre-befui markup, kept for reference only. Pages have been moved to the components above; do not copy these snippets.

## Page Layout

```
<div className="space-y-6">     <!-- HRMS pages -->
<div className="space-y-8">     <!-- Dashboard only -->
```

## Page Header

```
<motion.header
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
>
```

### Title + Subtitle

```
<div>
  <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Title</h1>
  <p className="text-xs text-zinc-500 font-medium mt-0.5">Description</p>
</div>
```

Dashboard exception:

```
<h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
<p className="text-zinc-500">Welcome back! Here's what's happening today.</p>
```

### Header Action Button

```
<button className="self-start sm:self-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
  <Plus size={14} />Label
</button>
```

For `<Link>`: same classes.

## Filter Bar

Separate card above the data table:

```
<motion.div
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.05 }}
  className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-center"
>
  <div className="relative flex-1 min-w-[180px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
    <input
      type="text"
      placeholder="Search..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
    />
  </div>
  <div className="w-[160px]">
    <SearchableSelect
      value={filter}
      onChange={setFilter}
      options={OPTIONS}
      className="w-full"
    />
  </div>
  {hasFilters && (
    <button
      onClick={() => { setSearch(''); setFilter('all'); }}
      className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
    >
      <XCircle size={12} />Clear
    </button>
  )}
</motion.div>
```

**hasFilters:** `const hasFilters = search || filter !== 'all';`

**Debounced search** (HRMS pages):

```
const [searchDebounced, setSearchDebounced] = useState('');
useEffect(() => {
  const t = setTimeout(() => setSearchDebounced(search), 300);
  return () => clearTimeout(t);
}, [search]);
```

**Reset page on filter change:**

```
useEffect(() => { setPage(1); }, [statusFilter, typeFilter, searchDebounced]);
```

## Stat Cards (Dashboard & Staff)

```
<motion.div
  key={label}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.05 }}
  className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm"
>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
    </div>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-{color}-50 text-{color}-600">
      <Icon size={20} />
    </div>
  </div>
</motion.div>
```

Dashboard variant (smaller):

```
<motion.div
  key={card.label}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.05 }}
  className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group"
>
  <div className="flex items-center justify-between mb-2">
    <div className="p-1.5 rounded-lg bg-{color}-50 text-{color}-600 group-hover:scale-110 transition-transform">
      <Icon size={16} />
    </div>
    <ArrowUpRight size={14} className="text-zinc-300" />
  </div>
  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
  <div className="flex items-end justify-between mt-1">
    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{value}</h3>
  </div>
</motion.div>
```

Grid:

```
<div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">  <!-- Staff -->
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">    <!-- Dashboard -->
```

## Data Table Card

```
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
  className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden"
>
```

## Empty State

Placed inside the table card (replaces entire table):

```
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
    <Inbox size={24} className="text-zinc-300" />
  </div>
  <h3 className="text-sm font-bold text-zinc-900 mb-1">No items found</h3>
  <p className="text-xs text-zinc-400 max-w-xs">Try adjusting your search or filters</p>
</div>
```

## Desktop Table

```
<div className="hidden md:block overflow-x-auto">
  <table className="w-full text-left">
    <thead className="bg-zinc-50/50 border-b border-zinc-100">
      <tr>
        {columns.map((col) => (
          <th
            key={col.label}
            onClick={col.key ? () => toggleSort(col.key) : undefined}
            className={`px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-zinc-600 select-none' : ''}`}
          >
            <span className="flex items-center gap-1">
              {col.label}
              {col.key && <SortIcon col={col.key} />}
            </span>
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-zinc-50">
      {data.map((row, i) => (
        <motion.tr
          key={row.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.02 }}
          className="hover:bg-zinc-50/50 transition-colors"
        >
          <td className="px-4 py-3 text-xs font-bold text-zinc-900">{row.name}</td>
          ...
        </motion.tr>
      ))}
    </tbody>
  </table>
</div>
```

### Sort System

```
type SortKey = 'key1' | 'key2';

const [sortBy, setSortBy] = useState<SortKey>('key1');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

function toggleSort(key: SortKey) {
  if (sortBy === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
  else { setSortBy(key); setSortOrder('asc'); }
}

function SortIcon({ col }: { col: SortKey }) {
  if (sortBy !== col) return <ArrowUpDown size={12} className="text-zinc-300" />;
  return sortOrder === 'asc'
    ? <ChevronUp size={12} className="text-zinc-900" />
    : <ChevronDown size={12} className="text-zinc-900" />;
}
```

### Table Cell Patterns

- **Text cell:** `text-xs font-bold text-zinc-900` / `text-xs text-zinc-500`
- **Numeric badge:** `<span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700">{value}</span>`
- **Truncated text:** `max-w-[160px] truncate` / `max-w-[200px] truncate`
- **Whitespace (dates):** `whitespace-nowrap`

### Status Badges

```
const base = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize';

// Active / Approved:  bg-emerald-50 text-emerald-600
// Pending:            bg-amber-50 text-amber-600
// Rejected / Inactive: bg-rose-50 text-rose-600
```

### Action Buttons

```
<div className="flex items-center gap-1">
  <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors" title="View">
    <Eye size={14} />
  </button>
</div>
```

Color variants: `hover:text-amber-600 hover:bg-amber-50`, `hover:text-red-500 hover:bg-red-50`, `hover:text-blue-600 hover:bg-blue-50`, `hover:text-emerald-500 hover:bg-emerald-50`.

## Mobile Cards

```
<div className="md:hidden divide-y divide-zinc-100">
  {data.map((item, i) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="p-4 space-y-2"
    >
      ...
    </motion.div>
  ))}
</div>
```

## Pagination

```
<div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-zinc-100">
  <p className="text-xs text-zinc-500">
    Showing <span className="font-bold text-zinc-900">{startRow}</span>–
    <span className="font-bold text-zinc-900">{endRow}</span> of{' '}
    <span className="font-bold text-zinc-900">{total}</span> items
  </p>
  <div className="flex items-center gap-2">
    <button
      onClick={() => setPage(p => Math.max(1, p - 1))}
      disabled={page <= 1}
      className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <ChevronLeft size={16} className="text-zinc-600" />
    </button>
    <button
      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
      disabled={page >= totalPages}
      className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <ChevronRight size={16} className="text-zinc-600" />
    </button>
  </div>
</div>
```

**Pagination setup:**

```
const PAGE_SIZE = 10;
const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
const startRow = (page - 1) * PAGE_SIZE + 1;
const endRow = Math.min(page * PAGE_SIZE, filtered.length);
const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
```

## Toast Notification

```
<AnimatePresence>
  {toast && (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="fixed top-5 right-5 z-50 bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
    >
      <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
    </motion.div>
  )}
</AnimatePresence>
```

## Modal

```
<div
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
  onClick={closeOnBackdropClick ? onClose : undefined}
  onKeyDown={handleKeyDown}
  role="dialog"
  aria-modal="true"
>
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    onClick={(e) => e.stopPropagation()}
    className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
  >
    <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
      <h3 className="font-bold text-zinc-900">{title}</h3>
      <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
        <X size={20} />
      </button>
    </div>
    {children}
  </motion.div>
</div>
```

### Form Field

```
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClassName = "w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all";
```

### Form Submit Button

```
<button
  type="submit"
  disabled={loading}
  className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
>
  <Save size={16} /> {loading ? 'Creating...' : 'Create'}
</button>
```

## Role Badges

```
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-rose-50 text-rose-700',
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  delivery: 'bg-zinc-50 text-zinc-600',
  delivery_boy: 'bg-zinc-50 text-zinc-600',
  staff: 'bg-emerald-50 text-emerald-700',
};

<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize {color}">
  <Shield size={10} />{role}
</span>
```

## Status Toggle Badge

```
<button
  onClick={() => handleToggle(item)}
  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all border
    {active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            : 'bg-red-50 text-red-700 border-red-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}"
>
  {active ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
</button>
```

## Dashboard-Specific Patterns

### Live Map Card

```
<div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4">
  <div className="flex items-center justify-between gap-2 mb-4">
    <h3 className="text-sm font-bold text-zinc-900">Live fleet map</h3>
    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">
      {counts}
    </span>
  </div>
  <div className="h-64 md:h-72 lg:aspect-square lg:h-auto bg-white rounded-lg relative overflow-hidden border border-zinc-100 shadow-inner">
    <MapPreview ... />
  </div>
</div>
```

### Activity List

```
<div className="space-y-2">
  {items.map((item) => (
    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200 shadow-sm">
          <Truck size={14} className="text-zinc-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-900">{item.number}</p>
          <p className="text-[10px] text-zinc-500">{item.details}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-zinc-900">₹{amount}</p>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ...">{status}</span>
      </div>
    </div>
  ))}
</div>
```

### Last Updated Badge

```
<div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 shadow-sm">
  <Clock size={16} className="text-zinc-400" />
  Last updated: {time}
</div>
```

### Dashboard Select + Input

```
<div className="relative group">
  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
  <SearchableSelect
    value={selectedBoyId}
    onChange={setSelectedBoyId}
    className="w-[180px]"
    options={[...options]}
  />
  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
    <ArrowUpRight size={12} className="rotate-90" />
  </div>
</div>

<motion.input
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  type="text"
  placeholder="Enter Name..."
  value={value}
  onChange={e => setValue(e.target.value)}
  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm w-32"
/>
```

## Animations Reference

| Element | `initial` | `animate` | `transition` |
|---|---|---|---|
| Page header | `{{ opacity: 0, y: -10 }}` | `{{ opacity: 1, y: 0 }}` | — |
| Filter bar | `{{ opacity: 0, y: 5 }}` | `{{ opacity: 1, y: 0 }}` | `{{ delay: 0.05 }}` |
| Table card | `{{ opacity: 0, y: 10 }}` | `{{ opacity: 1, y: 0 }}` | `{{ delay: 0.1 }}` |
| Table row | `{{ opacity: 0 }}` | `{{ opacity: 1 }}` | `{{ delay: i * 0.02 }}` |
| Mobile card | `{{ opacity: 0, y: 5 }}` | `{{ opacity: 1, y: 0 }}` | `{{ delay: i * 0.03 }}` |
| Stat card | `{{ opacity: 0, y: 20 }}` | `{{ opacity: 1, y: 0 }}` | `{{ delay: i * 0.05 }}` |
| Dashboard stat | `{{ opacity: 0, y: 10 }}` | `{{ opacity: 1, y: 0 }}` | `{{ delay: i * 0.05 }}` |
| Toast | `{{ opacity: 0, y: -20 }}` | `{{ opacity: 1, y: 0 }}` | — |
| Modal overlay | `{{ opacity: 0, scale: 0.95 }}` | `{{ opacity: 1, scale: 1 }}` | — |
| Custom input | `{{ opacity: 0, scale: 0.95 }}` | `{{ opacity: 1, scale: 1 }}` | — |

## Color Palette (Zinc-based)

- **Page background:** implicit (via body)
- **Cards, inputs:** `bg-white`
- **Card borders:** `border-zinc-100`
- **Input bg:** `bg-zinc-50`
- **Input borders:** `border-zinc-200`
- **Table header:** `bg-zinc-50/50`
- **Divider:** `border-zinc-100`, `divide-zinc-50` / `divide-zinc-100`
- **Primary text:** `text-zinc-900`
- **Secondary text:** `text-zinc-500` / `text-zinc-400`
- **Hover states:** `hover:bg-zinc-100` / `hover:bg-zinc-50/50`
- **Focus ring:** `focus:ring-zinc-900/5 focus:border-zinc-900`
- **Accent (modals/forms):** `focus:ring-emerald-500/20 focus:border-emerald-400`
- **Primary action (default):** `bg-zinc-900 text-white`
- **Primary action (create):** `bg-emerald-500 text-white`
