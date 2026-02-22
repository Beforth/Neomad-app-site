import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = 3000;
const JWT_SECRET = "marg_delivery_system_secret_key_2024";

app.use(express.json());

// --- In-Memory Data Store ---
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'delivery_boy';
  status: 'active' | 'inactive';
}

interface Invoice {
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

const state = {
  users: [
    { id: 1, username: 'admin', email: 'admin@example.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', status: 'active' },
    { id: 2, username: 'delivery1', email: 'boy1@example.com', password: bcrypt.hashSync('boy123', 10), role: 'delivery_boy', status: 'active' }
  ] as User[],
  invoices: [
    { id: 1, invoice_number: 'INV-2024-001', hospital_name: 'City Hospital', amount: 4500, status: 'pending', created_at: new Date().toISOString() },
    { id: 2, invoice_number: 'INV-2024-002', hospital_name: 'Metro Clinic', amount: 2800, status: 'assigned', assigned_to: 2, created_at: new Date().toISOString() },
    { id: 3, invoice_number: 'INV-2024-003', hospital_name: 'St. Mary Medical', amount: 3200, status: 'delivered', assigned_to: 2, created_at: new Date().toISOString(), delivered_at: new Date().toISOString() },
    { id: 4, invoice_number: 'INV-2024-004', hospital_name: 'Apollo Health', amount: 1500, status: 'pending', created_at: new Date().toISOString() },
    { id: 5, invoice_number: 'INV-2024-005', hospital_name: 'LifeCare Center', amount: 5600, status: 'pending', created_at: new Date().toISOString() },
  ] as Invoice[],
  tracking: [] as any[],
  settings: {} as Record<string, string>
};

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Auth Routes ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = state.users.find(u => u.username === username);
    if (!user) {
      console.log(`Login failed: user '${username}' not found`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login failed: incorrect password for user '${username}'`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log(`Login successful for user: ${username}`);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, email: user.email } });
  } catch (err: any) {
    console.error("Login route error:", err);
    res.status(500).json({ error: "Internal server error during login", details: err.message });
  }
});

// --- User Management ---
app.get("/api/users", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  res.json(state.users.map(({ password, ...u }) => u));
});

app.post("/api/users", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { username, email, password, role } = req.body;
  const newUser = {
    id: state.users.length + 1,
    username,
    email,
    password: bcrypt.hashSync(password, 10),
    role,
    status: 'active' as const
  };
  state.users.push(newUser);
  res.json({ success: true });
});

// --- Invoice Management ---
app.get("/api/invoices", authenticate, (req: any, res) => {
  let invoices = state.invoices;
  if (req.user.role === 'delivery_boy') {
    invoices = state.invoices.filter(inv => inv.assigned_to === req.user.id || inv.status === 'pending');
  }
  res.json(invoices);
});

app.post("/api/invoices/:id/assign", authenticate, (req: any, res) => {
  const { delivery_boy_id } = req.body;
  const invoice = state.invoices.find(inv => inv.id === parseInt(req.params.id));
  if (invoice) {
    invoice.assigned_to = delivery_boy_id;
    invoice.status = 'assigned';
    io.emit('invoice_updated', { id: req.params.id, status: 'assigned' });
  }
  res.json({ success: true });
});

app.post("/api/invoices/:id/accept", authenticate, (req: any, res) => {
  const invoice = state.invoices.find(inv => inv.id === parseInt(req.params.id));
  if (invoice) {
    invoice.status = 'assigned';
    invoice.assigned_to = req.user.id;
    invoice.accepted_at = new Date().toISOString();
    io.emit('invoice_updated', { id: req.params.id, status: 'assigned' });
  }
  res.json({ success: true });
});

app.post("/api/invoices/:id/deliver", authenticate, (req: any, res) => {
  const { cash, cheque, signed_copy_url } = req.body;
  const invoice = state.invoices.find(inv => inv.id === parseInt(req.params.id));
  if (invoice) {
    invoice.status = 'delivered';
    invoice.delivered_at = new Date().toISOString();
    invoice.cash_received = cash || 0;
    invoice.cheque_received = cheque || 0;
    invoice.signed_copy_url = signed_copy_url || "";
    io.emit('invoice_updated', { id: req.params.id, status: 'delivered' });
  }
  res.json({ success: true });
});

// --- Gmail Integration (Admin Only) ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

let oauth2Client: any = null;
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${APP_URL}/auth/callback`
  );
}

app.get("/api/auth/google/url", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  if (!oauth2Client) {
    return res.status(400).json({ error: "Google OAuth is not configured." });
  }
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!oauth2Client) return res.status(400).send("OAuth not configured");
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    state.settings['gmail_tokens'] = JSON.stringify(tokens);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Auth failed");
  }
});

app.get("/api/gmail/status", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  res.json({ connected: !!state.settings['gmail_tokens'] });
});

// --- Tracking ---
app.post("/api/tracking", authenticate, (req: any, res) => {
  const { lat, lng, status } = req.body;
  state.tracking.push({ user_id: req.user.id, latitude: lat, longitude: lng, status, timestamp: new Date().toISOString() });
  io.emit('location_update', { user_id: req.user.id, lat, lng, status, username: req.user.username });
  res.json({ success: true });
});

// --- Dashboard Stats ---
app.get("/api/stats", authenticate, (req: any, res) => {
  const stats = {
    total_today: { count: state.invoices.length },
    pending: { count: state.invoices.filter(i => i.status === 'pending').length },
    assigned: { count: state.invoices.filter(i => i.status === 'assigned').length },
    delivered: { count: state.invoices.filter(i => i.status === 'delivered').length },
    cancelled: { count: state.invoices.filter(i => i.status === 'cancelled').length },
  };
  res.json(stats);
});


// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  startServer();
}

export default app;
