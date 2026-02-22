
export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'admin' | 'manager' | 'delivery_boy';
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
  signed_copy_url?: string;
}

const INITIAL_USERS: User[] = [
  { id: 1, username: 'admin', email: 'admin@example.com', password: 'admin123', role: 'admin', status: 'active' },
  { id: 2, username: 'manager', email: 'manager@example.com', password: 'manager123', role: 'manager', status: 'active' },
  { id: 3, username: 'delivery1', email: 'boy1@example.com', password: 'boy123', role: 'delivery_boy', status: 'active' }
];

const INITIAL_INVOICES: Invoice[] = [
  { id: 1, invoice_number: 'INV-2024-001', hospital_name: 'City Hospital', amount: 4500, status: 'pending', created_at: new Date().toISOString() },
  { id: 2, invoice_number: 'INV-2024-002', hospital_name: 'Metro Clinic', amount: 2800, status: 'pending', created_at: new Date().toISOString() },
  { id: 3, invoice_number: 'INV-2024-003', hospital_name: 'St. Mary Medical', amount: 3200, status: 'delivered', assigned_to: 2, created_at: new Date().toISOString(), delivered_at: new Date().toISOString() },
  { id: 4, invoice_number: 'INV-2024-004', hospital_name: 'Apollo Health', amount: 1500, status: 'pending', created_at: new Date().toISOString() },
  { id: 5, invoice_number: 'INV-2024-005', hospital_name: 'LifeCare Center', amount: 5600, status: 'pending', created_at: new Date().toISOString() },
];

const getStored = (key: string, initial: any) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : initial;
};

const setStored = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const mockApi = {
  login: async (username: string, password: string) => {
    const users = getStored('mock_users', INITIAL_USERS);
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (!user) throw new Error('Invalid credentials');
    const { password: _, ...userWithoutPassword } = user;
    return { token: 'mock_token_' + Date.now(), user: userWithoutPassword };
  },

  getUsers: async () => {
    return getStored('mock_users', INITIAL_USERS).map(({ password: _, ...u }: any) => u);
  },

  addUser: async (userData: any) => {
    const users = getStored('mock_users', INITIAL_USERS);
    const newUser = { ...userData, id: users.length + 1, status: 'active' };
    users.push(newUser);
    setStored('mock_users', users);
    return { success: true };
  },

  getInvoices: async (user: any) => {
    const invoices = getStored('mock_invoices', INITIAL_INVOICES);
    if (user.role === 'delivery_boy') {
      return invoices.filter((inv: any) => inv.assigned_to === user.id || inv.status === 'pending');
    }
    return invoices;
  },

  assignInvoice: async (id: number, deliveryBoyId: number) => {
    const invoices = getStored('mock_invoices', INITIAL_INVOICES);
    const invoice = invoices.find((inv: any) => inv.id === id);
    if (invoice) {
      invoice.assigned_to = deliveryBoyId;
      invoice.status = 'assigned';
      setStored('mock_invoices', invoices);
    }
    return { success: true };
  },

  acceptInvoice: async (id: number, userId: number) => {
    const invoices = getStored('mock_invoices', INITIAL_INVOICES);
    // Prevent accepting if user already has an active assigned task
    const alreadyActive = invoices.find((inv: any) => inv.status === 'assigned' && inv.assigned_to === userId);
    if (alreadyActive) {
      return { success: false, error: 'You already have an active task. Complete it before accepting a new one.' };
    }
    const invoice = invoices.find((inv: any) => inv.id === id);
    if (invoice && invoice.status === 'pending') {
      invoice.status = 'assigned';
      invoice.assigned_to = userId;
      invoice.accepted_at = new Date().toISOString();
      setStored('mock_invoices', invoices);
    }
    return { success: true };
  },

  deliverInvoice: async (id: number, data: any) => {
    const invoices = getStored('mock_invoices', INITIAL_INVOICES);
    const invoice = invoices.find((inv: any) => inv.id === id);
    if (invoice) {
      invoice.status = 'delivered';
      invoice.delivered_at = new Date().toISOString();
      invoice.cash_received = data.cash || 0;
      invoice.cheque_received = data.cheque || 0;
      invoice.signed_copy_url = data.signed_copy_url || "";
      setStored('mock_invoices', invoices);
    }
    return { success: true };
  },

  getStats: async () => {
    const invoices = getStored('mock_invoices', INITIAL_INVOICES);
    const delivered = invoices.filter((i: any) => i.status === 'delivered');
    const cashPending = delivered.filter((i: any) => !i.cash_confirmed && !i.cheque_confirmed && (i.cash_received > 0 || i.cheque_received > 0));
    return {
      total_today: { count: invoices.length },
      pending: { count: invoices.filter((i: any) => i.status === 'pending').length },
      assigned: { count: invoices.filter((i: any) => i.status === 'assigned').length },
      delivered: { count: delivered.length },
      cancelled: { count: invoices.filter((i: any) => i.status === 'cancelled').length },
      cash_pending: { count: cashPending.length },
    };
  },

  markCashConfirmed: async (id: number, type: 'cash' | 'cheque') => {
    const invoices = getStored('mock_invoices', INITIAL_INVOICES);
    const inv = invoices.find((i: any) => i.id === id);
    if (inv) {
      if (type === 'cash') inv.cash_confirmed = true;
      else inv.cheque_confirmed = true;
      setStored('mock_invoices', invoices);
    }
    return { success: true };
  },

  updateUser: async (id: number, data: any) => {
    const users = getStored('mock_users', INITIAL_USERS);
    const idx = users.findIndex((u: any) => u.id === id);
    if (idx !== -1) users[idx] = { ...users[idx], ...data };
    setStored('mock_users', users);
    return { success: true };
  },

  toggleUserStatus: async (id: number) => {
    const users = getStored('mock_users', INITIAL_USERS);
    const user = users.find((u: any) => u.id === id);
    if (user) user.status = user.status === 'active' ? 'inactive' : 'active';
    setStored('mock_users', users);
    return { success: true };
  },

  cancelInvoice: async (id: number) => {
    const invoices = getStored('mock_invoices', INITIAL_INVOICES);
    const inv = invoices.find((i: any) => i.id === id);
    if (inv) { inv.status = 'cancelled'; setStored('mock_invoices', invoices); }
    return { success: true };
  },

  // Notifications
  getNotifications: () => getStored('mock_notifications', []),
  saveNotification: (n: any) => {
    const list = getStored('mock_notifications', []);
    list.unshift({ ...n, id: Date.now(), created_at: new Date().toISOString() });
    setStored('mock_notifications', list);
  },
  markNotifRead: (id: number, userId: number) => {
    const list = getStored('mock_notifications', []);
    const n = list.find((x: any) => x.id === id);
    if (n) { n.readBy = n.readBy || []; if (!n.readBy.includes(userId)) n.readBy.push(userId); }
    setStored('mock_notifications', list);
  },
};
