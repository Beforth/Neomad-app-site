import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createStaff } from '../../lib/hrmsStaff';
import { emptyStaffSalary, saveStaffSalary } from '../../lib/hrmsPayroll';
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
      const created = await createStaff(token, {
        ...formToPayload(form),
        email: form.email.trim(),
        password: form.password,
        role_code: form.role_code,
      });
      try {
        await saveStaffSalary(token, created.id, form.salary, emptyStaffSalary());
      } catch (e) {
        // The person exists now, so say what is missing instead of failing the whole save.
        setError(`Employee created, but the salary was not saved: ${e instanceof Error ? e.message : 'unknown error'}. Set it from the employee's edit page.`);
        setSaving(false);
        return;
      }
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
