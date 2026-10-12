import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar, Clock, CheckCircle2, XCircle, FileText, Layers,
  Plus, Users, ArrowRight, Loader2, CalendarOff, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLeaveSummary, listLeaveRequests, approveLeaveRequest, rejectLeaveRequest, LeaveSummaryOut, LeaveRequestOut } from '../../lib/hrmsLeave';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/app-shell';

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
      <PageHeader title="Leave Management" description="Overview of employee leave balances, requests, and policy rules" actions={<>
<div className="flex flex-wrap items-center gap-2">
          <Button variant="dark" size="sm"
            onClick={() => navigate('/hrms/leave/apply')}
            
          >
            <Plus size={14} /> Apply for Leave
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => navigate('/hrms/leave/request')}
            
          >
            <Clock size={14} /> Leave Requests
          </Button>
        </div>
</>} />

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4" >
          <div className="flex items-center justify-between text-warning mb-2">
            <span className="text-xs font-medium text-muted-foreground/70">Pending</span>
            <Clock size={16} />
          </div>
          <p className="text-2xl font-semibold text-foreground">{summary?.pending ?? 0}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Awaiting approval</p>
        </Card>

        <Card className="p-4" >
          <div className="flex items-center justify-between text-primary mb-2">
            <span className="text-xs font-medium text-muted-foreground/70">Approved</span>
            <CheckCircle2 size={16} />
          </div>
          <p className="text-2xl font-semibold text-foreground">{summary?.approved ?? 0}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Total granted</p>
        </Card>

        <Card className="p-4" >
          <div className="flex items-center justify-between text-destructive mb-2">
            <span className="text-xs font-medium text-muted-foreground/70">Rejected</span>
            <XCircle size={16} />
          </div>
          <p className="text-2xl font-semibold text-foreground">{summary?.rejected ?? 0}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Declined applications</p>
        </Card>

        <Card className="p-4" >
          <div className="flex items-center justify-between text-info mb-2">
            <span className="text-xs font-medium text-muted-foreground/70">Leave Types</span>
            <Layers size={16} />
          </div>
          <p className="text-2xl font-semibold text-foreground">{summary?.types ?? 0}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Active categories</p>
        </Card>

        <Card className="p-4" >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-medium text-muted-foreground/70">Policies</span>
            <FileText size={16} />
          </div>
          <p className="text-2xl font-semibold text-foreground">{summary?.policies ?? 0}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Company rules</p>
        </Card>

        <Card className="p-4" >
          <div className="flex items-center justify-between text-cyan-600 mb-2">
            <span className="text-xs font-medium text-muted-foreground/70">Periods</span>
            <Calendar size={16} />
          </div>
          <p className="text-2xl font-semibold text-foreground">{summary?.periods ?? 0}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Leave cycles</p>
        </Card>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/hrms/leave/type"
          className="bg-card border border-border rounded-xl p-4 hover:border-input transition-all shadow-[0_1px_2px_rgb(0_0_0/0.03)] group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-info/10 text-info rounded-lg group-hover:bg-info group-hover:text-white transition-colors">
              <Layers size={18} />
            </span>
            <ArrowRight size={14} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Leave Types</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Define Sick, Casual, Paid & Compensatory leaves</p>
        </Link>

        <Link
          to="/hrms/leave/policy"
          className="bg-card border border-border rounded-xl p-4 hover:border-input transition-all shadow-[0_1px_2px_rgb(0_0_0/0.03)] group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText size={18} />
            </span>
            <ArrowRight size={14} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Leave Policies</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Set entitlements, limits, and assignment rules</p>
        </Link>

        <Link
          to="/hrms/leave/allocation"
          className="bg-card border border-border rounded-xl p-4 hover:border-input transition-all shadow-[0_1px_2px_rgb(0_0_0/0.03)] group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-accent text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
              <Users size={18} />
            </span>
            <ArrowRight size={14} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Leave Allocations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Allocate leave balances directly to staff members</p>
        </Link>

        <Link
          to="/hrms/leave/period"
          className="bg-card border border-border rounded-xl p-4 hover:border-input transition-all shadow-[0_1px_2px_rgb(0_0_0/0.03)] group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <Calendar size={18} />
            </span>
            <ArrowRight size={14} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Leave Periods & Holidays</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage fiscal years, active cycles, and public holidays</p>
        </Link>
      </div>

      {/* Pending Leave Requests Table */}
      <Card className="overflow-hidden" >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Pending Leave Requests</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Applications awaiting action</p>
          </div>
          <Link
            to="/hrms/leave/request"
            className="text-xs font-semibold text-foreground/85 hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all requests <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground/70 gap-2">
            <Loader2 size={18} className="animate-spin" /> Loading pending requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-0.5">No pending leave requests</h3>
            <p className="text-xs text-muted-foreground/70">All submitted time-off applications have been resolved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.id} className="">
                    <TableCell className="font-semibold text-foreground">
                      {req.employee_name || req.employee_email || `User #${req.user_id}`}
                    </TableCell>
                    <TableCell>
                      <Badge>
                        {req.leave_type_name || `Type #${req.leave_type_id}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground/70">
                      {req.start_date} to {req.end_date}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground block">{req.days} day(s)</span>
                      {(req.paid_days > 0 || req.lwp_days > 0) && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {req.paid_days > 0 ? `${req.paid_days} Paid` : ''}
                          {req.paid_days > 0 && req.lwp_days > 0 ? ' · ' : ''}
                          {req.lwp_days > 0 ? `${req.lwp_days} LWP` : ''}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{req.reason || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="soft" size="xs" className="bg-accent text-accent-foreground hover:bg-primary/15"
                          onClick={() => handleResolve(req.id, 'approved')}
                          
                        >
                          Approve
                        </Button>
                        <Button variant="ghost" size="xs" className="bg-destructive/10 text-destructive hover:bg-destructive/15"
                          onClick={() => handleResolve(req.id, 'rejected')}
                          
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
