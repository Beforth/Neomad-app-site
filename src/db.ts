import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const db = new Database('delivery_system.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'manager', 'delivery_boy')),
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE,
    hospital_name TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'delivered', 'cancelled')),
    gmail_message_id TEXT,
    pdf_url TEXT,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME,
    delivered_at DATETIME,
    cancelled_at DATETIME,
    delivery_duration INTEGER, -- in seconds
    waiting_duration INTEGER DEFAULT 0, -- in seconds
    cash_received REAL DEFAULT 0,
    cheque_received REAL DEFAULT 0,
    payment_confirmed_at DATETIME,
    signed_copy_url TEXT,
    FOREIGN KEY(assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    latitude REAL,
    longitude REAL,
    status TEXT, -- 'moving', 'waiting', 'at_location'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    is_available BOOLEAN,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed admin user if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
    'admin',
    'admin@example.com',
    hashedPassword,
    'admin'
  );
}

// Seed sample delivery boy
const boyExists = db.prepare('SELECT id FROM users WHERE username = ?').get('delivery1');
if (!boyExists) {
  const hashedPassword = bcrypt.hashSync('boy123', 10);
  db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
    'delivery1',
    'boy1@example.com',
    hashedPassword,
    'delivery_boy'
  );
}

// Seed sample invoices
const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as any;
if (invoiceCount.count === 0) {
  const hospitals = ['City Hospital', 'Metro Clinic', 'St. Mary Medical', 'Apollo Health', 'LifeCare Center'];
  for (let i = 1; i <= 10; i++) {
    db.prepare('INSERT INTO invoices (invoice_number, hospital_name, amount, status) VALUES (?, ?, ?, ?)').run(
      `INV-2024-${String(i).padStart(3, '0')}`,
      hospitals[Math.floor(Math.random() * hospitals.length)],
      Math.floor(Math.random() * 10000) + 500,
      i <= 3 ? 'pending' : (i <= 6 ? 'assigned' : 'delivered')
    );
  }
}

export default db;
