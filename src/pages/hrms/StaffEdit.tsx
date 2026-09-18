import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStaff, updateStaff } from '../../lib/hrmsStaff';
import StaffForm, { emptyStaffForm, formToPayload, staffToForm, type StaffFormValues } from './StaffForm';

export default function StaffEdit() {
  const { token } = useAuth();
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<StaffFormValues>(emptyStaffForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !staffId) return;
    let cancelled = false;
    setLoading(true);
    getStaff(token, Number(staffId))
      .then((s) => { if (!cancelled) setForm(staffToForm(s)); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load employee'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, staffId]);

  const handleSubmit = async () => {
    if (!token || !staffId) return;
    setSaving(true);
    setError(null);
    try {
      await updateStaff(token, Number(staffId), {
        ...formToPayload(form),
        email: form.email.trim() || undefined,
        role_code: form.role_code,
      });
      navigate('/hrms/staff');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto py-16 text-center text-sm text-zinc-400">Loading employee…</div>;
  }

  return (
    <StaffForm
      mode="edit"
      staffId={staffId ? Number(staffId) : null}
      title={form.full_name ? `Edit ${form.full_name}` : 'Edit Employee'}
      value={form}
      onChange={setForm}
      onSubmit={handleSubmit}
      saving={saving}
      error={error}
    />
  );
}
