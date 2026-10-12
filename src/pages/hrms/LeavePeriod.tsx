import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar, Plus, Search, XCircle, ToggleLeft, ToggleRight,
  Pencil, Trash2, X, CheckCircle2, Loader2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listLeavePeriods, updateLeavePeriod, deleteLeavePeriod } from '../../lib/hrmsLeave';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LeavePeriodItem {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function LeavePeriod() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [periods, setPeriods] = useState<LeavePeriodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LeavePeriodItem | null>(null);

  const reloadPeriods = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listLeavePeriods(token);
      setPeriods(
        data.map((p) => ({
          id: p.id,
          label: p.label,
          startDate: p.start_date,
          endDate: p.end_date,
          isActive: p.is_active,
        }))
      );
    } catch (e) {
      console.error('Failed to load leave periods:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reloadPeriods(); }, [reloadPeriods]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    const q = searchDebounced.toLowerCase().trim();
    if (!q) return periods;
    return periods.filter((p) => p.label.toLowerCase().includes(q));
  }, [periods, searchDebounced]);

  const activePeriod = periods.find((p) => p.isActive);

  async function toggleActive(id: number) {
    if (!token) return;
    try {
      await updateLeavePeriod(token, id, { is_active: true });
      await reloadPeriods();
    } catch (e) {
      console.error('Failed to toggle active period:', e);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    try {
      await deleteLeavePeriod(token, deleteTarget.id);
      await reloadPeriods();
    } catch (e) {
      console.error('Failed to delete leave period:', e);
    } finally {
      setDeleteTarget(null);
    }
  }

  const statCards = [
    { label: 'Total Periods', value: periods.length, icon: Calendar, color: 'bg-info/10 text-info' },
    { label: 'Active Period', value: activePeriod?.label || 'None', icon: ToggleRight, color: 'bg-accent text-primary', small: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Period" description="Manage leave cycles and financial years" actions={<>
<Button variant="dark" size="sm" className="self-start sm:self-auto" onClick={() => navigate('/hrms/leave/period/new')} >
          <Plus size={14} />Add Period
        </Button>
</>} />

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className={`${card.small ? 'text-sm' : 'text-lg'} font-semibold text-foreground leading-none truncate`}>
                {card.value}
              </p>
              <p className="text-xs font-medium text-muted-foreground/70 mt-1 truncate">
                {card.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search periods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {['Period', 'Start Date', 'End Date', 'Status', 'Actions'].map((label) => (
                  <TableHead key={label} className="uppercase whitespace-nowrap">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => navigate(`/hrms/leave/period/${p.id}`)}
                  className="border-b transition-colors hover:bg-muted/70 cursor-pointer"
                >
                  <TableCell className="font-semibold text-foreground">{p.label}</TableCell>
                  <TableCell className="text-muted-foreground">{p.startDate}</TableCell>
                  <TableCell className="text-muted-foreground">{p.endDate}</TableCell>
                  <TableCell>
                    {p.isActive ? (
                      <Badge variant="success" >
                        <ToggleRight size={12} /> Active
                      </Badge>
                    ) : (
                      <Badge>
                        <ToggleLeft size={12} /> Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => navigate(`/hrms/leave/period/edit/${p.id}`)}><Pencil /> Edit</DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setDeleteTarget(p)}><Trash2 /> Delete</DropdownMenuItem>
                      {!p.isActive && (
                        <DropdownMenuItem onSelect={() => toggleActive(p.id)}><CheckCircle2 /> Set Active</DropdownMenuItem>
                      )}
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/hrms/leave/period/edit/${p.id}`)}
                className="p-4 space-y-2 cursor-pointer"
              >
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-foreground">{p.label}</p>
                {p.isActive ? (
                  <Badge variant="success" >
                    Active
                  </Badge>
                ) : (
                  <Badge>
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{p.startDate}</span>
                <span>→</span>
                <span>{p.endDate}</span>
              </div>
              <div className="flex items-center gap-1 pt-1">
                <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10"
                  onClick={() => navigate(`/hrms/leave/period/edit/${p.id}`)}
                  
                  title="Edit"
                >
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(p)}
                  
                  title="Delete"
                >
                  <Trash2 size={14} />
                </Button>
                {!p.isActive && (
                  <Button variant="ghost" size="icon-sm" className="hover:text-primary hover:bg-accent"
                    onClick={() => toggleActive(p.id)}
                    
                    title="Set Active"
                  >
                    <CheckCircle2 size={14} />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {deleteTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) (() => setDeleteTarget(null))(); }}>
<DialogContent hideClose aria-describedby={undefined} className="gap-0 p-0 max-w-md overflow-hidden">
<DialogTitle className="sr-only">Dialog</DialogTitle>
            <div className="p-6 border-b border-border relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-6 right-6" type="button" onClick={() => setDeleteTarget(null)}
                >
                <X size={18} />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">Delete leave period?</h3>
              <p className="text-sm text-foreground/70 mt-2">
                <span className="font-semibold text-foreground">{deleteTarget.label}</span>
              </p>
              <p className="text-xs text-destructive font-medium mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-4 flex gap-2 justify-end bg-muted/80">
              <Button variant="outline" size="sm" type="button" onClick={() => setDeleteTarget(null)}
                >
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15" type="button" onClick={confirmDelete}
                >
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          </DialogContent>
</Dialog>
      )}
    </div>
  );
}
