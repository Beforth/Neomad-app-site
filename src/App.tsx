import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';
import DeliveryBoyApp from './pages/DeliveryBoyApp';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import DeveloperPortal from './pages/DeveloperPortal';
import Notifications from './pages/Notifications';
import StaffApp from './pages/StaffApp';
import Tasks from './pages/Tasks';

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
  const { user } = useAuth();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Dashboard';
  return (
    <header className="h-14 bg-white border-b border-zinc-100 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <h2 className="text-sm font-bold text-zinc-400 tracking-tight">{title}</h2>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 shadow-sm">
          {user?.username[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) return <Login />;

  if (user.role === 'delivery_boy') {
    return <DeliveryBoyApp />;
  }

  if (user.role === 'staff') {
    return <StaffApp />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users" element={user.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={user.role === 'admin' ? <Notifications /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
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

