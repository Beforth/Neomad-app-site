import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { deleteSalaryTemplate, listSalaryTemplates, type SalaryTemplate } from '../../lib/hrmsPayroll';

const inr = (n: string) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

/** Ready-made salary set-ups. Pick one when adding an employee and the form fills in. */
export default function SalaryTemplates() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SalaryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<SalaryTemplate | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    listSalaryTemplates(token)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load templates'))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(load, [load]);

  const remove = async () => {
    if (!token || !confirmDelete) return;
    try {
      await deleteSalaryTemplate(token, confirmDelete.id);
      toast.success('Template deleted');
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Salary templates"
        description="Save a pay set-up once, then pick it when adding an employee. A template only fills in the values."
        actions={<Button variant="dark" size="sm" onClick={() => navigate('/hrms/payroll/templates/new')}><Plus size={14} />New template</Button>}
      />
      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground"><Spinner className="mr-2 inline-block" /> Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No templates yet. Create one, or save one from the salary form on an employee.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${t.name}`} onClick={() => setConfirmDelete(t)}><Trash2 /></Button>
              </div>
              <p className="text-[13px]">
                {t.fields.payModel === 'shift' ? `Per shift, ${inr(t.fields.shiftRate)} a day` : `${t.fields.payModel === 'custom' ? 'Custom formula' : 'Monthly'}, CTC ${inr(t.fields.ctc)}`}
                {Number(t.fields.overtimeRate) > 0 ? ` · OT ${inr(t.fields.overtimeRate)}/hr` : ''}
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate(`/hrms/payroll/templates/${t.id}`)}>Edit</Button>
            </Card>
          ))}
        </div>
      )}

      {confirmDelete && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
          <DialogContent aria-describedby={undefined} className="gap-0 p-0 max-w-sm overflow-hidden">
            <div className="p-5">
              <DialogTitle className="font-semibold mb-1">Delete "{confirmDelete.name}"?</DialogTitle>
              <p className="text-xs text-muted-foreground">Employees already set up from it keep their salary.</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={remove}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
