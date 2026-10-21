import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '@/components/ui/app-shell';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { OrgChart, type OrgNode } from '@/components/ui/org-chart';
import { getOrgChart, type OrgChartPerson } from '../../lib/hrmsStaff';

const label = (p: OrgChartPerson) => [p.designation, p.department].filter(Boolean).join(' · ') || undefined;

/** Turns the flat list into a tree. People whose manager is missing or inactive become top-level. */
function buildTree(people: OrgChartPerson[]): OrgNode | null {
  if (people.length === 0) return null;
  const nodes = new Map<number, OrgNode>(
    people.map((p) => [p.id, { id: String(p.id), name: p.name, title: label(p), children: [] }]),
  );
  const roots: OrgNode[] = [];
  for (const p of people) {
    const node = nodes.get(p.id)!;
    const parent = p.reports_to_id ? nodes.get(p.reports_to_id) : undefined;
    (parent ? parent.children! : roots).push(node);
  }
  if (roots.length === 1) return roots[0];
  return { id: 'company', name: 'Company', title: `${people.length} people`, children: roots };
}

export default function OrgChartPage() {
  const { token } = useAuth();
  const [people, setPeople] = useState<OrgChartPerson[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getOrgChart(token)
      .then(setPeople)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the org chart'));
  }, [token]);

  const root = useMemo(() => (people ? buildTree(people) : null), [people]);
  const anyManager = !!people?.some((p) => p.reports_to_id);

  return (
    <div className="space-y-6">
      <PageHeader title="Org chart" description="Who reports to whom. Set a person's manager under Staff, Edit, Reports to." />
      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
      {!people && !error && <p className="text-sm text-muted-foreground"><Spinner className="mr-2 inline-block" /> Loading…</p>}
      {people && !anyManager && (
        <Card className="p-4 text-sm text-muted-foreground">
          Nobody has a manager set yet, so everyone shows at the top level.{' '}
          <Link to="/hrms/staff" className="text-foreground underline">Open Staff</Link> to set "Reports to".
        </Card>
      )}
      {root && (
        <Card className="p-4">
          <OrgChart root={root} openLevels={3} />
        </Card>
      )}
    </div>
  );
}
