
export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'admin' | 'manager' | 'delivery_boy' | 'staff';
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
}

const INITIAL_USERS: User[] = [
  { id: 1, username: 'admin', email: 'admin@example.com', password: 'admin123', role: 'admin', status: 'active' },
  { id: 2, username: 'manager', email: 'manager@example.com', password: 'manager123', role: 'manager', status: 'active' },
  { id: 3, username: 'delivery1', email: 'boy1@example.com', password: 'boy123', role: 'delivery_boy', status: 'active' },
  { id: 4, username: 'staff1', email: 'staff1@example.com', password: 'staff123', role: 'staff', status: 'active' }
];

// Initial invoices - function so timestamps are always fresh on first load
const makeInitialInvoices = (): Invoice[] => [
  { id: 1, invoice_number: 'INV-2024-001', hospital_name: 'City Hospital', amount: 4500, status: 'pending', created_at: new Date().toISOString() },
  { id: 2, invoice_number: 'INV-2024-002', hospital_name: 'Metro Clinic', amount: 2800, status: 'pending', created_at: new Date().toISOString() },
  { id: 3, invoice_number: 'INV-2024-003', hospital_name: 'St. Mary Medical', amount: 3200, status: 'delivered', assigned_to: 3, created_at: new Date().toISOString(), delivered_at: new Date().toISOString(), cash_received: 3200, signed_copy_url: 'https://images.unsplash.com/photo-1586282391129-59a998fd6a90?auto=format&fit=crop&q=80&w=800' },
  { id: 4, invoice_number: 'INV-2024-004', hospital_name: 'Apollo Health', amount: 1500, status: 'pending', created_at: new Date().toISOString() },
  { id: 5, invoice_number: 'INV-2024-005', hospital_name: 'LifeCare Center', amount: 5600, status: 'pending', created_at: new Date().toISOString() },
  { id: 6, invoice_number: 'INV-2024-006', hospital_name: 'Sunrise Medical', amount: 1200, status: 'assigned', assigned_to: 3, created_at: new Date().toISOString() },
  { id: 7, invoice_number: 'TASK-2024-007', hospital_name: 'Pharmacy Restock', amount: 0, status: 'pending', created_at: new Date().toISOString() },
  { id: 8, invoice_number: 'INV-2024-008', hospital_name: 'General Wellness', amount: 8900, status: 'delivered', assigned_to: 3, created_at: new Date().toISOString(), delivered_at: new Date().toISOString(), cash_received: 8900 },
  { id: 9, invoice_number: 'TASK-2024-009', hospital_name: 'Document Pickup', amount: 0, status: 'assigned', assigned_to: 3, created_at: new Date().toISOString() },
  { id: 10, invoice_number: 'INV-2024-010', hospital_name: 'Ortho Care', amount: 4200, status: 'pending', created_at: new Date().toISOString() },
  { id: 11, invoice_number: 'INV-2024-011', hospital_name: 'Dental Hub', amount: 1800, status: 'pending', created_at: new Date().toISOString() },
  { id: 12, invoice_number: 'TASK-2024-012', hospital_name: 'Lab Sample Delivery', amount: 0, status: 'pending', created_at: new Date().toISOString() },
  { id: 13, invoice_number: 'INV-2024-013', hospital_name: 'Vision Plus', amount: 3500, status: 'delivered', assigned_to: 3, created_at: new Date(Date.now() - 3600000).toISOString(), delivered_at: new Date().toISOString(), cash_received: 3500 },
  { id: 14, invoice_number: 'TASK-2024-014', hospital_name: 'Emergency Supply', amount: 0, status: 'assigned', assigned_to: 3, created_at: new Date().toISOString() },
  { id: 15, invoice_number: 'INV-2024-015', hospital_name: 'Family Health', amount: 2200, status: 'pending', created_at: new Date().toISOString() },
];

// Pre-seeded system-generated notifications shown on first load
const ago = (mins: number) => new Date(Date.now() - mins * 60 * 1000).toISOString();
const INITIAL_NOTIFICATIONS = [
  {
    id: 100001,
    title: 'New Invoice Fetched from Gmail',
    message: '5 new invoices were automatically imported from admin@example.com. Review them in the Invoices section.',
    targets: ['admin', 'manager'],
    priority: 'normal',
    sentBy: 'System',
    isSystem: true,
    created_at: ago(5),
    readBy: [],
  },
  {
    id: 100002,
    title: 'Waiting Alert - Delivery Boy Waiting Too Long',
    message: 'delivery1 has been waiting at Metro Clinic for 18 minutes on invoice INV-2024-002. Please investigate.',
    targets: ['admin', 'manager'],
    priority: 'important',
    sentBy: 'System',
    isSystem: true,
    created_at: ago(8),
    readBy: [],
  },
  {
    id: 100003,
    title: 'Invoice INV-2024-003 Delivered',
    message: 'delivery1 successfully delivered INV-2024-003 to St. Mary Medical. Cash collected: ₹3,200.',
    targets: ['admin', 'manager'],
    priority: 'normal',
    sentBy: 'System',
    isSystem: true,
    created_at: ago(22),
    readBy: [],
  },
  {
    id: 100004,
    title: 'Cash Payment Pending Confirmation',
    message: 'INV-2024-003 — ₹3,200 cash collected by delivery1. Admin action required to confirm receipt.',
    targets: ['admin'],
    priority: 'important',
    sentBy: 'System',
    isSystem: true,
    created_at: ago(22),
    readBy: [],
  },
  {
    id: 100005,
    title: 'New Task Assigned to You',
    message: 'You have been assigned invoice INV-2024-001 — City Hospital, ₹4,500. Open the app to accept.',
    targets: ['delivery_boy'],
    priority: 'important',
    sentBy: 'System',
    isSystem: true,
    created_at: ago(30),
    readBy: [],
  },
  {
    id: 100006,
    title: 'System Sync Complete',
    message: 'Database sync completed at ' + new Date(Date.now() - 35 * 60000).toLocaleTimeString() + '. All invoice records are up to date.',
    targets: ['admin'],
    priority: 'normal',
    sentBy: 'System',
    isSystem: true,
    created_at: ago(35),
    readBy: [],
  },
  {
    id: 100007,
    title: 'Delivery Boy Went Offline',
    message: 'delivery1 has gone offline at 10:45 AM. 2 pending invoices may need reassignment.',
    targets: ['admin', 'manager'],
    priority: 'important',
    sentBy: 'System',
    isSystem: true,
    created_at: ago(90),
    readBy: [],
  },
];

const getStored = (key: string, initial: any) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : initial;
};

const setStored = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Pushes a system-generated notification (always from "System")
const pushSystemNotif = (
  title: string,
  message: string,
  targets: string[],
  priority: 'normal' | 'important' | 'urgent' = 'normal'
) => {
  const list = getStored('mock_notifications', INITIAL_NOTIFICATIONS);
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
  setStored('mock_notifications', list);
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
    pushSystemNotif(
      'New User Created',
      `A new ${userData.role.replace('_', ' ')} account "${userData.username}" (${userData.email}) has been added to the system.`,
      ['admin'],
      'normal'
    );
    return { success: true };
  },

  seedDemoData: async () => {
    // Reset invoices and notifications to initial state
    setStored('mock_invoices', makeInitialInvoices());
    setStored('mock_notifications', INITIAL_NOTIFICATIONS);
    // We could reset users too, but usually best to keep them unless requested
    return { success: true };
  },

  getInvoices: async (user: any) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());

    if (user.role === 'delivery_boy') {
      return invoices.filter((inv: any) =>
        inv.assigned_to === user.id || inv.status === 'pending'
      );
    }
    return invoices;
  },

  assignInvoice: async (id: number, deliveryBoyId: number) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const invoice = invoices.find((inv: any) => inv.id === id);
    const users = getStored('mock_users', INITIAL_USERS);
    const boy = users.find((u: any) => u.id === deliveryBoyId);
    if (invoice) {
      invoice.assigned_to = deliveryBoyId;
      invoice.status = 'assigned';
      setStored('mock_invoices', invoices);
      // Notify all roles + the delivery boy specifically
      pushSystemNotif(
        `Invoice Assigned — ${invoice.invoice_number}`,
        `${invoice.invoice_number} (${invoice.hospital_name}, ₹${invoice.amount.toLocaleString()}) has been assigned to ${boy?.username || 'a delivery boy'}.`,
        ['admin', 'manager'],
        'normal'
      );
      pushSystemNotif(
        `New Task Assigned to You`,
        `You have been assigned ${invoice.invoice_number} — ${invoice.hospital_name}, ₹${invoice.amount.toLocaleString()}. Open the app to accept.`,
        ['delivery_boy'],
        'important'
      );
    }
    return { success: true };
  },

  acceptInvoice: async (id: number, userId: number) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    // Removed alreadyActive check to allow multiple tasks
    const invoice = invoices.find((inv: any) => inv.id === id);
    const users = getStored('mock_users', INITIAL_USERS);
    const boy = users.find((u: any) => u.id === userId);
    if (invoice && invoice.status === 'pending') {
      invoice.status = 'assigned';
      invoice.assigned_to = userId;
      invoice.accepted_at = new Date().toISOString();
      setStored('mock_invoices', invoices);
      pushSystemNotif(
        `Task Accepted — ${invoice.invoice_number}`,
        `${boy?.username || 'A delivery boy'} accepted ${invoice.invoice_number} (${invoice.hospital_name}) and is now heading for delivery.`,
        ['admin', 'manager'],
        'normal'
      );
    }
    return { success: true };
  },

  deliverInvoice: async (id: number, data: any) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const invoice = invoices.find((inv: any) => inv.id === id);
    if (invoice) {
      invoice.status = 'delivered';
      invoice.delivered_at = new Date().toISOString();
      invoice.cash_received = data.cash || 0;
      invoice.cheque_received = data.cheque || 0;
      invoice.cheque_number = data.cheque_number || '';
      invoice.bank_name = data.bank_name || '';
      invoice.cheque_photo_url = data.cheque_photo_url || '';
      invoice.signed_copy_url = data.signed_copy_url || '';
      setStored('mock_invoices', invoices);
      const paymentParts = [];
      if (data.cash > 0) paymentParts.push(`₹${data.cash} cash`);
      if (data.cheque > 0) paymentParts.push(`₹${data.cheque} cheque`);
      const paymentStr = paymentParts.length > 0 ? `Payment collected: ${paymentParts.join(' + ')}.` : 'No payment collected.';
      pushSystemNotif(
        `Invoice Delivered — ${invoice.invoice_number}`,
        `${invoice.invoice_number} (${invoice.hospital_name}) has been successfully delivered. ${paymentStr}`,
        ['admin', 'manager'],
        'normal'
      );
      if ((data.cash || 0) + (data.cheque || 0) > 0) {
        pushSystemNotif(
          `Payment Pending Confirmation — ${invoice.invoice_number}`,
          `${invoice.invoice_number}: ${paymentStr} Admin confirmation required before closing this invoice.`,
          ['admin'],
          'important'
        );
      }
    }
    return { success: true };
  },

  getStats: async () => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const users = getStored('mock_users', INITIAL_USERS);
    const delivered = invoices.filter((i: any) => i.status === 'delivered');
    const cashPending = delivered.filter((i: any) => !i.cash_confirmed && !i.cheque_confirmed && (i.cash_received > 0 || i.cheque_received > 0));
    
    // Calculate total collection (cash + cheque)
    const totalCollected = delivered.reduce((sum: number, inv: any) => {
      return sum + (inv.cash_received || 0) + (inv.cheque_received || 0);
    }, 0);

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
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const inv = invoices.find((i: any) => i.id === id);
    if (inv) {
      if (type === 'cash') inv.cash_confirmed = true;
      else inv.cheque_confirmed = true;
      setStored('mock_invoices', invoices);
      pushSystemNotif(
        `${type === 'cash' ? 'Cash' : 'Cheque'} Confirmed — ${inv.invoice_number}`,
        `Admin confirmed receipt of ${type} payment for ${inv.invoice_number} (${inv.hospital_name}).`,
        ['admin', 'manager'],
        'normal'
      );
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
    if (user) {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      user.status = newStatus;
      setStored('mock_users', users);
      pushSystemNotif(
        `User ${newStatus === 'active' ? 'Activated' : 'Deactivated'} — ${user.username}`,
        `User account "${user.username}" (${user.role.replace('_', ' ')}) has been ${newStatus === 'active' ? 'activated' : 'deactivated'} by an admin.`,
        ['admin'],
        newStatus === 'inactive' ? 'important' : 'normal'
      );
    }
    return { success: true };
  },

  cancelInvoice: async (id: number, reason?: string) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const inv = invoices.find((i: any) => i.id === id);
    if (inv) {
      inv.status = 'cancelled';
      inv.cancel_reason = reason || '';
      setStored('mock_invoices', invoices);
      pushSystemNotif(
        `Invoice Cancelled — ${inv.invoice_number}`,
        `${inv.invoice_number} (${inv.hospital_name}, ₹${inv.amount.toLocaleString()}) was cancelled. Reason: ${reason || 'N/A'}`,
        ['admin', 'manager'],
        'important'
      );
    }
    return { success: true };
  },

  submitFeedback: async (id: number, feedback: 'properly' | 'improperly', reason?: string) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const inv = invoices.find((i: any) => i.id === id);
    if (inv) {
      inv.delivery_feedback = feedback;
      inv.feedback_reason = reason || '';
      setStored('mock_invoices', invoices);
      if (feedback === 'improperly') {
        pushSystemNotif(
          `Improper Delivery Feedback — ${inv.invoice_number}`,
          `${inv.invoice_number} was marked as improperly delivered by the delivery boy. Reason: ${reason || 'N/A'}`,
          ['admin', 'manager'],
          'important'
        );
      }
    }
    return { success: true };
  },

  createTask: async (data: any) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const newInvoice = {
      id: invoices.length + 1,
      invoice_number: `TASK-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
      hospital_name: data.hospital_name || data.task_name || 'New Task',
      amount: data.amount || 0,
      status: data.assigned_to ? 'assigned' : 'pending',
      created_at: new Date().toISOString(),
      assigned_to: data.assigned_to ? Number(data.assigned_to) : undefined,
      description: data.description || '',
    };
    invoices.push(newInvoice);
    setStored('mock_invoices', invoices);

    if (data.assignee) {
      pushSystemNotif(
        `New Task Created & Assigned — ${newInvoice.invoice_number}`,
        `Task "${data.task_name}" has been created and assigned.`,
        ['admin', 'manager', 'delivery_boy'],
        'normal'
      );
    }
    return { success: true, task: newInvoice };
  },

  getDeliveryBoyStats: async (boyId: number) => {
    const invoices = getStored('mock_invoices', makeInitialInvoices());
    const delivered = invoices.filter((i: any) => i.status === 'delivered' && i.assigned_to === boyId);

    // Mock km calculation based on number of deliveries (e.g. 5.2km per delivery average)
    const kmDriven = delivered.length * 5.2;

    // Daily distance data for graphs
    const dailyDistance = [
      { day: 'Mon', km: (delivered.length * 0.8).toFixed(1) },
      { day: 'Tue', km: (delivered.length * 1.2).toFixed(1) },
      { day: 'Wed', km: (delivered.length * 0.9).toFixed(1) },
      { day: 'Thu', km: (delivered.length * 1.5).toFixed(1) },
      { day: 'Fri', km: (delivered.length * 1.1).toFixed(1) },
      { day: 'Sat', km: (delivered.length * 0.5).toFixed(1) },
      { day: 'Sun', km: (delivered.length * 0.3).toFixed(1) },
    ];

    return {
      total_delivered: delivered.length,
      km_driven: kmDriven.toFixed(1),
      daily_distance: dailyDistance
    };
  },

  getBoyRoute: async (boyId: number, date: string) => {
    // Mock route data for different boys
    const routes: Record<number, any> = {
      1: {
        path: [[19.9975, 73.7898], [19.9980, 73.7920], [20.0010, 73.7950], [20.0050, 73.7980]],
        checkpoints: [
          { pos: [19.9975, 73.7898], label: 'Pickup: Warehouse', time: '09:15 AM', status: 'completed' },
          { pos: [20.0010, 73.7950], label: 'City Hospital', time: '10:30 AM', status: 'completed' },
          { pos: [20.0050, 73.7980], label: 'Current Location', time: 'Now', status: 'active' }
        ]
      },
      2: {
        path: [[20.0050, 73.7800], [20.0030, 73.7750], [20.0010, 73.7700], [19.9980, 73.7650]],
        checkpoints: [
          { pos: [20.0050, 73.7800], label: 'Pickup: Hub B', time: '08:45 AM', status: 'completed' },
          { pos: [20.0010, 73.7700], label: 'Metro Clinic', time: '11:20 AM', status: 'completed' },
          { pos: [19.9980, 73.7650], label: 'Last Stop', time: '12:45 PM', status: 'completed' }
        ]
      },
      3: {
        path: [[19.9900, 73.8000], [19.9880, 73.8050], [19.9850, 73.8100], [19.9820, 73.8150]],
        checkpoints: [
          { pos: [19.9900, 73.8000], label: 'Pickup: Main Office', time: '10:00 AM', status: 'completed' },
          { pos: [19.9850, 73.8100], label: 'St. Mary Medical', time: '02:15 PM', status: 'completed' }
        ]
      },
      4: {
        path: [[19.9850, 73.7750], [19.9880, 73.7720], [19.9910, 73.7690], [19.9950, 73.7650]],
        checkpoints: [
          { pos: [19.9850, 73.7750], label: 'Pickup: Apollo Gate', time: '11:30 AM', status: 'completed' },
          { pos: [19.9950, 73.7650], label: 'Customer A', time: '01:50 PM', status: 'completed' }
        ]
      }
    };
    return routes[boyId] || { path: [], checkpoints: [] };
  },

  // Push a waiting alert (called from DeliveryBoyApp when status changes to 'waiting')
  pushWaitingAlert: (invoiceNumber: string, hospitalName: string, boyName: string) => {
    pushSystemNotif(
      `Delivery Boy Waiting — ${invoiceNumber}`,
      `${boyName} has been waiting at ${hospitalName} for over 5 minutes on ${invoiceNumber}. Consider following up.`,
      ['admin', 'manager'],
      'important'
    );
  },

  // Notifications
  getNotifications: () => getStored('mock_notifications', INITIAL_NOTIFICATIONS),
  saveNotification: (n: any) => {
    const list = getStored('mock_notifications', INITIAL_NOTIFICATIONS);
    list.unshift({ ...n, id: Date.now(), created_at: new Date().toISOString() });
    setStored('mock_notifications', list);
  },
  markNotifRead: (id: number, userId: number) => {
    const list = getStored('mock_notifications', INITIAL_NOTIFICATIONS);
    const n = list.find((x: any) => x.id === id);
    if (n) { n.readBy = n.readBy || []; if (!n.readBy.includes(userId)) n.readBy.push(userId); }
    setStored('mock_notifications', list);
  },
};
