/**
 * Full-page employee form, shared by StaffCreate and StaffEdit.
 *
 * Replaces the old add/edit modals on the Staff list. The record is split into
 * numbered steps so each screen stays short.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoles, listWorkingLocations, type ApiRole, type WorkingLocation } from '../../lib/api';
import {
  listDepartments, GENDER_OPTIONS, EMPLOYEE_TYPE_OPTIONS,
  COUNTRY_CODES, SALARY_TYPE_OPTIONS, PAYROLL_GROUP_OPTIONS,
  type DepartmentOut, type StaffOut, type StaffReference, type Gender,
} from '../../lib/hrmsStaff';
import StaffDocuments from './StaffDocuments';

const inputClass =
  'w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition';

export interface StaffFormValues {
  employee_code: string;
  full_name: string;
  display_name: string;
  email: string;
  password: string;
  phone: string;
  country_code: string;
  gender: Gender | '';
  employee_type: string;
  designation: string;
  department_id: number | '';
  master_branch_id: number | '';
  punch_branch_ids: number[];
  door_lock_permission: boolean;
  role_code: string;
  date_of_joining: string;
  date_of_birth: string;
  address: string;
  pf_number: string;
  uan_number: string;
  esic_number: string;
  aadhaar_number: string;
  salary_type: string;
  monthly_salary: string;
  payroll_group: string;
  bank_name: string;
  bank_branch_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  emergency_contact_country_code: string;
  emergency_contact_relation: string;
  emergency_contact_address: string;
  references: StaffReference[];
}

export function emptyStaffForm(): StaffFormValues {
  return {
    employee_code: '', full_name: '', display_name: '', email: '', password: '', phone: '',
    country_code: '+91', emergency_contact_country_code: '+91',
    aadhaar_number: '', salary_type: 'monthly', monthly_salary: '', payroll_group: '',
    gender: '', employee_type: '', designation: '', department_id: '', master_branch_id: '',
    punch_branch_ids: [], door_lock_permission: false, role_code: 'staff',
    date_of_joining: '', date_of_birth: '', address: '',
    pf_number: '', uan_number: '', esic_number: '',
    bank_name: '', bank_branch_name: '', bank_account_no: '', bank_ifsc: '',
    emergency_contact_name: '', emergency_contact_number: '',
    emergency_contact_relation: '', emergency_contact_address: '',
    references: [],
  };
}

export function staffToForm(s: StaffOut): StaffFormValues {
  const base = emptyStaffForm();
  return {
    ...base,
    employee_code: s.employee_code ?? '',
    full_name: s.full_name ?? '',
    display_name: s.display_name ?? '',
    email: s.email,
    phone: s.phone ?? '',
    country_code: s.country_code ?? '+91',
    gender: (s.gender as Gender) ?? '',
    employee_type: s.employee_type ?? '',
    designation: s.designation ?? '',
    department_id: s.department_id ?? '',
    master_branch_id: s.master_branch_id ?? '',
    punch_branch_ids: s.punch_branch_ids ?? [],
    door_lock_permission: Boolean(s.door_lock_permission),
    role_code: s.role_codes?.[0] ?? 'staff',
    date_of_joining: s.date_of_joining ?? '',
    date_of_birth: s.date_of_birth ?? '',
    address: s.address ?? '',
    pf_number: s.pf_number ?? '',
    uan_number: s.uan_number ?? '',
    esic_number: s.esic_number ?? '',
    aadhaar_number: s.aadhaar_number ?? '',
    salary_type: s.salary_type ?? 'monthly',
    monthly_salary: s.monthly_salary != null ? String(s.monthly_salary) : '',
    payroll_group: s.payroll_group ?? '',
    bank_name: s.bank_name ?? '',
    bank_branch_name: s.bank_branch_name ?? '',
    bank_account_no: s.bank_account_no ?? '',
    bank_ifsc: s.bank_ifsc ?? '',
    emergency_contact_name: s.emergency_contact_name ?? '',
    emergency_contact_number: s.emergency_contact_number ?? '',
    emergency_contact_country_code: s.emergency_contact_country_code ?? '+91',
    emergency_contact_relation: s.emergency_contact_relation ?? '',
    emergency_contact_address: s.emergency_contact_address ?? '',
    references: s.references?.length ? s.references : [],
  };
}

/** Blank strings become null so the API leaves the column empty rather than "". */
function orNull(v: string): string | null {
  const t = v.trim();
  return t === '' ? null : t;
}

export function formToPayload(f: StaffFormValues) {
  return {
    employee_code: orNull(f.employee_code),
    full_name: orNull(f.full_name),
    display_name: orNull(f.display_name),
    phone: orNull(f.phone),
    country_code: orNull(f.country_code),
    gender: f.gender || null,
    employee_type: orNull(f.employee_type),
    designation: orNull(f.designation),
    department_id: f.department_id === '' ? null : Number(f.department_id),
    master_branch_id: f.master_branch_id === '' ? null : Number(f.master_branch_id),
    punch_branch_ids: f.punch_branch_ids,
    door_lock_permission: f.door_lock_permission,
    date_of_joining: orNull(f.date_of_joining),
    date_of_birth: orNull(f.date_of_birth),
    address: orNull(f.address),
    pf_number: orNull(f.pf_number),
    uan_number: orNull(f.uan_number),
    esic_number: orNull(f.esic_number),
    aadhaar_number: orNull(f.aadhaar_number),
    salary_type: orNull(f.salary_type),
    monthly_salary: f.monthly_salary.trim() === '' ? null : Number(f.monthly_salary),
    payroll_group: orNull(f.payroll_group),
    bank_name: orNull(f.bank_name),
    bank_branch_name: orNull(f.bank_branch_name),
    bank_account_no: orNull(f.bank_account_no),
    bank_ifsc: orNull(f.bank_ifsc),
    emergency_contact_name: orNull(f.emergency_contact_name),
    emergency_contact_number: orNull(f.emergency_contact_number),
    emergency_contact_country_code: orNull(f.emergency_contact_country_code),
    emergency_contact_relation: orNull(f.emergency_contact_relation),
    emergency_contact_address: orNull(f.emergency_contact_address),
    references: f.references.filter((r) => r.name.trim()),
  };
}

/**
 * Required-field check per step. Inputs on inactive steps are unmounted, so
 * browser validation cannot see them — this runs before Next and before Save.
 */
export function validateStep(f: StaffFormValues, step: number, mode: 'create' | 'edit'): string | null {
  if (step === 0) {
    if (!f.employee_code.trim()) return 'Employee Code is required.';
    if (!f.full_name.trim()) return 'Employee Name is required.';
    if (!f.phone.trim()) return 'Mobile Number is required.';
    if (mode === 'create' && !f.email.trim()) return 'Email is required.';
    if (mode === 'create' && f.password.length < 6) return 'Password must be at least 6 characters.';
    if (!f.gender) return 'Gender is required.';
    if (f.department_id === '') return 'Department is required.';
    if (!f.designation.trim()) return 'Designation is required.';
    if (f.master_branch_id === '') return 'Master Branch is required.';
    if (f.punch_branch_ids.length === 0) return 'Select at least one Punch In Branch.';
  }
  if (step === 1) {
    if (!f.salary_type) return 'Salary Type is required.';
    if (f.monthly_salary.trim() === '') return 'Monthly Salary is required.';
    if (Number(f.monthly_salary) < 0) return 'Monthly Salary cannot be negative.';
    if (!f.payroll_group) return 'Payroll Group is required.';
  }
  if (f.aadhaar_number && f.aadhaar_number.length !== 12) {
    return 'Aadhaar Number must be exactly 12 digits.';
  }
  return null;
}

/** First step with a validation problem, or null when everything passes. */
export function firstInvalidStep(f: StaffFormValues, mode: 'create' | 'edit'): { step: number; message: string } | null {
  for (let i = 0; i <= 1; i += 1) {
    const msg = validateStep(f, i, mode);
    if (msg) return { step: i, message: msg };
  }
  return null;
}

/** One step panel. Rendered only when its step is active. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <span className="font-semibold text-zinc-900 text-sm">{title}</span>
      </div>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  );
}

const STEPS = [
  'Basic Details',
  'Salary Details',
  'Bank Details',
  'Legal Documents',
  'Emergency Contact',
  'Personal Information',
  'Reference',
] as const;

function Stepper({ current, furthest, onJump }: {
  current: number; furthest: number; onJump: (i: number) => void;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {STEPS.map((label, i) => {
          const done = i < furthest;
          const active = i === current;
          const reachable = i <= furthest;
          return (
            <button
              key={label}
              type="button"
              onClick={() => reachable && onJump(i)}
              disabled={!reachable}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                active ? 'bg-zinc-50 border border-zinc-200 text-zinc-900 shadow-sm'
                : reachable ? 'text-zinc-600 bg-white hover:bg-zinc-50'
                : 'text-zinc-300 bg-white cursor-not-allowed'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                active ? 'bg-emerald-600 text-white'
                : done ? 'bg-emerald-500 text-white'
                : 'bg-zinc-200 text-zinc-500'
              }`}>
                {done && !active ? <Check size={12} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Phone input with a dial-code selector, matching the reference layout. */
function PhoneInput({ code, number, onCode, onNumber, required }: {
  code: string; number: string;
  onCode: (v: string) => void; onNumber: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <select value={code} onChange={(e) => onCode(e.target.value)}
        className="w-20 shrink-0 px-2 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm">
        {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="tel" value={number} onChange={(e) => onNumber(e.target.value)}
        placeholder="Enter Number" required={required} className={inputClass} />
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

interface Props {
  mode: 'create' | 'edit';
  staffId?: number | null;
  value: StaffFormValues;
  onChange: (next: StaffFormValues) => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
  title: string;
}

export default function StaffForm({ mode, staffId = null, value, onChange, onSubmit, saving, error, title }: Props) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [branches, setBranches] = useState<WorkingLocation[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);

  const set = useCallback(
    <K extends keyof StaffFormValues>(key: K, v: StaffFormValues[K]) =>
      onChange({ ...value, [key]: v }),
    [value, onChange],
  );

  useEffect(() => {
    if (!token) return;
    listDepartments(token)
      .then((d) => setDepartments(Array.isArray(d) ? d : d.items))
      .catch(() => setDepartments([]));
    listWorkingLocations(token).then(setBranches).catch(() => setBranches([]));
    getRoles(token).then(setRoles).catch(() => setRoles([]));
  }, [token]);

  const togglePunchBranch = (id: number) => {
    const next = value.punch_branch_ids.includes(id)
      ? value.punch_branch_ids.filter((b) => b !== id)
      : [...value.punch_branch_ids, id];
    set('punch_branch_ids', next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const bad = firstInvalidStep(value, mode);
        if (bad) {
          setStepError(bad.message);
          setStep(bad.step);
          setFurthest((f) => Math.max(f, bad.step));
          return;
        }
        setStepError(null);
        onSubmit();
      }}
      className="w-full mx-auto px-6 lg:px-0 space-y-3 pb-24"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-zinc-900">{title}</h1>
        <button type="button" onClick={() => navigate('/hrms/staff')}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
          <X size={20} />
        </button>
      </div>

      {(error || stepError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error || stepError}
        </div>
      )}

      <div>
        <div className="mb-4">
          <Stepper current={step} furthest={furthest} onJump={setStep} />
        </div>

          {step === 0 && (
          <Section title="Basic Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Field label="Employee Code" required>
                <input value={value.employee_code} onChange={(e) => set('employee_code', e.target.value)}
                  placeholder="e.g. B102" className={inputClass} required />
              </Field>
              <Field label="Employee Name" required>
                <input value={value.full_name} onChange={(e) => set('full_name', e.target.value)}
                  placeholder="Full name" className={inputClass} required />
              </Field>
              <Field label="Display Name">
                <input value={value.display_name} onChange={(e) => set('display_name', e.target.value)}
                  placeholder="Shown in the app" className={inputClass} />
              </Field>
              <Field label="Mobile Number" required>
                <PhoneInput code={value.country_code} number={value.phone} required
                  onCode={(v) => set('country_code', v)} onNumber={(v) => set('phone', v)} />
              </Field>
              <Field label="Email" required={mode === 'create'}>
                <input type="email" value={value.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="employee@neomed.in" className={inputClass} required={mode === 'create'} />
              </Field>
              {mode === 'create' && (
                <Field label="Password" required hint="At least 6 characters.">
                  <input type="password" value={value.password} onChange={(e) => set('password', e.target.value)}
                    placeholder="Set a login password" className={inputClass} required minLength={6} />
                </Field>
              )}
              <Field label="Gender" required>
                <div className="flex items-center gap-4 pt-1.5">
                  {GENDER_OPTIONS.map((g) => (
                    <label key={g.value} className="flex items-center gap-1.5 text-sm text-zinc-700 cursor-pointer">
                      <input type="radio" name="gender" checked={value.gender === g.value}
                        onChange={() => set('gender', g.value)} className="accent-emerald-600" />
                      {g.label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Role" required hint="Controls what the employee can access.">
                <select value={value.role_code} onChange={(e) => set('role_code', e.target.value)} className={inputClass}>
                  {roles.length === 0 && <option value="staff">staff</option>}
                  {roles.map((r) => <option key={r.code} value={r.code}>{r.name || r.code}</option>)}
                </select>
              </Field>
              <Field label="Department" required>
                <select value={value.department_id}
                  onChange={(e) => set('department_id', e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputClass}>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Designation" required>
                <input value={value.designation} onChange={(e) => set('designation', e.target.value)}
                  placeholder="e.g. Billing Executive" className={inputClass} />
              </Field>
              <Field label="Master Branch" required>
                <select value={value.master_branch_id}
                  onChange={(e) => set('master_branch_id', e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputClass}>
                  <option value="">Select branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Employee Type">
                <select value={value.employee_type} onChange={(e) => set('employee_type', e.target.value)} className={inputClass}>
                  <option value="">Select type</option>
                  {EMPLOYEE_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Punch In Branch" required hint="Branches this employee may punch in at. Select any number.">
                {branches.length === 0 ? (
                  <p className="text-sm text-zinc-400">No working locations configured yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {branches.map((b) => {
                      const on = value.punch_branch_ids.includes(b.id);
                      return (
                        <button key={b.id} type="button" onClick={() => togglePunchBranch(b.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            on ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                               : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Door Lock Permission" required>
                <div className="flex items-center gap-4 pt-1.5">
                  {[true, false].map((v) => (
                    <label key={String(v)} className="flex items-center gap-1.5 text-sm text-zinc-700 cursor-pointer">
                      <input type="radio" name="doorlock" checked={value.door_lock_permission === v}
                        onChange={() => set('door_lock_permission', v)} className="accent-emerald-600" />
                      {v ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Provident Fund (PF)">
                <input value={value.pf_number} onChange={(e) => set('pf_number', e.target.value)}
                  placeholder="PF account number" className={inputClass} />
              </Field>
              <Field label="Universal Account Number (UAN)">
                <input value={value.uan_number} onChange={(e) => set('uan_number', e.target.value)}
                  placeholder="12-digit UAN" maxLength={12} className={inputClass} />
              </Field>
              <Field label="Employee State Insurance (ESIC)">
                <input value={value.esic_number} onChange={(e) => set('esic_number', e.target.value)}
                  placeholder="10-digit ESIC IP number" maxLength={10} className={inputClass} />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Address">
                <textarea value={value.address} onChange={(e) => set('address', e.target.value)}
                  rows={3} className={inputClass} />
              </Field>
            </div>
          </Section>
          )}

          {step === 1 && (
          <Section title="Salary Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Field label="Date of Joining">
                <input type="date" value={value.date_of_joining}
                  onChange={(e) => set('date_of_joining', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Monthly Salary" required>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">&#8377;</span>
                  <input type="number" min="0" step="1" value={value.monthly_salary}
                    onChange={(e) => set('monthly_salary', e.target.value)}
                    placeholder="0" className={inputClass} />
                </div>
              </Field>
              <Field label="Payroll Group" required>
                <select value={value.payroll_group} onChange={(e) => set('payroll_group', e.target.value)}
                  className={inputClass}>
                  <option value="">Select payroll group</option>
                  {PAYROLL_GROUP_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Salary Type" required>
                <div className="flex items-center gap-4 pt-1.5">
                  {SALARY_TYPE_OPTIONS.map((t) => (
                    <label key={t.value} className="flex items-center gap-1.5 text-sm text-zinc-700 cursor-pointer">
                      <input type="radio" name="salary_type" checked={value.salary_type === t.value}
                        onChange={() => set('salary_type', t.value)} className="accent-emerald-600" />
                      {t.label}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
              Payroll runs are calculated from{' '}
              <a href="/hrms/payroll/structures" className="font-semibold underline">Salary Structures</a>,
              not from this field. Update both so they agree.
            </p>
          </Section>
          )}

          {step === 2 && (
          <Section title="Bank Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Field label="Bank Name">
                <input value={value.bank_name} onChange={(e) => set('bank_name', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Branch Name">
                <input value={value.bank_branch_name} onChange={(e) => set('bank_branch_name', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Account No">
                <input value={value.bank_account_no} onChange={(e) => set('bank_account_no', e.target.value)} className={inputClass} />
              </Field>
              <Field label="IFSC Code">
                <input value={value.bank_ifsc} onChange={(e) => set('bank_ifsc', e.target.value.toUpperCase())}
                  maxLength={11} className={inputClass} />
              </Field>
            </div>
          </Section>
          )}

          {step === 3 && (
          <Section title="Legal Documents">
            <div className="pt-4 space-y-4">
              <div className="sm:max-w-md">
                <Field label="Aadhaar Number" hint="12 digits. Stored on the record; not verified against UIDAI.">
                  <input value={value.aadhaar_number}
                    onChange={(e) => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    inputMode="numeric" maxLength={12}
                    placeholder="Enter 12-digit Aadhaar number" className={inputClass} />
                </Field>
              </div>
              <StaffDocuments staffId={staffId} />
            </div>
          </Section>
          )}

          {step === 4 && (
          <Section title="Emergency Contact Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Field label="Contact Person Name">
                <input value={value.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Contact Number">
                <PhoneInput code={value.emergency_contact_country_code}
                  number={value.emergency_contact_number}
                  onCode={(v) => set('emergency_contact_country_code', v)}
                  onNumber={(v) => set('emergency_contact_number', v)} />
              </Field>
              <Field label="Relation with the Contact">
                <input value={value.emergency_contact_relation}
                  onChange={(e) => set('emergency_contact_relation', e.target.value)}
                  placeholder="e.g. Brother" className={inputClass} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Address">
                <textarea value={value.emergency_contact_address}
                  onChange={(e) => set('emergency_contact_address', e.target.value)} rows={2} className={inputClass} />
              </Field>
            </div>
          </Section>
          )}

          {step === 5 && (
          <Section title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Field label="Date of Birth">
                <input type="date" value={value.date_of_birth}
                  onChange={(e) => set('date_of_birth', e.target.value)} className={inputClass} />
              </Field>
            </div>
          </Section>
          )}

          {step === 6 && (
          <Section title="Reference">
            <div className="space-y-3 pt-4">
              {value.references.length === 0 && (
                <p className="text-sm text-zinc-400">No references added.</p>
              )}
              {value.references.map((ref, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Field label="Name">
                      <input value={ref.name}
                        onChange={(e) => {
                          const next = [...value.references];
                          next[i] = { ...next[i], name: e.target.value };
                          set('references', next);
                        }} className={inputClass} />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label="Contact Number">
                      <PhoneInput
                        code={ref.country_code ?? '+91'}
                        number={ref.contact_number ?? ''}
                        onCode={(v) => {
                          const next = [...value.references];
                          next[i] = { ...next[i], country_code: v };
                          set('references', next);
                        }}
                        onNumber={(v) => {
                          const next = [...value.references];
                          next[i] = { ...next[i], contact_number: v };
                          set('references', next);
                        }} />
                    </Field>
                  </div>
                  <button type="button"
                    onClick={() => set('references', value.references.filter((_, j) => j !== i))}
                    className="p-2.5 mb-0.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button"
                onClick={() => set('references', [...value.references, { name: '', contact_number: '', country_code: '+91' }])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-colors">
                <Plus size={14} /> Add More
              </button>
            </div>
          </Section>
          )}
        </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-zinc-200 px-6 py-3 flex items-center justify-between gap-3 z-10">
        <button type="button" onClick={() => navigate('/hrms/staff')}
          className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-700 text-sm font-semibold transition-colors">
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 mr-2 hidden sm:inline">
            Step {step + 1} of {STEPS.length}
          </span>
          <button type="button" disabled={step === 0}
            onClick={() => setStep((n) => Math.max(0, n - 1))}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft size={16} /> Back
          </button>
          {step < STEPS.length - 1 && (
            <button type="button"
              onClick={() => {
                const msg = validateStep(value, step, mode);
                if (msg) { setStepError(msg); return; }
                setStepError(null);
                const next = Math.min(STEPS.length - 1, step + 1);
                setStep(next);
                setFurthest((f) => Math.max(f, next));
              }}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold transition-colors">
              Next <ChevronRight size={16} />
            </button>
          )}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : mode === 'create' ? 'Create Employee' : 'Save Details'}
          </button>
        </div>
      </div>
    </form>
  );
}
