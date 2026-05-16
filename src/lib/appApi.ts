import {
  assignInvoice,
  createInvoice,
  getDeliveryDayPath,
  getBaseUrl,
  getInvoices as getInvoicesApi,
  getUsers as getUsersApi,
  mapBackendRoleToFrontend,
  updateInvoice,
  updateUser as updateUserApi,
} from './api';

type FrontendRole = 'admin' | 'manager' | 'delivery_boy' | 'staff';
type NotificationPriority = 'normal' | 'important' | 'urgent';
export const APP_NOTIFICATIONS_UPDATED_EVENT = 'neomed-notifications-updated';

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
  status: 'pending' | 'assigned' | 'delivered' | 'cancelled';
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

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

const pathDistanceKm = (path: Array<{ lat: number; lng: number }>): number => {
  let km = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const dx = (b.lat - a.lat) * 111;
    const dy = (b.lng - a.lng) * 111;
    km += Math.sqrt(dx * dx + dy * dy);
  }
  return km;
};

const getAllInvoices = async (): Promise<Invoice[]> => {
  const token = getTokenOrThrow();
  const pageSize = 100;
  const first = await getInvoicesApi(token, { page: 1, page_size: pageSize });
  let items = [...(first.items as Invoice[])];
  const totalPages = Math.max(1, Math.ceil(first.total / pageSize));
  for (let p = 2; p <= totalPages; p += 1) {
    const next = await getInvoicesApi(token, { page: p, page_size: pageSize });
    items = items.concat(next.items as Invoice[]);
  }
  return items;
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

  getInvoices: async () => {
    return getAllInvoices();
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
    const [invoices, users] = await Promise.all([getAllInvoices(), appApi.getUsers()]);
    const delivered = invoices.filter((i: any) => i.status === 'delivered');
    const cashPending = delivered.filter(
      (i: any) =>
        !i.cash_confirmed &&
        !i.cheque_confirmed &&
        ((i.cash_received || 0) > 0 || (i.cheque_received || 0) > 0)
    );
    const totalCollected = delivered.reduce(
      (sum: number, inv: any) => sum + (inv.cash_received || 0) + (inv.cheque_received || 0),
      0
    );
    return {
      total_today: { count: invoices.length },
      pending: { count: invoices.filter((i: any) => i.status === 'pending').length },
      assigned: { count: invoices.filter((i: any) => i.status === 'assigned').length },
      delivered: { count: delivered.length },
      cancelled: { count: invoices.filter((i: any) => i.status === 'cancelled').length },
      cash_pending: { count: cashPending.length },
      total_boys: { count: users.filter((u: any) => u.role === 'delivery_boy').length },
      total_staff: { count: users.filter((u: any) => u.role === 'staff' || u.role === 'manager').length },
      total_collected: { count: totalCollected },
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
    const token = getTokenOrThrow();
    const invoices = await getAllInvoices();
    const delivered = invoices.filter((i: any) => i.status === 'delivered' && i.assigned_to === boyId);

    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(toIsoDate(d));
    }

    const daily_distance: Array<{ day: string; km: string }> = [];
    let kmSum = 0;
    for (const day of days) {
      try {
        const dayPath = await getDeliveryDayPath(token, boyId, day);
        const km = pathDistanceKm(dayPath.points || []);
        kmSum += km;
        daily_distance.push({
          day: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
          km: km.toFixed(1),
        });
      } catch {
        daily_distance.push({
          day: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
          km: '0.0',
        });
      }
    }

    return {
      total_delivered: delivered.length,
      km_driven: kmSum.toFixed(1),
      daily_distance,
    };
  },

  getBoyRoute: async (boyId: number, date: string) => {
    const token = getTokenOrThrow();
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toIsoDate(new Date());
    const res = await getDeliveryDayPath(token, boyId, targetDate);
    const path = (res.points || []).map((p) => [p.lat, p.lng] as [number, number]);
    const checkpoints = (res.points || [])
      .filter((_, idx, arr) => idx === 0 || idx === arr.length - 1 || idx % 5 === 0)
      .slice(0, 6)
      .map((p, idx, arr) => ({
        pos: [p.lat, p.lng] as [number, number],
        label: idx === 0 ? 'Route start' : idx === arr.length - 1 ? 'Latest point' : `Checkpoint ${idx + 1}`,
        time: new Date(p.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: idx === arr.length - 1 ? 'active' : 'completed',
      }));
    return { path, checkpoints };
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

  setDeliveryPresence: async (onDuty: boolean) => {
    await authedPatch('/users/me/delivery-presence', { on_duty: onDuty });
    return { success: true };
  },
};
