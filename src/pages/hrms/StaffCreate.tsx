import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createStaff } from '../../lib/hrmsStaff';
import StaffForm, { emptyStaffForm, formToPayload, type StaffFormValues } from './StaffForm';

export default function StaffCreate() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<StaffFormValues>(emptyStaffForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await createStaff(token, {
        ...formToPayload(form),
        email: form.email.trim(),
        password: form.password,
        role_code: form.role_code,
      });
      navigate('/hrms/staff');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffForm
      mode="create"
      title="Add Employee"
      value={form}
      onChange={setForm}
      onSubmit={handleSubmit}
      saving={saving}
      error={error}
    />
  );
}
