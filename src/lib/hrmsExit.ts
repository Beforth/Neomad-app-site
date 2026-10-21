/** HRMS offboarding client. Backend: /hrms/exit */
import { authJson } from './hrmsStaff';

export type ExitType = 'resignation' | 'termination' | 'retirement' | 'end_of_contract' | 'absconding';
export type ExitStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed';

export const EXIT_TYPE_LABEL: Record<ExitType, string> = {
  resignation: 'Resignation',
  termination: 'Termination',
  retirement: 'Retirement',
  end_of_contract: 'End of contract',
  absconding: 'Absconding',
};

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  done_at: string | null;
}

export interface ExitRequest {
  id: number;
  user_id: number;
  employee_name: string;
  employee_code: string | null;
  designation: string | null;
  department: string | null;
  exit_type: ExitType;
  resignation_date: string;
  notice_days: number;
  last_working_day: string;
  reason: string | null;
  status: ExitStatus;
  decision_note: string | null;
  decided_at: string | null;
  checklist: ChecklistItem[];
  checklist_done: number;
  checklist_total: number;
  other_earnings: number;
  other_deductions: number;
  leave_encashment_override: number | null;
  settlement_note: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface Settlement {
  month: string;
  salary_due: number;
  leave_encashment: number;
  leave_encashment_calculated: number;
  leave_encashment_overridden: boolean;
  encashment_lines: { leave_type: string; days: number; amount: number }[];
  other_earnings: number;
  advance_outstanding: number;
  other_deductions: number;
  net_payable: number;
  note: string | null;
  notes: string[];
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const listExits = (token: string, status?: string) =>
  authJson<ExitRequest[]>(token, `/hrms/exit${status ? `?status=${status}` : ''}`);
export const getExit = (token: string, id: number) => authJson<ExitRequest>(token, `/hrms/exit/${id}`);
export const startExit = (
  token: string,
  body: { user_id: number; exit_type: ExitType; notice_days: number; last_working_day?: string; reason?: string },
) => authJson<ExitRequest>(token, '/hrms/exit', { method: 'POST', ...json(body) });
export const decideExit = (
  token: string,
  id: number,
  body: { status?: 'approved' | 'rejected'; last_working_day?: string; notice_days?: number; decision_note?: string },
) => authJson<ExitRequest>(token, `/hrms/exit/${id}`, { method: 'PATCH', ...json(body) });
export const toggleChecklist = (token: string, id: number, key: string, done: boolean) =>
  authJson<ExitRequest>(token, `/hrms/exit/${id}/checklist`, { method: 'PATCH', ...json({ key, done }) });
export const getSettlement = (token: string, id: number) =>
  authJson<Settlement>(token, `/hrms/exit/${id}/settlement`);
export const saveSettlement = (
  token: string,
  id: number,
  body: { other_earnings: number; other_deductions: number; leave_encashment_override: number | null; note: string },
) => authJson<Settlement>(token, `/hrms/exit/${id}/settlement`, { method: 'PUT', ...json(body) });
export const completeExit = (token: string, id: number) =>
  authJson<ExitRequest>(token, `/hrms/exit/${id}/complete`, { method: 'POST' });

export const myExits = (token: string) => authJson<ExitRequest[]>(token, '/hrms/exit/me');
export const submitResignation = (token: string, body: { notice_days: number; reason: string }) =>
  authJson<ExitRequest>(token, '/hrms/exit/me', { method: 'POST', ...json(body) });
export const withdrawResignation = (token: string, id: number) =>
  authJson<ExitRequest>(token, `/hrms/exit/me/${id}/withdraw`, { method: 'POST' });

export const statusVariant = (s: ExitStatus): 'warning' | 'info' | 'success' | 'danger' | 'default' =>
  s === 'pending' ? 'warning' : s === 'approved' ? 'info' : s === 'completed' ? 'success' : s === 'rejected' ? 'danger' : 'default';
