import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';
import { LogOut } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import InvoiceConfirmPaymentPage from './pages/invoices/InvoiceConfirmPaymentPage';
import InvoiceAssignPage from './pages/invoices/InvoiceAssignPage';
import InvoiceDeletePage from './pages/invoices/InvoiceDeletePage';
import InvoiceVoidPage from './pages/invoices/InvoiceVoidPage';
import InvoiceSignedPreviewPage from './pages/invoices/InvoiceSignedPreviewPage';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';
import DeliveryBoyApp from './pages/DeliveryBoyApp';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import DeveloperPortal from './pages/DeveloperPortal';
import Notifications from './pages/Notifications';
import StaffApp from './pages/StaffApp';
import Tasks from './pages/Tasks';
import TaskDetailPage from './pages/tasks/TaskDetailPage';
import TaskCreatePage from './pages/tasks/TaskCreatePage';
import TaskEditPage from './pages/tasks/TaskEditPage';
import TaskDeletePage from './pages/tasks/TaskDeletePage';
import { useNotifications } from './hooks/useNotifications';
import BottomNav from './components/BottomNav';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/invoices': 'Invoices',
  '/tracking': 'Live Tracking',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
};

function TopBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  let title = PAGE_TITLES[location.pathname] || 'Dashboard';
  const p = location.pathname;
  /* Keep top bar aligned with sidebar: all invoice routes show “Invoices” like the list page. */
  if (p === '/invoices' || p.startsWith('/invoices/')) {
    title = 'Invoices';
  }
  if (p === '/tasks' || p.startsWith('/tasks/')) {
    title = 'Tasks';
  }
  return (
    <header className="h-16 bg-white border-b border-zinc-100 px-5 flex items-center justify-between sticky top-0 z-30 shadow-sm grow-0 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-4 ring-emerald-50">
          M
        </div>
        <h2 className="text-base font-extrabold text-zinc-900 tracking-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button onClick={logout} className="p-2 rounded-xl text-zinc-400 hover:text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  useNotifications();

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-white font-bold text-zinc-400 animate-pulse">Loading...</div>;

  if (!user) return <Login />;

  // Roles like delivery_boy and staff use a clean bottom-nav layout
  if (user.role === 'delivery_boy' || user.role === 'staff') {
    return (
      <div className="flex flex-col min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-zinc-50">
        <Routes>
          <Route path="/" element={user.role === 'delivery_boy' ? <DeliveryBoyApp /> : <StaffApp />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    );
  }

  // Admin/Manager layout (Desktop has Sidebar, Mobile has BottomNav)
  return (
    <div className="flex min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F8F9FA]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto pb-20 lg:pb-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/:taskId/edit" element={<TaskEditPage />} />
            <Route path="/tasks/:taskId/delete" element={<TaskDeletePage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/invoices/:invoiceId/confirm-payment" element={<InvoiceConfirmPaymentPage />} />
            <Route path="/invoices/:invoiceId/assign" element={<InvoiceAssignPage />} />
            <Route path="/invoices/:invoiceId/delete" element={<InvoiceDeletePage />} />
            <Route path="/invoices/:invoiceId/void" element={<InvoiceVoidPage />} />
            <Route path="/invoices/:invoiceId/signed-preview" element={<InvoiceSignedPreviewPage />} />
            <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users" element={user.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Developer Portal — standalone, has its own PIN auth */}
        <Route path="/dev" element={<DeveloperPortal />} />
        {/* Main app — wrapped in AuthProvider */}
        <Route path="/*" element={
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}

