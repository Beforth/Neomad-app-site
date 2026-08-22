import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';
import { ChevronLeft, LogOut } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import InvoiceConfirmPaymentPage from './pages/invoices/InvoiceConfirmPaymentPage';
import InvoiceAssignPage from './pages/invoices/InvoiceAssignPage';
import InvoiceDeletePage from './pages/invoices/InvoiceDeletePage';
import InvoiceVoidPage from './pages/invoices/InvoiceVoidPage';
import InvoiceRestorePage from './pages/invoices/InvoiceRestorePage';
import InvoiceSignedPreviewPage from './pages/invoices/InvoiceSignedPreviewPage';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import DeliveryBoyApp from './pages/DeliveryBoyApp';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import StaffApp from './pages/StaffApp';
import AuditLogs from './pages/AuditLogs';
import Tasks from './pages/Tasks';
import TaskDetailPage from './pages/tasks/TaskDetailPage';
import TaskCreatePage from './pages/tasks/TaskCreatePage';
import TaskEditPage from './pages/tasks/TaskEditPage';
import TaskDeletePage from './pages/tasks/TaskDeletePage';
import Attendance from './pages/hrms/Attendance';
import Shifts from './pages/hrms/Shifts';
import ShiftTypeForm from './pages/hrms/ShiftTypeForm';
import ShiftAssign from './pages/hrms/ShiftAssign';
import ShiftAssignNew from './pages/hrms/ShiftAssignNew';
import Expenses from './pages/hrms/Expenses';
import ExpenseForm from './pages/hrms/ExpenseForm';
import ExpenseDetail from './pages/hrms/ExpenseDetail';
import EmployeeExpenses from './pages/hrms/EmployeeExpenses';
import SalaryAdvances from './pages/hrms/SalaryAdvances';
import Incentives from './pages/hrms/Incentives';
import ApprovalTemplate from './pages/hrms/ApprovalTemplate';
import Payroll from './pages/hrms/Payroll';
import MyPayroll from './pages/hrms/MyPayroll';
import PayrollRunDetail from './pages/hrms/PayrollRunDetail';
import PayrollPayslip from './pages/hrms/PayrollPayslip';
// import LeaveApply from './pages/hrms/LeaveApply';
import LeaveApplyForm from './pages/hrms/LeaveApplyForm';
import LeaveRequest from './pages/hrms/LeaveRequest';
import LeaveType from './pages/hrms/LeaveType';
import LeaveTypeForm from './pages/hrms/LeaveTypeForm';
import LeaveTypeDetail from './pages/hrms/LeaveTypeDetail';
import LeavePolicy from './pages/hrms/LeavePolicy';
import LeavePolicyForm from './pages/hrms/LeavePolicyForm';
import LeavePolicyDetail from './pages/hrms/LeavePolicyDetail';
import LeavePolicyAssign from './pages/hrms/LeavePolicyAssign';
import LeavePolicyAssignDetail from './pages/hrms/LeavePolicyAssignDetail';
import LeaveEntitlementDetail from './pages/hrms/LeaveEntitlementDetail';
import LeavePeriod from './pages/hrms/LeavePeriod';
import LeavePeriodForm from './pages/hrms/LeavePeriodForm';
import LeaveHolidayList from './pages/hrms/LeaveHolidayList';
import LeavePeriodDetail from './pages/hrms/LeavePeriodDetail';
import LeaveAllocation from './pages/hrms/LeaveAllocation';
import Staff from './pages/hrms/Staff';
import StaffDetail from './pages/hrms/StaffDetail';
import StaffCreate from './pages/hrms/StaffCreate';
import StaffEdit from './pages/hrms/StaffEdit';
import HrmsDashboard from './pages/hrms/HrmsDashboard';
import EmployeeDashboard from './pages/hrms/EmployeeDashboard';
import MyAttendance from './pages/hrms/MyAttendance';
import MyShifts from './pages/hrms/MyShifts';
import MyExpenses from './pages/hrms/MyExpenses';
import MyLeave from './pages/hrms/MyLeave';
import { useNotifications } from './hooks/useNotifications';
import { useStaffInvoiceAlerts } from './hooks/useSocket';
import { useWebPush } from './hooks/useWebPush';
import BottomNav from './components/BottomNav';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ToastManager from './components/ToastManager';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/invoices': 'Invoices',
  '/tracking': 'Live Tracking',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/hrms/dashboard': 'HRMS Dashboard',
  '/hrms/attendance': 'Attendance',
  '/hrms/staff': 'Staff',
  '/hrms/shifts': 'Shifts',
  '/hrms/shifts/new': 'New Shift Type',
  '/hrms/shifts/edit/:id': 'Edit Shift Type',
  '/hrms/shifts/assign': 'Shift Assignments',
  '/hrms/shifts/assign/calendar': 'Shift Assignments',
  '/hrms/shifts/assign/roster': 'Shift Assignments',
  '/hrms/expenses': 'Expenses',
  '/hrms/expenses/new': 'Add Expense',
  '/hrms/expenses/:id': 'Expense Detail',
  '/hrms/incentives': 'Incentives',
  '/hrms/approval-template': 'Approval Template',
  '/hrms/payroll': 'Payroll',
  '/hrms/payroll/structures': 'Payroll',
  '/hrms/payroll/settings': 'Payroll',
  '/hrms/payroll/run/:id': 'Payroll Run',
  '/hrms/payroll/run/:id/payslip/:entryId': 'Payslip',
  '/hrms/leave': 'Leave',
  '/hrms/leave/apply': 'Apply Leave',
  '/hrms/leave/apply/new': 'New Leave Application',
  '/hrms/leave/requests': 'Leave Requests',
  '/hrms/leave/type': 'Leave Types',
  '/hrms/leave/type/:id': 'Leave Type Details',
  '/hrms/leave/policy': 'Leave Policy',
  '/hrms/leave/policy/new': 'New Leave Policy',
  '/hrms/leave/policy/assign': 'Assign Leave Policy',
  '/hrms/leave/policy/assign/:id': 'Assign Policy Detail',
  '/hrms/leave/policy/assign/:id/entitlement/:entitlementId': 'Leave Entitlement',
  '/hrms/leave/allocation': 'Leave Allocation',
  '/hrms/leave/policy/:id': 'Leave Policy',
  '/hrms/leave/period': 'Leave Period',
  '/hrms/leave/period/new': 'New Leave Period',
  '/hrms/leave/period/holidays/new': 'Holiday List',
  '/hrms/leave/holiday-list': 'Holiday List',
  '/hrms/leave/holiday-list/new': 'New Holiday List',
  '/hrms/leave/holiday-list/edit/:id': 'Edit Holiday List',
  '/hrms/leave/period/:id': 'Leave Period',
};

function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeApp } = useApp();
  const location = useLocation();
  let title = PAGE_TITLES[location.pathname] || 'Dashboard';
  const p = location.pathname;
  /* Keep top bar aligned with sidebar: all invoice routes show "Invoices" like the list page. */
  if (p === '/invoices' || p.startsWith('/invoices/')) {
    title = 'Invoices';
  }
  if (p === '/tasks' || p.startsWith('/tasks/')) {
    title = 'Tasks';
  }
  if (activeApp === 'hrms' && p.startsWith('/hrms/')) {
    title = PAGE_TITLES[p] || 'HRMS';
  }
  if (p === '/hrms/staff' || p.startsWith('/hrms/staff/')) {
    title = 'Staff';
  }
  if (p.startsWith('/hrms/leave')) {
    title = PAGE_TITLES[p] || 'Leave';
  }
  if (p === '/hrms/expenses' || p.startsWith('/hrms/expenses/')) {
    title = PAGE_TITLES[p] || 'Expenses';
  }
  if (p.startsWith('/hrms/payroll/') && !p.includes('/structures') && !p.includes('/settings')) {
    title = p.includes('/payslip/') ? 'Payslip' : 'Payroll Run';
  }
  if (user && (user.role === 'delivery_boy' || user.role === 'staff') && p === '/hrms/payroll') {
    title = 'My Payroll';
  }
  const showBack = p !== '/' && p !== '/hrms/dashboard' && p !== '/hrms/attendance' && p !== '/hrms/staff' && p !== '/hrms/expenses' && p !== '/hrms/payroll' && p !== '/hrms/payroll/structures' && p !== '/hrms/payroll/settings' && p !== '/hrms/leave';
  return (
    <header className="h-16 bg-white border-b border-zinc-100 px-5 flex items-center justify-between sticky top-0 z-30 shadow-sm grow-0 shrink-0 print:hidden">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
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
  useWebPush();
  useStaffInvoiceAlerts(false);

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-white font-bold text-zinc-400 animate-pulse">Loading...</div>;

  if (!user) return <Login />;

  const isEmployee = user.role === 'delivery_boy' || user.role === 'staff';

  // Admin/Manager/Employee layout (Desktop has Sidebar, Mobile has BottomNav)
  return (
    <div className="flex min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F8F9FA]">
      <ToastManager />
      <div className="hidden lg:block print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto pb-20 lg:pb-10">
          <Routes>
            <Route path="/" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Dashboard />} />
            <Route path="/tasks/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <TaskCreatePage />} />
            <Route path="/tasks/:taskId/edit" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <TaskEditPage />} />
            <Route path="/tasks/:taskId/delete" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <TaskDeletePage />} />
            <Route path="/tasks/:taskId" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <TaskDetailPage />} />
            <Route path="/tasks" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Tasks />} />
            <Route path="/invoices/:invoiceId/confirm-payment" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <InvoiceConfirmPaymentPage />} />
            <Route path="/invoices/:invoiceId/assign" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <InvoiceAssignPage />} />
            <Route path="/invoices/:invoiceId/delete" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <InvoiceDeletePage />} />
            <Route path="/invoices/:invoiceId/void" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <InvoiceVoidPage />} />
            <Route path="/invoices/:invoiceId/restore" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <InvoiceRestorePage />} />
            <Route path="/invoices/:invoiceId/signed-preview" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <InvoiceSignedPreviewPage />} />
            <Route path="/invoices/:invoiceId" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <InvoiceDetailPage />} />
            <Route path="/invoices" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Invoices />} />
            <Route path="/tracking" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Tracking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users" element={user.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="/logs" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <AuditLogs />} />
            <Route path="/reports" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Reports />} />
            <Route path="/settings" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/hrms/dashboard" element={isEmployee ? <EmployeeDashboard /> : <HrmsDashboard />} />
            <Route path="/hrms/attendance" element={isEmployee ? <MyAttendance /> : <Attendance />} />
            <Route path="/hrms/my-shifts" element={isEmployee ? <MyShifts /> : <Navigate to="/hrms/shifts/assign/calendar" replace />} />
            <Route path="/hrms/staff/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <StaffCreate />} />
            <Route path="/hrms/staff/:staffId/edit" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <StaffEdit />} />
            <Route path="/hrms/staff/:staffId" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <StaffDetail />} />
            <Route path="/hrms/staff" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Staff />} />
            <Route path="/hrms/shifts" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Shifts />} />
            <Route path="/hrms/shifts/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <ShiftTypeForm />} />
            <Route path="/hrms/shifts/edit/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <ShiftTypeForm />} />
            <Route path="/hrms/expenses/new" element={<ExpenseForm />} />
            <Route path="/hrms/expenses/edit/:id" element={<ExpenseForm />} />
            <Route path="/hrms/expenses/:id/edit" element={<ExpenseForm />} />
            <Route path="/hrms/expenses/:id" element={<ExpenseDetail />} />
            <Route path="/hrms/expenses/employee/:employeeName" element={isEmployee ? <Navigate to="/hrms/expenses" replace /> : <EmployeeExpenses />} />
            <Route path="/hrms/shifts/assign/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <ShiftAssignNew />} />
            <Route path="/hrms/shifts/assign/calendar" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <ShiftAssign />} />
            <Route path="/hrms/shifts/assign/roster" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <ShiftAssign />} />
            <Route path="/hrms/shifts/assign" element={<Navigate to="/hrms/shifts/assign/calendar" replace />} />
            <Route path="/hrms/expenses" element={isEmployee ? <MyExpenses /> : <Expenses />} />
            <Route path="/hrms/advances" element={<SalaryAdvances />} />
            <Route path="/hrms/incentives" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <Incentives />} />
            <Route path="/hrms/approval-template" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <ApprovalTemplate />} />
            <Route path="/hrms/payroll" element={isEmployee ? <MyPayroll /> : <Payroll />} />
            <Route path="/hrms/payroll/structures" element={isEmployee ? <Navigate to="/hrms/payroll" replace /> : <Payroll />} />
            <Route path="/hrms/payroll/settings" element={isEmployee ? <Navigate to="/hrms/payroll" replace /> : <Payroll />} />
            <Route path="/hrms/payroll/run/:id" element={isEmployee ? <Navigate to="/hrms/payroll" replace /> : <PayrollRunDetail />} />
            <Route path="/hrms/payroll/run/:id/payslip/:entryId" element={isEmployee ? <Navigate to="/hrms/payroll" replace /> : <PayrollPayslip />} />
            <Route path="/hrms/leave" element={isEmployee ? <MyLeave /> : <Navigate to="/hrms/leave/requests" replace />} />
            <Route path="/hrms/leave/apply" element={<LeaveApplyForm />} />
            <Route path="/hrms/leave/apply/new" element={<LeaveApplyForm />} />
            <Route path="/hrms/leave/requests" element={isEmployee ? <MyLeave /> : <LeaveRequest />} />
            <Route path="/hrms/leave/type" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveType />} />
            <Route path="/hrms/leave/type/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveTypeForm />} />
            <Route path="/hrms/leave/type/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveTypeDetail />} />
            <Route path="/hrms/leave/type/edit/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveTypeForm />} />
            <Route path="/hrms/leave/policy/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePolicyForm />} />
            <Route path="/hrms/leave/policy/edit/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePolicyForm />} />
            <Route path="/hrms/leave/policy" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePolicy />} />
            <Route path="/hrms/leave/policy/assign" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePolicyAssign />} />
            <Route path="/hrms/leave/policy/assign/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePolicyAssignDetail />} />
            <Route path="/hrms/leave/policy/assign/:id/entitlement/:entitlementId" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveEntitlementDetail />} />
            <Route path="/hrms/leave/policy/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePolicyDetail />} />
            <Route path="/hrms/leave/allocation" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveAllocation />} />
            <Route path="/hrms/leave/period" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePeriod />} />
            <Route path="/hrms/leave/period/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePeriodForm />} />
            <Route path="/hrms/leave/period/edit/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePeriodForm />} />
            <Route path="/hrms/leave/period/holidays/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveHolidayList />} />
            <Route path="/hrms/leave/holiday-list" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveHolidayList />} />
            <Route path="/hrms/leave/holiday-list/new" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveHolidayList />} />
            <Route path="/hrms/leave/holiday-list/edit/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeaveHolidayList />} />
            <Route path="/hrms/leave/period/:id" element={isEmployee ? <Navigate to="/hrms/dashboard" replace /> : <LeavePeriodDetail />} />
            <Route path="*" element={<Navigate to={isEmployee ? "/hrms/dashboard" : "/"} />} />
          </Routes>
        </main>
        <div className="lg:hidden print:hidden">
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
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        {/* Main app — wrapped in AuthProvider */}
        <Route path="/*" element={
          <AuthProvider>
            <AppProvider>
              <AppRoutes />
            </AppProvider>
          </AuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}

