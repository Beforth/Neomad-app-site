import type { ApiInvoice } from '../../lib/api';

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function fakeDuration(inv: ApiInvoice) {
  if (inv.status !== 'delivered') return null;
  return { travel: '18 mins', waiting: '6 mins', total: '24 mins' };
}

export type InstallmentUiStatus = 'paid' | 'pending' | 'before_paid' | 'current_paid';

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentUiStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  before_paid: 'Before paid',
  current_paid: 'Current paid',
};

export const INSTALLMENT_STATUS_STYLE: Record<InstallmentUiStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  before_paid: 'bg-sky-100 text-sky-800 border-sky-200',
  current_paid: 'bg-violet-100 text-violet-800 border-violet-200',
};

/** Rows for confirm-payment UI: deposit, cash/cheque, pending balance. */
export function getInstallmentRows(inv: ApiInvoice): { id: string; label: string; amount: number; status: InstallmentUiStatus }[] {
  const amount = inv.amount ?? 0;
  const cash = inv.cash_received ?? 0;
  const cheque = inv.cheque_received ?? 0;
  const collected = cash + cheque;
  const cashConf = !!inv.cash_confirmed;
  const chequeConf = !!inv.cheque_confirmed;

  const rows: { id: string; label: string; amount: number; status: InstallmentUiStatus }[] = [];

  let deposit = amount > 0 ? Math.min(Math.round(amount / 3), amount) : 0;
  let outstanding = Math.max(0, amount - deposit - collected);
  if (deposit + collected > amount) {
    deposit = Math.max(0, amount - collected);
    outstanding = 0;
  }

  if (deposit > 0) {
    rows.push({
      id: 'before-paid',
      label: 'Installment 1 — prior / deposit',
      amount: deposit,
      status: 'before_paid',
    });
  }

  if (cash > 0) {
    rows.push({
      id: 'cash',
      label: 'Cash (this delivery)',
      amount: cash,
      status: cashConf ? 'paid' : 'current_paid',
    });
  }
  if (cheque > 0) {
    rows.push({
      id: 'cheque',
      label: 'Cheque (this delivery)',
      amount: cheque,
      status: chequeConf ? 'paid' : 'current_paid',
    });
  }

  if (amount > 0) {
    rows.push({
      id: 'pending-balance',
      label: 'Pending (still due on invoice)',
      amount: outstanding,
      status: 'pending',
    });
  } else if (rows.length === 0) {
    rows.push({ id: 'total', label: 'Invoice total', amount: 0, status: 'pending' });
  }

  return rows;
}

export function parseInvoiceRouteId(param: string | undefined): number | null {
  if (!param || !/^\d+$/.test(param)) return null;
  const n = Number(param);
  return Number.isFinite(n) ? n : null;
}
