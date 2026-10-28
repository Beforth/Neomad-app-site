import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import {
  emptyStructureFields, getFormulaMeta, listSalaryTemplates, saveSalaryTemplate,
  type FormulaMeta, type StructureFields,
} from '../../lib/hrmsPayroll';
import FormulaHelp from './FormulaHelp';
import { useScreenShortcuts } from '@/lib/screenShortcuts';
import SalaryStructureFields from './SalaryStructureFields';

const label = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1';

/** Create or edit one salary template (route: /hrms/payroll/templates/new or /:id). */
export default function SalaryTemplateEdit() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const templateId = id && id !== 'new' ? Number(id) : null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<StructureFields>(emptyStructureFields());
  const [meta, setMeta] = useState<FormulaMeta | null>(null);
  const [loading, setLoading] = useState(templateId !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = () => navigate('/hrms/payroll/templates');

  useEffect(() => {
    if (!token) return;
    getFormulaMeta(token).then(setMeta).catch(() => setMeta(null));
    if (templateId === null) return;
    listSalaryTemplates(token)
      .then((all) => {
        const found = all.find((t) => t.id === templateId);
        if (!found) { setError('This template no longer exists.'); return; }
        setName(found.name);
        setDescription(found.description);
        setFields(found.fields);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the template'))
      .finally(() => setLoading(false));
  }, [token, templateId]);

  const save = async () => {
    if (!token) return;
    if (!name.trim()) { setError('Give the template a name.'); return; }
    setBusy(true);
    setError('');
    try {
      await saveSalaryTemplate(token, templateId, name, description, fields);
      toast.success(templateId ? 'Template updated' : 'Template created');
      back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  useScreenShortcuts('Salary template', [
    { keys: 'ctrl+s', label: templateId ? 'Update template' : 'Create template', run: () => { void save(); } },
    { keys: 'escape', label: 'Back to the template list', run: back },
  ]);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground"><Spinner className="mr-2 inline-block" /> Loading…</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={templateId ? 'Edit salary template' : 'New salary template'}
        description="Save a pay set-up once, then pick it when adding an employee."
        actions={<Button variant="outline" size="sm" onClick={back}>Cancel</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] items-start">
        <Card className="p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse, 15,000" autoFocus={templateId === null} />
            </div>
            <div>
              <label className={label}>Note (optional)</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <SalaryStructureFields templates={false} value={fields} onChange={setFields} />
          {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <Button variant="dark" size="lg" className="w-full" onClick={save} disabled={busy}>{busy && <Spinner className="mr-1" />}{templateId ? 'Update template' : 'Create template'}<span className="ml-2 text-[11px] opacity-60">Ctrl + Enter</span></Button>
        </Card>
        {meta && (
          <Card className="p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
            <p className="mb-3 text-sm font-semibold">Formula guide</p>
            <FormulaHelp meta={meta} />
          </Card>
        )}
      </div>
    </div>
  );
}
