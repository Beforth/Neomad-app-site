import { useState, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyLeaveBalances, type LeaveBalanceOut } from '../../lib/hrmsLeave';

const BALANCE_THEMES: { bg: string; color: string }[] = [
  { bg: 'bg-[#e9f7ef]', color: 'text-[#22a55a]' },
  { bg: 'bg-[#e8f2fd]', color: 'text-[#3d8bf0]' },
  { bg: 'bg-[#efeafc]', color: 'text-[#7c5cf0]' },
  { bg: 'bg-[#fdeaf1]', color: 'text-[#ef4f8b]' },
  { bg: 'bg-[#fdf3e3]', color: 'text-[#f0a730]' },
  { bg: 'bg-[#e9f7ef]', color: 'text-[#22a55a]' },
];

const BALANCE_ICONS = [
  // sick – heartbeat
  <svg key="0" className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>,
  // casual – sun
  <svg key="1" className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12a10 10 0 0 0-20 0z" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M8 17a4 4 0 0 0 8 0" /></svg>,
  // earned – calendar
  <svg key="2" className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  // medical – health
  <svg key="3" className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M12 12v9" /><path d="M9 18h6" /></svg>,
  // privilege – user
  <svg key="4" className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>,
];

export default function LeaveBalanceCard() {
  const { token } = useAuth();
  const [balances, setBalances] = useState<LeaveBalanceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyLeaveBalances(token);
        if (!cancelled) setBalances(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load balances');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="bg-white border border-[#e7e9ec] rounded-[16px] p-6 shadow-sm h-fit">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#eaf7ef] text-[#1f8a4c] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
          </div>
          <p className="text-[16px] font-bold text-[#1f2430] self-center m-0">Leave Balance</p>
        </div>
        <span className="text-[12px] text-[#6b7280] bg-[#f4f5f7] border border-[#e7e9ec] rounded-full px-3 py-1.5 whitespace-nowrap shrink-0">As of today</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-sm text-[#6b7280]">
          <Loader2 size={16} className="animate-spin" />
          Loading balances…
        </div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-[#e15b5b]">{error}</div>
      ) : balances.length === 0 ? (
        <div className="py-8 text-center text-sm text-[#6b7280]">No leave types configured yet.</div>
      ) : (
        <div>
          {balances.map((item, idx) => {
            const theme = BALANCE_THEMES[idx % BALANCE_THEMES.length];
            const icon = BALANCE_ICONS[idx % BALANCE_ICONS.length];
            const pct = item.total > 0 ? (item.used / item.total) * 100 : 0;

            return (
              <div key={item.leave_type_id} className="flex items-center gap-[14px] py-4 border-b border-[#e7e9ec] last-of-type:border-b-0">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${theme.bg} ${theme.color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-[14px] font-bold text-[#1f2430]">{item.leave_type_name}</span>
                  </div>
                  <p className="text-[12.5px] text-[#6b7280] mt-0.5">{item.used} used of {item.total}</p>
                  <div className="h-1.5 bg-[#e6e8eb] rounded-full mt-[9px] overflow-hidden">
                    <div className="h-full bg-[#1f8a4c] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-[20px] font-extrabold text-[#1f8a4c] leading-none">{item.remaining}</div>
                  <div className="text-[11.5px] text-[#6b7280] mt-0.5">left</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2.5 bg-[#eaf7ef] rounded-[10px] px-[14px] py-3 mt-[18px] text-[13px] text-[#166a3a]">
        <Shield size={16} className="text-[#1f8a4c] shrink-0" />
        Leave balances are updated in real time.
      </div>
    </div>
  );
}
