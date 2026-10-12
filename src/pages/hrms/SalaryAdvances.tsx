import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plus, Search, XCircle, X,
  ChevronLeft, ChevronRight,
  IndianRupee, Clock, CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  AdvanceExpense, formatINR, todayStr,
  listAdvances, createAdvance, resolveAdvance,
} from '../../lib/hrmsExpenses';

const PAGE_SIZE = 10;

export default function SalaryAdvances() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [advances, setAdvances] = useState<AdvanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');

  // Request modal state for staff
  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [advTitle, setAdvTitle] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');
  const [advDate, setAdvDate] = useState(todayStr());
  const [advSubmitting, setAdvSubmitting] = useState(false);

  // Approval modal state for admin
  const [confirmAdvModal, setConfirmAdvModal] = useState<{ advanceId: number; action: 'approve' | 'reject' } | null>(null);
  const [advConfirmNotes, setAdvConfirmNotes] = useState('');
  const [advApproveAmount, setAdvApproveAmount] = useState(0);

  const fetchAdvancesData = useCallback(async () => {
    if (!token) {
      setAdvances([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listAdvances(token);
      setAdvances(data);
    } catch (e) {
      setAdvances([]);
      setToast(e instanceof Error ? e.message : 'Failed to load advances');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdvancesData();
  }, [fetchAdvancesData]);

  async function handleAdvSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!token || !advTitle.trim() || !advAmount) return;
    setAdvSubmitting(true);
    try {
      await createAdvance(token, {
        title: advTitle.trim(),
        amount: parseFloat(advAmount) || 0,
        date: advDate || todayStr(),
        reason: advReason.trim() || undefined,
      });
      await fetchAdvancesData();
      setAdvModalOpen(false);
      setAdvTitle('');
      setAdvAmount('');
      setAdvReason('');
      setToast('Salary advance request submitted to admin!');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to submit advance request');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setAdvSubmitting(false);
    }
  }

  async function updateAdvStatus(advId: number, newStatus: 'approved' | 'rejected', notes = '', approvedAmt?: number) {
    if (!token) return;
    try {
      await resolveAdvance(token, advId, {
        status: newStatus,
        approval_notes: notes || undefined,
        approved_amount: newStatus === 'approved' ? approvedAmt : undefined,
      });
      await fetchAdvancesData();
      setToast(newStatus === 'approved' ? 'Salary Advance Approved' : 'Salary Advance Rejected');
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to update advance');
      setTimeout(() => setToast(''), 2500);
    }
  }

  const filtered = advances.filter((a) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.employeeName.toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, filtered.length);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalApproved = advances.filter((a) => a.status === 'approved').reduce((s, a) => s + (a.approvedAmount || a.amount), 0);
  const pendingCount = advances.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}

      {/* Top Header Buttons (Business Claims vs Salary Advances) */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button variant="secondary" size="sm"
          onClick={() => navigate('/hrms/expenses')}
          
        >
          Business Claims
        </Button>
        <Button variant="dark" size="sm"
          onClick={() => navigate('/hrms/advances')}
          
        >
          Salary Advances {pendingCount > 0 && <Badge variant="warning" className="ml-1" >{pendingCount}</Badge>}
        </Button>
      </div>

      <PageHeader title="Salary Advances" description={isAdmin ? 'Manage employee salary advances & emergency cash loans' : 'Request salary advances and view status'} actions={<>
<Button variant="dark" size="sm" className="self-start sm:self-auto"
          onClick={() => setAdvModalOpen(true)}
          
        >
          <Plus size={14} /> Request Salary Advance
        </Button>
</>} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3" >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-accent text-primary">
            <IndianRupee size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground leading-none truncate">{formatINR(totalApproved)}</p>
            <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">Total Approved Advances</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3" >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-warning/10 text-warning">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground leading-none truncate">{pendingCount}</p>
            <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">Pending Requests</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 col-span-2 lg:col-span-1" >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-info/10 text-info">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground leading-none truncate">{advances.length}</p>
            <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">Total Requests Submitted</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search advances by title, employee, or reason..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            
          />
        </div>
        <div className="flex items-center gap-1.5">
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                statusFilter === st ? 'bg-foreground text-white' : 'bg-muted text-foreground/70 hover:bg-secondary'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / Empty State */}
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground/70 text-xs font-medium">Loading salary advance records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="mx-auto text-muted-foreground/50" size={32} />
            <p className="text-sm font-semibold text-foreground/85">No salary advance requests found</p>
            <p className="text-xs text-muted-foreground/70 max-w-sm mx-auto">
              {isAdmin ? 'No employees have submitted salary advance requests yet.' : 'You have not submitted any salary advance requests.'}
            </p>
            <Button variant="dark" size="sm"
              onClick={() => setAdvModalOpen(true)}
              
            >
              <Plus size={14} /> Submit New Request
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title & Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((a) => (
                    <TableRow key={a.id} className="">
                      <TableCell className="font-semibold text-foreground">{a.employeeName}</TableCell>
                      <TableCell>
                        <p className="font-semibold text-foreground">{a.title}</p>
                        {a.reason && <p className="text-[11px] text-muted-foreground/70 truncate max-w-[200px]" title={a.reason}>{a.reason}</p>}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">{a.date}</TableCell>
                      <TableCell className="font-semibold text-foreground">{formatINR(a.amount)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {a.status === 'approved' ? formatINR(a.approvedAmount || a.amount) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`capitalize ${ a.status === 'approved' ? 'bg-accent text-accent-foreground' : a.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive' }`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && a.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="soft" size="xs" className="bg-accent text-accent-foreground hover:bg-primary/15"
                              onClick={() => { setConfirmAdvModal({ advanceId: a.id, action: 'approve' }); setAdvApproveAmount(a.amount); }}
                              
                            >
                              Approve
                            </Button>
                            <Button variant="ghost" size="xs" className="bg-destructive/10 text-destructive hover:bg-destructive/15"
                              onClick={() => { setConfirmAdvModal({ advanceId: a.id, action: 'reject' }); }}
                              
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70 font-medium">
                            {a.approvalNotes ? `Notes: ${a.approvalNotes}` : 'No actions'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startRow}</span>–
                  <span className="font-semibold text-foreground">{endRow}</span> of{' '}
                  <span className="font-semibold text-foreground">{filtered.length}</span> records
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Staff Request Modal */}
      {advModalOpen && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setAdvModalOpen(false))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Request Salary Advance</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setAdvModalOpen(false)} ><X size={16} /></Button>
            </div>
            <form onSubmit={handleAdvSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/85 mb-1">Title / Purpose *</label>
                <Input className="w-full"
                  type="text" required placeholder="e.g. Medical Emergency Loan, Festival Advance"
                  value={advTitle} onChange={(e) => setAdvTitle(e.target.value)}
                  
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/85 mb-1">Advance Amount (₹) *</label>
                <Input className="w-full"
                  type="number" min={1} required placeholder="e.g. 10000"
                  value={advAmount} onChange={(e) => setAdvAmount(e.target.value)}
                  
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/85 mb-1">Date Required *</label>
                <Input className="w-full"
                  type="date" required value={advDate} onChange={(e) => setAdvDate(e.target.value)}
                  
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/85 mb-1">Reason / Explanation</label>
                <Textarea className="w-full"
                  rows={2} placeholder="Explain why you need this advance..."
                  value={advReason} onChange={(e) => setAdvReason(e.target.value)}
                  
                />
              </div>
              <div className="pt-2 flex gap-2 justify-end">
                <Button variant="outline" size="sm" type="button" onClick={() => setAdvModalOpen(false)} >Cancel</Button>
                <Button variant="dark" size="sm" type="submit" disabled={advSubmitting} >
                  {advSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </DialogContent>
</Dialog>
      )}

      {/* Admin Approval / Rejection Modal */}
      {confirmAdvModal && (() => {
        const target = advances.find((a) => a.id === confirmAdvModal.advanceId);
        if (!target) return null;
        return (
          <Dialog open onOpenChange={(open) => { if (!open) (() => setConfirmAdvModal(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{confirmAdvModal.action === 'approve' ? 'Approve Salary Advance' : 'Reject Salary Advance'}</h3>
                <Button variant="ghost" size="icon-sm" onClick={() => setConfirmAdvModal(null)} ><X size={16} /></Button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-muted p-3 rounded-xl space-y-1.5 text-xs">
                  <p><span className="text-muted-foreground/70 font-semibold">Employee:</span> <span className="font-semibold text-foreground">{target.employeeName}</span></p>
                  <p><span className="text-muted-foreground/70 font-semibold">Title:</span> <span className="font-semibold text-foreground">{target.title}</span></p>
                  <p><span className="text-muted-foreground/70 font-semibold">Requested:</span> <span className="font-semibold text-foreground">{formatINR(target.amount)}</span></p>
                  {target.reason && <p><span className="text-muted-foreground/70 font-semibold">Reason:</span> <span className="text-foreground/85">{target.reason}</span></p>}
                </div>
                {confirmAdvModal.action === 'approve' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground/85 mb-1">Approved Amount (₹)</label>
                    <Input className="w-full"
                      type="number" min={1} value={advApproveAmount} onChange={(e) => setAdvApproveAmount(parseFloat(e.target.value) || 0)}
                      
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-foreground/85 mb-1">Notes / Instructions</label>
                  <Textarea className="w-full"
                    rows={2} placeholder="e.g. Approved. Repay ₹1,000/month in Pay Run."
                    value={advConfirmNotes} onChange={(e) => setAdvConfirmNotes(e.target.value)}
                    
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirmAdvModal(null)} >Cancel</Button>
                  <button
                    onClick={() => {
                      updateAdvStatus(confirmAdvModal.advanceId, confirmAdvModal.action === 'approve' ? 'approved' : 'rejected', advConfirmNotes, confirmAdvModal.action === 'approve' ? advApproveAmount : undefined);
                      setConfirmAdvModal(null);
                    }}
                    className={`px-4 py-2 rounded-md text-xs font-semibold text-white ${confirmAdvModal.action === 'approve' ? 'bg-primary hover:bg-primary' : 'bg-destructive hover:bg-destructive'}`}
                  >
                    Confirm {confirmAdvModal.action === 'approve' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </div>
            </DialogContent>
</Dialog>
        );
      })()}
    </div>
  );
}
