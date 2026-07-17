# Neomed Delivery App — UI Design Document

## 1. Product Overview

Neomed is a medical/pharmaceutical delivery management system. It handles the end-to-end lifecycle of invoice deliveries to hospitals — from creation, assignment to delivery personnel, real-time GPS tracking, delivery confirmation with payment collection, signed copy upload, and post-delivery audit logging.

The single deployment serves two user-facing experiences:
- **Desktop web app** — Admin/Manager dashboard for oversight, reporting, and management
- **Mobile web app** — Delivery Boy / Staff interfaces optimized for field use

---

## 2. Visual Design System

### 2.1 Color Palette

| Role | Color | Tailwind | Usage |
|------|-------|----------|-------|
| **Base Background** | Near-white | `bg-zinc-50` | Page background |
| **Surface** | White | `bg-white` | Cards, sidebar, modals |
| **Primary Accent** | Emerald | `emerald-500` | Active states, CTAs, success |
| **Pending** | Amber | `amber-500` | Pending invoices, waiting status |
| **Assigned** | Blue | `blue-500` | Assigned invoices, active checkpoints |
| **Completed** | Emerald | `emerald-500` | Delivered/completed invoices |
| **Cancelled** | Red | `red-500` | Cancelled invoices, errors |
| **Return** | Purple | `purple-500` | Return invoices |
| **Text Primary** | Zinc-900 | `text-zinc-900` | Headings, important text |
| **Text Secondary** | Zinc-500 | `text-zinc-500` | Descriptions, labels |
| **Text Muted** | Zinc-400 | `text-zinc-400` | Subtitles, timestamps |
| **Border** | Zinc-200 | `border-zinc-200` | Card borders, dividers |

### 2.2 Typography

- **Font**: Inter (loaded via Google Fonts) — weights 300–700
- **Page Titles**: `text-2xl font-bold text-zinc-900 tracking-tight`
- **Section Headings**: `text-lg font-bold text-zinc-900`
- **Card Titles**: `text-sm font-bold text-zinc-900 tracking-tight`
- **Labels**: `text-[10px] uppercase tracking-wider text-zinc-400 font-semibold`
- **Body Text**: `text-sm text-zinc-600`
- **Status Badges**: `text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5`

### 2.3 Container & Card Styles

- **Cards**: `bg-white rounded-xl border border-zinc-200 shadow-sm`
- **Active Nav Item**: `bg-zinc-900 text-white rounded-lg shadow-sm`
- **Modals**: Backdrop blur + `bg-white rounded-2xl shadow-xl` with `motion` enter/exit animations
- **Buttons**: `rounded-lg` with hover transitions; primary uses `bg-zinc-900 text-white`
- **Input Fields**: `rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm` with focus ring
- **Bottom Nav**: `bg-white/80 backdrop-blur-lg` with `border-t border-zinc-100`

### 2.4 Animation Patterns

All animations use the **Motion** library (Framer Motion successor):

| Pattern | Implementation |
|---------|---------------|
| Page transitions | `AnimatePresence mode="wait"` with fade + slide |
| Modal entrance | `initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}` |
| Card stagger | Sequential fade-up with delay |
| Sidebar collapse | `motion.aside animate={{ width: isOpen ? 240 : 0 }}` |
| Bottom nav active | `animate-in zoom-in-50 duration-300` on icon |
| Dropdown menus | `initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}` |

---

## 3. Layout System

### 3.1 Desktop Layout (Admin/Manager — >=1024px)

```
+----------+----------------------------------------------+
|          |  TopBar (sticky)                             |
| Sidebar  +----------------------------------------------+
| (240px)  |                                              |
|          |  Main Content Area                           |
| fixed    |  (scrollable)                                |
| left     |                                              |
|          |                                              |
|          |                                              |
|          |                                              |
|          +----------------------------------------------+
|  User    |                                              |
|  Info    |                                              |
|  Logout  |                                              |
+----------+----------------------------------------------+
```

- **Sidebar**: 240px fixed width, collapsible on mobile (hamburger toggle)
- **TopBar**: Sticky header with page title, back button, notification bell, logout
- **Main Content**: Full remaining width, scrollable

### 3.2 Mobile Layout (Delivery Boy/Staff)

```
+--------------------------------------+
|  TopBar (sticky)                     |
+--------------------------------------+
|                                      |
|  Full-Screen Content                 |
|  (scrollable, bottom-padded)         |
|                                      |
|                                      |
|                                      |
+--------------------------------------+
|  BottomNav (fixed, h-16)            |
|  [Home] [Tasks] [Invoices] [Profile] |
+--------------------------------------+
```

- **BottomNav**: Fixed bottom bar with glass effect (`backdrop-blur-lg`), role-filtered tabs
- **Content**: Full height minus topbar (sticky) and bottomnav (fixed 64px)
- **Safe Area**: `pb-safe-bottom` for devices with home indicator

### 3.3 Mobile Layout (Admin/Manager — <1024px)

Same as Delivery Boy but with additional nav tabs based on role. Sidebar becomes a slide-over overlay toggled by hamburger button at top-left.

---

## 4. Navigation Structure

### 4.1 Sidebar Items (Desktop)

| Icon | Label | Path | Roles |
|------|-------|------|-------|
| LayoutDashboard | Dashboard | `/` | admin, manager |
| Package | Tasks | `/tasks` | admin, manager |
| FileText | Invoices | `/invoices` | admin, manager |
| MapPin | Live Tracking | `/tracking` | admin, manager |
| BarChart3 | Reports | `/reports` | admin, manager |
| History | Audit Logs | `/logs` | admin, manager |
| Users | User Management | `/users` | admin |
| Bell | Notifications | `/notifications` | admin |
| SettingsIcon | Settings | `/settings` | admin |
| UserCircle | Profile | `/profile` | admin, manager |

### 4.2 Bottom Nav Tabs (Mobile)

| Icon | Label | Path | Roles |
|------|-------|------|-------|
| LayoutDashboard | Home | `/` | all |
| Package | Tasks | `/tasks` | admin, manager |
| FileText | Invoices | `/invoices` | admin, manager, delivery_boy, staff |
| Users | Users | `/users` | admin |
| SettingsIcon | Settings | `/settings` | admin |
| UserCircle | Profile | `/profile` | all |

### 4.3 Delivery Boy Mobile Nav

The `DeliveryBoyApp` component uses its own internal tab system (not BottomNav):
- **Available** — Invoices ready to accept
- **Active** — Currently delivering invoices
- **Completed** — Delivery history with search

### 4.4 Active State Detection

Navigation active state uses prefix matching via `isNavItemActive()` — e.g., `/invoices` matches `/invoices/123/confirm-payment`. Active items get `bg-zinc-900 text-white` in sidebar and `text-emerald-500` in bottom nav.

---

## 5. Screen Catalog

### 5.1 Login (`/login`)

| Property | Value |
|----------|-------|
| **Layout** | Full-screen centered card |
| **Background** | Gradient: `from-emerald-50 via-white to-blue-50` |
| **Elements** | App icon + logo, email input, password input (show/hide toggle), sign-in button, forgot password link |
| **Views** | Three animated views: `login`, `forgot`, `sent` (password reset) |
| **Animation** | Logo scales in, form slides up, view transitions crossfade |
| **Error State** | Red alert banner with `AlertCircle` icon |
| **Mobile** | Full-width, max-w-md centered |

### 5.2 Dashboard (`/`)

| Property | Value |
|----------|-------|
| **Layout** | Stats grid + recent activity + live map panel |
| **Access** | admin, manager |
| **Stat Cards** | Total Boys, Pending, Assigned, Completed, Cancelled, Return — each with icon, count, and label |
| **Delivery Boy Filter** | `SearchableSelect` dropdown (admin only) to filter stats by specific rider |
| **Recent Activity** | Last 5 completed invoices as a list with hospital name, amount, time |
| **Live Fleet Map** | Leaflet map showing on-duty riders with GPS positions, colored by status |
| **Map Markers** | Circular avatar markers with rider initials, colored by status (emerald=moving, amber=waiting, red=disconnected) |
| **Data Refresh** | Polls every 5s (disconnected) or 45s (WebSocket connected) |
| **Responsive** | Stats grid 2-col mobile -> 3-col tablet -> 6-col desktop; map full-width below stats |

### 5.3 Invoices List (`/invoices`)

| Property | Value |
|----------|-------|
| **Layout** | Tab bar + filter row + data table/cards + pagination |
| **Access** | admin, manager |
| **Tabs** | Active / Deleted (toggle between live and soft-deleted invoices) |
| **Filters** | Search (debounced), Status dropdown, Invoice Type dropdown, Delivery Boy dropdown, Date picker |
| **Sort** | Clickable column headers (id, amount, hospital, dates) with asc/desc toggle |
| **Desktop View** | Full data table with columns: Invoice #, Hospital, Amount, Type, Status badge, Assigned Boy, Dates, Actions |
| **Mobile View** | Stacked cards with key info, swipe actions |
| **Actions per Row** | View, Confirm Payment, Assign, Void, Delete, Restore (contextual based on status) |
| **Create Button** | Opens modal with form: invoice number, hospital name, amount, description, optional assignee |
| **Pagination** | Page number selector, page size (20), prev/next buttons |
| **Status Badges** | Color-coded: pending=amber, assigned=blue, delivered=emerald, cancelled=red, return=purple |
| **Optimistic Refresh** | Non-blocking data reload when items already exist in state |

### 5.4 Invoice Detail (`/invoices/:id`)

| Property | Value |
|----------|-------|
| **Layout** | Detail card with all fields, action buttons, audit log section |
| **Fields Displayed** | Invoice #, Hospital, Amount, Type, Status, Assigned Boy, Cash/Cheque received, Delivery Feedback, Dates (created, assigned, delivered, completed) |
| **Actions** | Edit, Assign, Confirm Payment, Void, Delete, Restore, Upload Signed Copy |
| **Signed Copy** | Image preview modal with zoom |
| **Audit Log** | Inline list of field changes with old -> new values |

### 5.5 Invoice Sub-Pages

| Route | Purpose | Key UI |
|-------|---------|--------|
| `/invoices/:id/confirm-payment` | Admin confirms cash/cheque | Amount inputs, submit button |
| `/invoices/:id/assign` | Assign delivery boy | `SearchableSelect` with delivery boys |
| `/invoices/:id/delete` | Soft delete with reason | Reason text input, confirm button |
| `/invoices/:id/void` | Void invoice | Confirm dialog |
| `/invoices/:id/restore` | Restore cancelled to pending | Confirm dialog |
| `/invoices/:id/signed-preview` | View signed copy image | Full-screen image viewer |

### 5.6 Tasks (`/tasks`)

| Property | Value |
|----------|-------|
| **Layout** | Toggle between grid and table view + filter row |
| **Access** | admin, manager |
| **Filters** | Search, Status dropdown, Assignee dropdown |
| **View Toggle** | Grid (card layout) / Table (rows) with icon buttons |
| **Task Card (Grid)** | Task name, assignee, status badge, created date, action buttons (edit, delete) |
| **Task Table** | Columns: Name, Assignee, Status, Created, Actions |
| **Create** | Modal with: task name, description, assignee (`SearchableSelect`) |
| **Sub-pages** | Create, Detail, Edit, Delete — each with dedicated layout and forms |
| **Photo Upload** | Camera/file upload for task completion evidence |

### 5.7 Live Tracking (`/tracking`)

| Property | Value |
|----------|-------|
| **Layout** | Split: Rider sidebar list + Full-width Leaflet map |
| **Access** | admin, manager |
| **Rider List** | Cards showing: avatar (initials), name, status dot, battery level, speed, distance |
| **Status Colors** | Moving: emerald avatar + blue pulsing dot; Waiting: amber; Disconnected: red |
| **Map Markers** | Circular avatar markers matching rider list colors |
| **Checkpoint View** | Click rider -> shows checkpoint timeline panel with polyline path on map |
| **Path Visualization** | Colored polylines between checkpoints, checkpoint markers (emerald=completed, blue=active) |
| **Filters** | SearchableSelect to filter to specific rider |
| **Real-time** | WebSocket `location_update` messages update rider positions instantly |
| **Data** | Checkpoints, travel paths, battery, speed, motion status |

### 5.8 Reports (`/reports`)

| Property | Value |
|----------|-------|
| **Layout** | Tabbed: Invoice Overview, Delivery Performance, Per-Boy Stats |
| **Access** | admin, manager |
| **Charts** | Recharts: BarChart (by type), LineChart (by weekday), PieChart (by status) |
| **Chart Styling** | White background cards, rounded-xl borders, shadow tooltips |
| **Filters** | Date range picker, Delivery Boy selector |
| **Map View** | Delivery path reports with colored segments (green=moving, amber=slow, red=idle) |
| **Movement Analysis** | Moving/slow/idle time breakdown with distance metrics |
| **Checkpoint Path Panel** | Inline panel showing checkpoint timeline with polyline visualization |
| **Responsive** | Charts use `ResponsiveContainer` for fluid sizing |

### 5.9 Delivery Boy App (`/` — mobile role)

| Property | Value |
|----------|-------|
| **Layout** | Full-screen mobile app with internal tabs |
| **Access** | delivery_boy |
| **On-Duty Toggle** | Large power button at top — toggles GPS tracking on/off |
| **Tabs** | Available / Active / Completed |
| **Available Tab** | List of pending invoices with hospital name, amount, type, distance |
| **Active Tab** | Currently delivering invoices with: timer, GPS indicator, delivery actions |
| **Completed Tab** | History with search, date filter, pagination |
| **Delivery Flow** | Accept -> Timer starts -> Navigate -> Complete delivery |
| **Payment Collection** | Cash input, Cheque input (number, bank name, photo upload) |
| **Signed Copy** | Camera capture or file upload |
| **GPS Tracking** | WebSocket sends `location_update` every few seconds, HTTP fallback |
| **Notifications** | In-app notification panel with audio chime for new invoices |
| **Map** | Embedded Leaflet map showing current position |

### 5.10 Staff App (`/` — staff role)

| Property | Value |
|----------|-------|
| **Layout** | Single-screen distance indicator |
| **Access** | staff |
| **Geofence Display** | Distance from office in meters, inside/outside status |
| **Status Indicator** | Green checkmark (inside) / Red warning triangle (outside) |
| **Alert** | Sends notification to admin/manager when staff leaves premises |
| **GPS** | `navigator.geolocation.watchPosition` — continuous tracking |

### 5.11 User Management (`/users`)

| Property | Value |
|----------|-------|
| **Layout** | Searchable, sortable data table |
| **Access** | admin only |
| **Columns** | Username, Email, Phone, Role (colored badge), Status (active/inactive), Actions |
| **Role Badges** | Color-coded: super_admin=rose, admin=purple, manager=blue, delivery=zinc, staff=emerald |
| **Actions** | Edit (modal), Reset Password (modal), Activate/Deactivate toggle |
| **Create** | Modal with: full name, email, password, phone, role selector |
| **Sort** | Clickable column headers with arrow indicators |
| **Search** | Real-time text filter across all fields |

### 5.12 Notifications (`/notifications`)

| Property | Value |
|----------|-------|
| **Layout** | Notification list + compose panel |
| **Access** | admin |
| **Notification Cards** | Title, message, priority dot, timestamp, read/unread status, target badges |
| **Priority Indicators** | Normal: zinc dot; Important: amber dot; Urgent: red dot |
| **Target Badges** | Colored pills: Everyone=purple, Admins=rose, Managers=blue, Delivery Boys=emerald |
| **Compose** | Slide-in panel with: title, message, target multi-select, priority selector |
| **Actions** | Mark as read, Multi-select delete, Pagination |
| **System Notifications** | New invoice alerts (with invoice number), Delivery user offline events |
| **Browser Push** | Firebase FCM integration for desktop notifications + audio chime |

### 5.13 Audit Logs (`/logs`)

| Property | Value |
|----------|-------|
| **Layout** | Paginated table of change entries |
| **Access** | admin, manager |
| **Columns** | Timestamp, Invoice #, Field, Old Value -> New Value, Changed By |
| **Filters** | Field dropdown (invoice number, hospital, amount, status, etc.), Search (debounced) |
| **Field Labels** | Human-readable: "Invoice #", "Hospital", "Amount", "Status", "Assignee", etc. |
| **Links** | Invoice # links to invoice detail page |
| **Pagination** | 50 entries per page, prev/next navigation |

### 5.14 Settings (`/settings`)

| Property | Value |
|----------|-------|
| **Layout** | API key management card |
| **Access** | admin |
| **Key List** | Provider (groq/gemini), Label, Key Preview (masked), Status (active/inactive toggle), Failure Count, Created Date |
| **Add Key** | Modal with: provider selector, label, full API key input |
| **Actions** | Toggle active/inactive, Delete (with confirmation) |
| **Fallback** | Shows dummy data if no keys exist in database |

### 5.15 Profile (`/profile`)

| Property | Value |
|----------|-------|
| **Layout** | Tabbed sections: Password, Gmail, Geofences, Working Locations |
| **Access** | all roles |
| **Password** | Current + new + confirm password form |
| **Gmail Integration** | Connect/Disconnect button, OAuth flow, synced email list with search, read/star/sync actions |
| **Store Geofences** | CRUD list with Leaflet map picker for drawing geofence radius |
| **Working Locations** | CRUD list for staff geofence definitions |
| **Gmail Monitor** | Auto-import settings for invoice PDF detection |

---

## 6. Reusable UI Components

### 6.1 SearchableSelect

- **Purpose**: Dropdown with type-to-search filtering
- **Props**: `options`, `value`, `onChange`, `placeholder`
- **Usage**: Delivery boy selection, status filters, role selectors across all pages
- **Behavior**: Typing filters options; click to select; clear button; keyboard navigation

### 6.2 MapPreview

- **Purpose**: Leaflet map with rider markers, polylines, and checkpoint markers
- **Props**: `center`, `zoom`, `markers`, `routeSegments`, `checkpointMarkers`
- **Features**: Auto-resize on mount, custom rider icons (initials with status colors), polyline segments with configurable colors
- **Marker Types**: Rider (circular avatar), Checkpoint (pin with icon), Default (Leaflet pin)
- **Used In**: Dashboard, Tracking, Reports

### 6.3 CheckpointPathPanel

- **Purpose**: Timeline panel showing delivery checkpoint history with map path
- **Props**: `checkpoints`, `pathSegments`, `selectedCheckpoint`
- **Features**: Vertical timeline with icons, colored polyline segments between checkpoints, clickable checkpoint items
- **Used In**: Tracking, Reports

### 6.4 Sidebar

- **Purpose**: Desktop navigation with app switcher and user info
- **Features**: Collapsible (hamburger on mobile), role-filtered items, notification badge, Delivery/HRMS app switcher dropdown, user avatar with initials, logout button
- **Width**: 240px expanded, 0px collapsed

### 6.5 BottomNav

- **Purpose**: Mobile fixed bottom navigation bar
- **Features**: Glass effect background, role-filtered tabs, active state with emerald highlight and zoom animation
- **Height**: 64px (h-16)

### 6.6 NotificationBell

- **Purpose**: Bell icon with unread count badge in topbar
- **Features**: Red badge with count, click to navigate to notifications page

### 6.7 InvoiceDesktopRow / InvoiceMobileCard

- **Purpose**: Responsive invoice list items
- **Desktop**: Table row with all columns, hover state, action dropdown
- **Mobile**: Stacked card with key info, status badge, action buttons
- **Shared**: Status color mapping, fake duration calculation, action handlers

### 6.8 InvoiceSectionFrame / TaskSectionFrame

- **Purpose**: Layout wrapper for invoice/task detail pages
- **Features**: Consistent header with title, subtitle, back button, action buttons

---

## 7. Key User Flows

### 7.1 Invoice Assignment Flow

```
Admin creates invoice (modal form)
  -> Invoice appears in list as "pending"
  -> Admin clicks "Assign" action
  -> Selects delivery boy from SearchableSelect
  -> Invoice status changes to "assigned"
  -> WebSocket broadcasts new_invoice event to delivery boy
  -> Delivery Boy sees invoice in "Available" tab
  -> Delivery Boy taps "Accept"
  -> Invoice status updates, timer starts
  -> Delivery Boy GPS tracking begins
```

### 7.2 Live Tracking Flow

```
Admin opens Tracking page
  -> WebSocket connects to /ws/tracking
  -> Rider list loads from /tracking/on-duty-deliveries
  -> Map shows all on-duty riders with colored markers
  -> Live location_update messages update positions in real-time
  -> Admin clicks a rider card
  -> Checkpoint timeline panel opens
  -> Map shows rider's travel path with colored segments
  -> Admin can see: checkpoints, battery, speed, motion status
```

### 7.3 Delivery Confirmation Flow

```
Delivery Boy completes delivery
  -> Taps "Complete" on active delivery
  -> Captures GPS position
  -> Enters cash amount received
  -> Enters cheque details (number, bank, photo)
  -> Uploads signed copy photo
  -> Submits delivery confirmation
  -> Invoice status -> "delivered"
  -> Admin receives notification
  -> Admin confirms payment in Invoice Detail page
  -> Invoice status -> "completed"
```

### 7.4 Notification System

```
Trigger: New invoice assigned / User offline / Manual compose
  |
  v
Three delivery channels (with deduplication):
  1. WebSocket -> In-app real-time update
  2. Firebase FCM -> Browser push notification + audio
  3. Polling -> Fallback every 5s when WebSocket disconnected
  |
  v
Notification stored in localStorage (client-side)
  |
  v
Rendered in: NotificationBell (badge count), Notifications page (full list)
```

---

## 8. Map & Geolocation UI

### 8.1 Live Fleet Map

- **Library**: Leaflet + react-leaflet
- **Tile Layer**: OpenStreetMap
- **Default Center**: Nashik, India (19.9975, 73.7898)
- **Rider Markers**: Custom `L.divIcon` with circular background, initials text, status-colored border
- **Popup**: Rider name, status, last seen time
- **Auto-fit**: Map bounds adjust to fit all visible markers

### 8.2 Checkpoint Path Visualization

- **Checkpoint Markers**: Circular with icons (pin for active, checkmark for completed)
- **Polylines**: Colored segments between checkpoints (emerald=completed, blue=active)
- **Segment Colors**: Per-checkpoint color mapping via `segmentColorForCheckpoint()`

### 8.3 Store Geofence Picker

- **Component**: Interactive Leaflet map in Profile page
- **Interaction**: Click to set center point, slider for radius
- **Display**: Circle overlay showing geofence boundary
- **CRUD**: Create, edit (move center/adjust radius), delete

### 8.4 DeliveryBoyApp GPS

- **Primary**: WebSocket `location_update` messages (every few seconds)
- **Fallback**: HTTP `PATCH /users/me/delivery-location` when WebSocket is down
- **Display**: Embedded Leaflet map showing current position
- **Indicator**: Navigation icon with GPS status

---

## 9. Forms & Modals

### 9.1 Common Modal Pattern

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}>
        {/* Content */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### 9.2 Invoice Create/Edit Modal

- **Fields**: Invoice number, Hospital name, Amount, Description, Assigned to (optional)
- **Validation**: Required fields highlighted on submit
- **Submit**: Creates/updates via API, refreshes list

### 9.3 Task Create/Edit Modal

- **Fields**: Task name, Description, Assignee (SearchableSelect)
- **Submit**: Creates/updates via API

### 9.4 User Create/Edit Modal

- **Fields**: Full name, Email, Password (create only), Phone, Role selector
- **Password Reset Modal**: New password input with show/hide toggle
- **Role Selector**: Dropdown populated from `/roles` API

### 9.5 API Key Add Modal

- **Fields**: Provider (groq/gemini radio), Label, API Key (full key input)
- **Submit**: Encrypts and stores via API

### 9.6 Compose Notification Panel

- **Fields**: Title, Message (textarea), Target multi-select (Everyone/Admins/Managers/Delivery Boys), Priority (Normal/Important/Urgent)
- **Submit**: Sends via API, appears in notification list

---

## 10. Mobile-Specific UI

### 10.1 DeliveryBoyApp

- **On-Duty Toggle**: Large power button at top, toggles GPS tracking
- **Tab System**: Internal tabs (Available/Active/Completed) — not BottomNav
- **Invoice Cards**: Hospital name, amount, type badge, action buttons
- **Active Delivery**: Timer display (HH:MM:SS), GPS indicator, complete button
- **Payment Form**: Cash input, cheque details with camera upload
- **Signed Copy**: Camera capture or file picker
- **Notifications Panel**: Slide-down panel with notification list
- **Pull-to-Refresh**: Manual refresh button for invoice lists

### 10.2 StaffApp

- **Single Screen**: Distance from office displayed prominently
- **Status Indicator**: Large icon — green checkmark (inside) or red warning (outside)
- **Distance Display**: "X meters from office" with real-time updates
- **Alert System**: Automatic notification sent when leaving geofence

### 10.3 BottomNav Behavior

- **Fixed Position**: Always visible at bottom
- **Glass Effect**: `bg-white/80 backdrop-blur-lg`
- **Active Tab**: Emerald text + icon in emerald-50 rounded background + zoom animation
- **Inactive Tab**: Zinc-400 text
- **Safe Area**: `pb-safe-bottom` padding for iOS devices

---

## 11. State & Feedback Patterns

### 11.1 Loading States

- **Initial Load**: Skeleton/placeholder cards or full-page spinner
- **Refresh**: Subtle spinner in header/refresh button, list remains visible
- **Submit**: Button shows loading spinner, form disabled
- **Map Loading**: `ResizeHandler` component invalidates map size after 100ms delay

### 11.2 Empty States

- **No Data**: Message like "No invoices found" with icon
- **No Results**: "No results for search term" with clear filter button
- **HRMS Pages**: "Coming Soon" placeholder with descriptive text

### 11.3 Error States

- **API Errors**: Red alert banner with `AlertCircle` icon and error message
- **Network Errors**: `normalizeFetchError()` provides user-friendly messages
- **401 Unauthorized**: Auto-logout via `neomed-api-401` custom event
- **Map Errors**: Inline error message with retry option

### 11.4 Optimistic UI

- **Invoice List**: Non-blocking refresh when items already exist (`isRefreshing` flag)
- **Delete/Cancel**: Immediate removal from list, API call in background
- **Assign**: Status badge updates immediately on assign action

### 11.5 Toast & Notifications

- **In-App Toasts**: Ephemeral success/error messages with auto-dismiss
- **Browser Notifications**: `Notification API` for desktop push
- **Audio Chime**: Plays on new invoice alerts and important notifications
- **Deduplication**: By `notification_id` and `invoice_id` across delivery channels

---

## 12. Environment & Configuration

### 12.1 Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API URL (default: `https://api-neomed.encryptedbar.com`) |
| `VITE_FIREBASE_*` | Firebase config for FCM push notifications |
| `VITE_FIREBASE_VAPID_KEY` | Firebase Web Push certificate public key |

### 12.2 Deployment

- **Platform**: Vercel (configured via `vercel.json`)
- **Build**: `npm run build` (TypeScript check + Vite build)
- **Preview**: `npm run preview`

### 12.3 Development

```bash
npm install
npm run dev      # Vite dev server with HMR
npm run lint     # TypeScript type checking (tsc --noEmit)
npm run build    # Production build
```
