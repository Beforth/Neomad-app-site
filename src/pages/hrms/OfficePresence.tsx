import { useEffect, useState } from 'react';
import { MapPinOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPresenceDay, type PresenceDayOut } from '../../lib/hrmsApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/app-shell';
import { EmptyState } from '@/components/ui/empty-state';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
}

/** Who left the office today, who came back, and which watched phones cannot be tracked. */
export default function OfficePresence() {
  const { token } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<PresenceDayOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    const load = () =>
      getPresenceDay(token, date)
        .then((d) => { if (live) { setData(d); setError(null); } })
        .catch((e: Error) => { if (live) setError(e.message); });
    load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, [token, date]);

  const untrackable = (data?.watched ?? []).filter((w) => w.checked_in && !w.trackable);

  return (
    <div className="space-y-4">
      <PageHeader title="Office presence" description="Watched employees who left or returned to the office, between check-in and check-out" />
      <div className="flex items-center gap-2">
        <label htmlFor="presence-date" className="text-sm text-muted-foreground">Date</label>
        <input id="presence-date" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value || todayStr())}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {untrackable.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><MapPinOff size={16} /> Not trackable right now</div>
          <p className="text-xs text-muted-foreground mt-1">Checked in and watched, but the phone has not reported for a while (location off, battery saver, or no network).</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {untrackable.map((w) => <Badge key={w.user_id} className="bg-warning/10 text-warning">{w.user_name}</Badge>)}
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {data && data.events.length === 0 ? (
          <EmptyState title="No one left the office" description="Events appear here when a watched employee leaves or comes back." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Was out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.events ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{clock(e.occurred_at)}</TableCell>
                  <TableCell className="font-semibold">{e.user_name}</TableCell>
                  <TableCell>
                    <Badge className={e.event_type === 'left' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}>
                      {e.event_type === 'left' ? 'Left the office' : 'Back in the office'}
                    </Badge>
                  </TableCell>
                  <TableCell>{e.distance_m != null ? `${Math.round(e.distance_m)} m` : ''}</TableCell>
                  <TableCell>{e.minutes_out != null ? `${e.minutes_out} min` : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
