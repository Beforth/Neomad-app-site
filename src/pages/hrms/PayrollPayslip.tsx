import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Printer, ChevronLeft, CheckCircle2, Inbox,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  PayrollRun, PayEntry, PayrollSettings,
  getPayrollRun, getPayrollSettings, defaultSettings,
} from '../../lib/hrmsPayroll';
import PayslipView from '../../components/hrms/PayslipView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PayrollPayslip() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const params = useParams<{ id: string; entryId: string }>();
  const runId = Number(params.id);
  const entryId = Number(params.entryId);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [entry, setEntry] = useState<PayEntry | null>(null);
  const [settings, setSettings] = useState<PayrollSettings>(defaultSettings());

  useEffect(() => {
    if (!token || !runId || !entryId) {
      setRun(null);
      setEntry(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [runData, settingsData] = await Promise.all([
          getPayrollRun(token, runId),
          getPayrollSettings(token).catch(() => defaultSettings()),
        ]);
        if (cancelled) return;
        setRun(runData);
        setEntry(runData.entries.find((e) => e.id === entryId) || null);
        setSettings(settingsData);
      } catch {
        if (!cancelled) {
          setRun(null);
          setEntry(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, runId, entryId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground/70 animate-pulse py-16 text-center">Loading payslip...</p>
      </div>
    );
  }

  if (!run || !entry) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center text-center" >
        <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-3">
          <Inbox size={24} className="text-muted-foreground/50" />
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Payslip not found</h2>
        <p className="text-xs text-muted-foreground/70 max-w-xs mb-4">This payslip may have been deleted.</p>
        <Button variant="dark" size="sm" onClick={() => navigate(`/hrms/payroll/run/${runId}`)} >
          <ChevronLeft size={14} />Back to Run
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium print:hidden"
        >
          <CheckCircle2 size={16} className="text-primary" /> {toast}
        </motion.div>
      )}

      {/* Top action bar — hidden on print */}
      <div className="print:hidden flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(`/hrms/payroll/run/${run.id}`)} >
          <ChevronLeft size={14} />Back to Run
        </Button>
        <Button variant="dark" size="sm"
          onClick={() => {
            const prev = document.title;
            document.title = ' ';
            window.print();
            document.title = prev;
            setToast('Print dialog opened');
            setTimeout(() => setToast(''), 2000);
          }}
          
        >
          <Printer size={14} />Print Payslip
        </Button>
      </div>

      <PayslipView run={run} entry={entry} settings={settings} showAdminNote />
    </div>
  );
}
