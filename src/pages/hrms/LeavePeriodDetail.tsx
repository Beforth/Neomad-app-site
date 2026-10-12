import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, ToggleLeft, ToggleRight, ArrowLeft, Inbox, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLeavePeriod, type LeavePeriodOut } from '../../lib/hrmsLeave';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LeavePeriodDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();

  const [period, setPeriod] = useState<LeavePeriodOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) { setLoading(false); return; }
    setLoading(true);
    getLeavePeriod(token, Number(id))
      .then((data) => setPeriod(data))
      .catch(() => setPeriod(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground/70 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs font-semibold">Loading leave period details...</span>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Leave period not found</h3>
          <p className="text-xs text-muted-foreground/70 mb-4">The leave period doesn't exist.</p>
          <Button variant="dark" size="sm" onClick={() => navigate('/hrms/leave/period')}
            >
            Back to Leave Periods
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="icon-sm"
          onClick={() => navigate('/hrms/leave/period')}
          
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{period.label}</h1>
            <p className="text-[13px] text-muted-foreground">Leave period details</p>
          </div>
          {period.is_active ? (
            <Badge variant="success" >
              <ToggleRight size={12} /> Active
            </Badge>
          ) : (
            <Badge>
              <ToggleLeft size={12} /> Inactive
            </Badge>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Start Date', value: period.start_date },
          { label: 'End Date', value: period.end_date },
          { label: 'Duration', value: `${(() => {
            const s = new Date(period.start_date);
            const e = new Date(period.end_date);
            const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return `${days} days`;
          })()}` },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
          >
            <div className="w-10 h-10 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">{stat.value}</p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {period.holiday_list_id ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground text-sm">{period.holiday_list_name || 'Linked Holiday List'}</h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {period.holidays?.length ?? 0} holidays
              </p>
            </div>
          </div>

          {period.holidays && period.holidays.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase whitespace-nowrap">Date</TableHead>
                      <TableHead className="uppercase whitespace-nowrap">Holiday Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {period.holidays
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((h, i) => (
                        <motion.tr
                          key={h.id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/70"
                        >
                          <TableCell className="text-muted-foreground">{h.date}</TableCell>
                          <TableCell className="font-semibold text-foreground">{h.name}</TableCell>
                        </motion.tr>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {period.holidays
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((h, i) => (
                    <div key={h.id || i} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{h.name}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{h.date}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-2">
                <Inbox size={20} className="text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground/70">No holidays added yet</p>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] p-6 text-center"
        >
          <p className="text-xs text-muted-foreground/70">No holiday list linked to this period</p>
        </motion.div>
      )}
    </div>
  );
}
