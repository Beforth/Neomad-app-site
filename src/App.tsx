import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';
import DeliveryBoyApp from './pages/DeliveryBoyApp';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) return <Login />;

  if (user.role === 'delivery_boy') {
    return <DeliveryBoyApp />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users" element={user.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
