import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar, Clock, CheckCircle2, XCircle, FileText, Layers,
  Plus, Users, ArrowRight, Loader2, CalendarOff, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLeaveSummary, listLeaveRequests, approveLeaveRequest, rejectLeaveRequest, LeaveSummaryOut, LeaveRequestOut } from '../../lib/hrmsLeave';

export default function Leave() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [summary, setSummary] = useState<LeaveSummaryOut | null>(null);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestOut[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [sum, reqs] = await Promise.all([
        getLeaveSummary(token),
        listLeaveRequests(token, 'pending'),
      ]);
      setSummary(sum);
      setPendingRequests(reqs);
    } catch (err) {
      console.error('Failed to load leave dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const handleResolve = async (requestId: number, status: 'approved' | 'rejected') => {
    if (!token) return;
    try {
      if (status === 'approved') {
        await approveLeaveRequest(token, requestId);
      } else {
        await rejectLeaveRequest(token, requestId);
      }
      await loadDashboard();
    } catch (err) {
      console.error('Failed to resolve leave request:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave Management</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">Overview of employee leave balances, requests, and policy rules</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/hrms/leave/apply')}
            className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Plus size={14} /> Apply for Leave
          </button>
          <button
            onClick={() => navigate('/hrms/leave/request')}
            className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Clock size={14} /> Leave Requests
          </button>
        </div>
      </motion.header>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pending</span>
            <Clock size={16} />
          </div>
          <p className="text-2xl font-black text-zinc-900">{summary?.pending ?? 0}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Awaiting approval</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Approved</span>
            <CheckCircle2 size={16} />
          </div>
          <p className="text-2xl font-black text-zinc-900">{summary?.approved ?? 0}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Total granted</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rejected</span>
            <XCircle size={16} />
          </div>
          <p className="text-2xl font-black text-zinc-900">{summary?.rejected ?? 0}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Declined applications</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Leave Types</span>
            <Layers size={16} />
          </div>
          <p className="text-2xl font-black text-zinc-900">{summary?.types ?? 0}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Active categories</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Policies</span>
            <FileText size={16} />
          </div>
          <p className="text-2xl font-black text-zinc-900">{summary?.policies ?? 0}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Company rules</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-cyan-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Periods</span>
            <Calendar size={16} />
          </div>
          <p className="text-2xl font-black text-zinc-900">{summary?.periods ?? 0}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Leave cycles</p>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/hrms/leave/type"
          className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Layers size={18} />
            </span>
            <ArrowRight size={14} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">Leave Types</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Define Sick, Casual, Paid & Compensatory leaves</p>
        </Link>

        <Link
          to="/hrms/leave/policy"
          className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText size={18} />
            </span>
            <ArrowRight size={14} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">Leave Policies</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Set entitlements, limits, and assignment rules</p>
        </Link>

        <Link
          to="/hrms/leave/allocation"
          className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users size={18} />
            </span>
            <ArrowRight size={14} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">Leave Allocations</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Allocate leave balances directly to staff members</p>
        </Link>

        <Link
          to="/hrms/leave/period"
          className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-400 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <Calendar size={18} />
            </span>
            <ArrowRight size={14} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">Leave Periods & Holidays</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Manage fiscal years, active cycles, and public holidays</p>
        </Link>
      </div>

      {/* Pending Leave Requests Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Pending Leave Requests</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Applications awaiting action</p>
          </div>
          <Link
            to="/hrms/leave/request"
            className="text-xs font-bold text-zinc-700 hover:text-zinc-900 transition-colors flex items-center gap-1"
          >
            View all requests <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-400 gap-2">
            <Loader2 size={18} className="animate-spin" /> Loading pending requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-0.5">No pending leave requests</h3>
            <p className="text-xs text-zinc-400">All submitted time-off applications have been resolved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Leave Type</th>
                  <th className="px-5 py-3">Dates</th>
                  <th className="px-5 py-3">Days</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-zinc-900">
                      {req.employee_name || req.employee_email || `User #${req.user_id}`}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">
                        {req.leave_type_name || `Type #${req.leave_type_id}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600">
                      {req.start_date} to {req.end_date}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-zinc-800">{req.days} day(s)</td>
                    <td className="px-5 py-3.5 text-zinc-500 max-w-[200px] truncate">{req.reason || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResolve(req.id, 'approved')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition-colors text-[11px]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleResolve(req.id, 'rejected')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg hover:bg-rose-100 transition-colors text-[11px]"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
