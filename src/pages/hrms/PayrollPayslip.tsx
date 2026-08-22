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
        <p className="text-sm text-zinc-400 animate-pulse py-16 text-center">Loading payslip...</p>
      </div>
    );
  }

  if (!run || !entry) {
    return (
      <div className="bg-white border border-zinc-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-3">
          <Inbox size={24} className="text-zinc-300" />
        </div>
        <h2 className="text-sm font-bold text-zinc-900 mb-1">Payslip not found</h2>
        <p className="text-xs text-zinc-400 max-w-xs mb-4">This payslip may have been deleted.</p>
        <button onClick={() => navigate(`/hrms/payroll/run/${runId}`)} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm">
          <ChevronLeft size={14} />Back to Run
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-5 right-5 z-[9999] bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium print:hidden"
        >
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </motion.div>
      )}

      {/* Top action bar — hidden on print */}
      <div className="print:hidden flex items-center justify-between gap-2">
        <button onClick={() => navigate(`/hrms/payroll/run/${run.id}`)} className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors shadow-sm">
          <ChevronLeft size={14} />Back to Run
        </button>
        <button
          onClick={() => {
            const prev = document.title;
            document.title = ' ';
            window.print();
            document.title = prev;
            setToast('Print dialog opened');
            setTimeout(() => setToast(''), 2000);
          }}
          className="flex items-center gap-2 bg-zinc-900 text-white border border-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Printer size={14} />Print Payslip
        </button>
      </div>

      <PayslipView run={run} entry={entry} settings={settings} showAdminNote />
    </div>
  );
}
