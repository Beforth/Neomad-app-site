import {
  assignInvoice,
  createInvoice,
  getBaseUrl,
  getInvoices as getInvoicesApi,
  getUsers as getUsersApi,
  mapBackendRoleToFrontend,
  notifyIfUnauthorized,
  sendManualNotification,
  updateInvoice,
  updateUser as updateUserApi,
} from './api';

type FrontendRole = 'admin' | 'manager' | 'delivery_boy' | 'staff';
type NotificationPriority = 'normal' | 'important' | 'urgent';
export const APP_NOTIFICATIONS_UPDATED_EVENT = 'neomed-notifications-updated';
export const NEW_INVOICE_EVENT = 'neomed-new-invoice';

export type NewInvoiceEventDetail = {
  invoice: {
    id: number;
    invoice_number: string;
    hospital_name: string;
    amount: number;
    status?: string;
  };
  notification_id?: string;
};

export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: FrontendRole;
  status: 'active' | 'inactive';
}

export interface Invoice {
  id: number;
  invoice_number: string;
  hospital_name: string;
  amount: number;
  status: 'pending' | 'assigned' | 'delivered' | 'cancelled' | 'completed';
  created_at: string;
  assigned_to?: number;
  accepted_at?: string;
  delivered_at?: string;
  cash_received?: number;
  cheque_received?: number;
  cheque_number?: string;
  bank_name?: string;
  cheque_photo_url?: string;
  signed_copy_url?: string;
  description?: string;
  cancel_reason?: string;
  delivery_feedback?: 'properly' | 'improperly';
  feedback_reason?: string;
  cash_confirmed?: boolean;
  cheque_confirmed?: boolean;
  invoice_type?: string;
  previous_amount?: number;
  amount_updated_at?: string;
  updated_at?: string;
}

interface LocalNotification {
  id: number;
  title: string;
  message: string;
  targets: string[];
  priority: NotificationPriority;
  sentBy?: string;
  isSystem?: boolean;
  created_at: string;
  readBy: number[];
  notificationId?: string;
  invoiceId?: number;
}

const NOTIFICATION_KEY = 'app_notifications';

const getTokenOrThrow = (): string => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please login to continue');
  return token;
};

const authedPatch = async (path: string, body: Record<string, unknown>): Promise<void> => {
  const token = getTokenOrThrow();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
};

const getStored = <T>(key: string, initial: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return initial;
    return JSON.parse(stored) as T;
  } catch {
    return initial;
  }
};

const setStored = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getNotificationsStore = (): LocalNotification[] => getStored<LocalNotification[]>(NOTIFICATION_KEY, []);
const setNotificationsStore = (value: LocalNotification[]): void => {
  setStored(NOTIFICATION_KEY, value);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APP_NOTIFICATIONS_UPDATED_EVENT));
  }
};

const pushSystemNotif = (
  title: string,
  message: string,
  targets: string[],
  priority: NotificationPriority = 'normal'
): void => {
  const list = getNotificationsStore();
  list.unshift({
    id: Date.now(),
    title,
    message,
    targets,
    priority,
    sentBy: 'System',
    isSystem: true,
    created_at: new Date().toISOString(),
    readBy: [],
  });
  setNotificationsStore(list);
};

const toFrontendUser = (u: any): User => ({
  id: u.id,
  username: (u.full_name || u.email?.split('@')[0] || `user-${u.id}`) as string,
  email: u.email,
  phone: u.phone || undefined,
  role: mapBackendRoleToFrontend(u.role_codes || []),
  status: u.is_active ? 'active' : 'inactive',
});

const authedGet = async <T>(path: string): Promise<T> => {
  const token = getTokenOrThrow();
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    notifyIfUnauthorized(res, true);
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
};

export async function getDeliveryOpenInvoices(token: string): Promise<Invoice[]> {
  const r = await getInvoicesApi(token, {
    page: 1,
    page_size: 100,
    omit_completed: true,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  return r.items as Invoice[];
}

export async function getDeliveryCompletedHistoryPage(
  token: string,
  page: number,
  opts?: { search?: string; completion_from?: string; includeCancelled?: boolean }
): Promise<{ items: Invoice[]; total: number }> {
  const status =
    opts?.includeCancelled === false ? 'delivered' : 'delivered,cancelled';
  const r = await getInvoicesApi(token, {
    page,
    page_size: 25,
    status,
    search: opts?.search?.trim() || undefined,
    completion_from: opts?.completion_from,
    sort_by: 'delivered_at',
    sort_order: 'desc',
  });
  return { items: r.items as Invoice[], total: r.total };
}

export const appApi = {
  getUsers: async () => {
    const token = getTokenOrThrow();
    try {
      const users = await getUsersApi(token);
      return users.map(toFrontendUser);
    } catch {
      const users = await getUsersApi(token, { role_code: 'delivery' });
      return users.map(toFrontendUser);
    }
  },

  getDeliveryOpenInvoices: async (token: string) => getDeliveryOpenInvoices(token),

  getDeliveryCompletedHistoryPage: async (
    token: string,
    page: number,
    opts?: { search?: string; completion_from?: string; includeCancelled?: boolean }
  ) => getDeliveryCompletedHistoryPage(token, page, opts),

  assignInvoice: async (id: number, deliveryBoyId: number) => {
    const token = getTokenOrThrow();
    await assignInvoice(token, id, deliveryBoyId);
    return { success: true };
  },

  acceptInvoice: async (id: number, userId: number) => {
    const token = getTokenOrThrow();
    await updateInvoice(token, id, { assigned_to: userId });
    return { success: true };
  },

  deliverInvoice: async (id: number, data: any) => {
    const token = getTokenOrThrow();
    await updateInvoice(token, id, {
      status: 'delivered',
      delivery_latitude: data.delivery_latitude ?? null,
      delivery_longitude: data.delivery_longitude ?? null,
      cash_received: Number(data.cash || 0),
      cheque_received: Number(data.cheque || 0),
      cheque_number: data.cheque_number || null,
      bank_name: data.bank_name || null,
      cheque_photo_url: data.cheque_photo_url || null,
      signed_copy_url: data.signed_copy_url || null,
    });
    return { success: true };
  },

  getStats: async () => {
    return authedGet('/invoices/stats');
  },

  getInvoiceMetrics: async () => {
    const d: any = await authedGet('/invoices/metrics');
    return {
      totalCount: d.total_count,
      todayCount: d.today_count,
      typeCounts: d.type_counts,
      perBoy: d.by_boy,
      by_weekday: d.by_weekday,
    };
  },

  markCashConfirmed: async (id: number, type: 'cash' | 'cheque') => {
    const token = getTokenOrThrow();
    await updateInvoice(token, id, type === 'cash' ? { cash_confirmed: true } : { cheque_confirmed: true });
    return { success: true };
  },

  updateUser: async (id: number, data: any) => {
    const token = getTokenOrThrow();
    await updateUserApi(token, id, {
      full_name: data.username,
      email: data.email,
      phone: data.phone ?? null,
      role_code:
        data.role === 'delivery_boy'
          ? 'delivery'
          : data.role === 'manager'
          ? 'manager'
          : data.role === 'admin'
          ? 'admin'
          : data.role === 'staff'
          ? 'staff'
          : undefined,
    });
    return { success: true };
  },

  cancelInvoice: async (id: number, reason?: string) => {
    const token = getTokenOrThrow();
    await updateInvoice(token, id, { status: 'cancelled', cancel_reason: reason || null });
    return { success: true };
  },

  submitFeedback: async (id: number, feedback: 'properly' | 'improperly', reason?: string) => {
    const token = getTokenOrThrow();
    await updateInvoice(token, id, {
      delivery_feedback: feedback,
      feedback_reason: reason || null,
    });
    return { success: true };
  },

  createTask: async (data: any) => {
    const token = getTokenOrThrow();
    const now = new Date();
    const taskNo = `TASK-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`;
    const task = await createInvoice(token, {
      invoice_number: taskNo,
      hospital_name: data.hospital_name || data.task_name || 'Task',
      amount: Number(data.amount || 0),
      description: data.description || '',
      assigned_to: data.assigned_to ? Number(data.assigned_to) : undefined,
    });
    return { success: true, task };
  },

  getDeliveryBoyStats: async (boyId: number) => {
    return authedGet(`/invoices/delivery-boy-stats/${boyId}`);
  },

  pushWaitingAlert: (invoiceNumber: string, hospitalName: string, boyName: string) => {
    pushSystemNotif(
      `Delivery Waiting - ${invoiceNumber}`,
      `${boyName} is waiting at ${hospitalName} for ${invoiceNumber}.`,
      ['admin', 'manager'],
      'important'
    );
  },

  getNotifications: () => getNotificationsStore(),
  saveNotification: (n: any) => {
    const list = getNotificationsStore();
    if (n.notificationId && list.some((x: any) => String(x.notificationId) === String(n.notificationId))) {
      return;
    }
    if (n.invoiceId && list.some((x: any) => x.invoiceId === n.invoiceId && x.isSystem)) {
      return;
    }
    list.unshift({
      ...n,
      id: Date.now(),
      created_at: new Date().toISOString(),
      readBy: Array.isArray(n.readBy) ? n.readBy : [],
    });
    setNotificationsStore(list);
  },
  markNotifRead: (id: number, userId: number) => {
    const list = getNotificationsStore();
    const n = list.find((x: any) => x.id === id);
    if (n && !n.readBy.includes(userId)) n.readBy.push(userId);
    setNotificationsStore(list);
  },
  deleteNotification: (id: number) => {
    const list = getNotificationsStore().filter((n) => n.id !== id);
    setNotificationsStore(list);
  },
  deleteNotifications: (ids: number[]) => {
    const remove = new Set(ids);
    const list = getNotificationsStore().filter((n) => !remove.has(n.id));
    setNotificationsStore(list);
  },
  markAllNotifRead: (userId: number) => {
    const list = getNotificationsStore().map((n) => {
      const readBy = Array.isArray(n.readBy) ? n.readBy : [];
      return readBy.includes(userId) ? n : { ...n, readBy: [...readBy, userId] };
    });
    setNotificationsStore(list);
  },
  sendNotification: async (n: { title: string; message: string; targets: string[]; priority: string; sentBy?: string }) => {
    const token = getTokenOrThrow();
    const result = await sendManualNotification(token, n);
    appApi.saveNotification(n);
    return result;
  },

  setDeliveryPresence: async (onDuty: boolean) => {
    await authedPatch('/users/me/delivery-presence', { on_duty: onDuty });
    return { success: true };
  },
};
