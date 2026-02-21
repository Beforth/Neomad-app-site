import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { google } from "googleapis";
import db from "./src/db.ts";
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
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, email: user.email } });
});

// --- User Management ---
app.get("/api/users", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const users = db.prepare("SELECT id, username, email, role, status FROM users").all();
  res.json(users);
});

app.post("/api/users", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { username, email, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)").run(username, email, hashedPassword, role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Invoice Management ---
app.get("/api/invoices", authenticate, (req: any, res) => {
  let query = "SELECT * FROM invoices";
  const params: any[] = [];
  
  if (req.user.role === 'delivery_boy') {
    query += " WHERE (assigned_to = ? OR status = 'pending')";
    params.push(req.user.id);
  }
  
  const invoices = db.prepare(query).all(...params);
  res.json(invoices);
});

app.post("/api/invoices/:id/assign", authenticate, (req: any, res) => {
  const { delivery_boy_id } = req.body;
  db.prepare("UPDATE invoices SET assigned_to = ?, status = 'assigned' WHERE id = ?").run(delivery_boy_id, req.params.id);
  io.emit('invoice_updated', { id: req.params.id, status: 'assigned' });
  res.json({ success: true });
});

app.post("/api/invoices/:id/accept", authenticate, (req: any, res) => {
  db.prepare("UPDATE invoices SET status = 'assigned', assigned_to = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, req.params.id);
  io.emit('invoice_updated', { id: req.params.id, status: 'assigned' });
  res.json({ success: true });
});

app.post("/api/invoices/:id/deliver", authenticate, (req: any, res) => {
  const { cash, cheque, signed_copy_url } = req.body;
  db.prepare(`
    UPDATE invoices 
    SET status = 'delivered', 
        delivered_at = CURRENT_TIMESTAMP, 
        cash_received = ?, 
        cheque_received = ?, 
        signed_copy_url = ? 
    WHERE id = ?
  `).run(cash || 0, cheque || 0, signed_copy_url || "", req.params.id);
  io.emit('invoice_updated', { id: req.params.id, status: 'delivered' });
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
    return res.status(400).json({ error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables." });
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
    db.prepare("REPLACE INTO settings (key, value) VALUES (?, ?)").run('gmail_tokens', JSON.stringify(tokens));
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
  const tokens = db.prepare("SELECT value FROM settings WHERE key = 'gmail_tokens'").get() as any;
  res.json({ connected: !!tokens });
});

// --- Tracking ---
app.post("/api/tracking", authenticate, (req: any, res) => {
  const { lat, lng, status } = req.body;
  db.prepare("INSERT INTO tracking (user_id, latitude, longitude, status) VALUES (?, ?, ?, ?)").run(req.user.id, lat, lng, status);
  io.emit('location_update', { user_id: req.user.id, lat, lng, status, username: req.user.username });
  res.json({ success: true });
});

// --- Dashboard Stats ---
app.get("/api/stats", authenticate, (req: any, res) => {
  const stats = {
    total_today: db.prepare("SELECT COUNT(*) as count FROM invoices WHERE date(created_at) = date('now')").get() as any,
    pending: db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'").get() as any,
    assigned: db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'assigned'").get() as any,
    delivered: db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'delivered'").get() as any,
    cancelled: db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'cancelled'").get() as any,
  };
  res.json(stats);
});

export default app;

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  startServer();
}
