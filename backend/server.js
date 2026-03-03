// BACKEND SERVER — Personal Finance Tracker
// Handles user registration and login with SQLite + bcrypt.
// Run: node server.js  (from the backend/ directory)

const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "users.db");

// ── DATABASE SETUP ────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    auth_token  TEXT
  )
`);

// Add auth_token column to existing databases that pre-date this migration.
try {
  db.exec("ALTER TABLE users ADD COLUMN auth_token TEXT");
} catch (e) {
  if (!e.message.includes("duplicate column name")) throw e;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS finance_data (
    user_id    TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// ── PREPARED STATEMENTS ───────────────────────────────────────────────────────
// Prepared once at startup and reused on every request for best performance.
const stmts = {
  getUserByToken:  db.prepare("SELECT id, username FROM users WHERE auth_token = ?"),
  getUserById:     db.prepare("SELECT id FROM users WHERE username = ?"),
  getUserForLogin: db.prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?"),
  insertUser:      db.prepare("INSERT INTO users (id, username, password_hash, created_at, auth_token) VALUES (?, ?, ?, ?, ?)"),
  updateToken:     db.prepare("UPDATE users SET auth_token = ? WHERE id = ?"),
  clearToken:      db.prepare("UPDATE users SET auth_token = NULL WHERE id = ?"),
  getFinanceData:  db.prepare("SELECT data FROM finance_data WHERE user_id = ?"),
  upsertFinanceData: db.prepare("INSERT OR REPLACE INTO finance_data (user_id, data, updated_at) VALUES (?, ?, ?)"),
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Middleware: validate Bearer token and attach req.user.
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  const token = authHeader.slice(7);
  const user = stmts.getUserByToken.get(token);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
  req.user = user;
  next();
}

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
// When CORS_ORIGIN is not set the server defaults to localhost only.
// Set CORS_ORIGIN=* (or to your server's public address) when you need
// cross-origin access from a different host or mobile device.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Serve the frontend from the project root
app.use(express.static(path.join(__dirname, "..")));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const dataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,                  // max 60 data requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// ── ROUTES ────────────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const username = ((req.body && req.body.username) || "").trim().toLowerCase();
  const password = (req.body && req.body.password) || "";

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password are required." });
  }
  if (username.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Username must be at least 3 characters.",
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters.",
    });
  }

  const existing = stmts.getUserById.get(username);
  if (existing) {
    return res
      .status(409)
      .json({ success: false, message: "Username already taken." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id =
    Date.now().toString(36) + Math.random().toString(36).substring(2);
  const createdAt = new Date().toISOString();
  const token = generateToken();

  stmts.insertUser.run(id, username, passwordHash, createdAt, token);

  console.log("✅ USER REGISTERED:", username);
  return res.status(201).json({
    success: true,
    user: { id, username, createdAt },
    token,
  });
});

// POST /api/auth/login
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const username = ((req.body && req.body.username) || "").trim().toLowerCase();
  const password = (req.body && req.body.password) || "";

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password are required." });
  }

  const user = stmts.getUserForLogin.get(username);

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid username or password." });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid username or password." });
  }

  const token = generateToken();
  stmts.updateToken.run(token, user.id);

  console.log("✅ USER LOGGED IN:", username);
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
    },
    token,
  });
});

// POST /api/auth/logout  — invalidate the auth token
app.post("/api/auth/logout", authLimiter, requireAuth, (req, res) => {
  stmts.clearToken.run(req.user.id);
  res.json({ success: true });
});

// ── FINANCE DATA ROUTES ───────────────────────────────────────────────────────

// GET /api/data — retrieve the current user's finance data
app.get("/api/data", dataLimiter, requireAuth, (req, res) => {
  const row = stmts.getFinanceData.get(req.user.id);
  if (!row) return res.json({ success: true, data: null });
  try {
    return res.json({ success: true, data: JSON.parse(row.data) });
  } catch {
    return res.json({ success: true, data: null });
  }
});

// POST /api/data — save/replace the current user's finance data
app.post("/api/data", dataLimiter, requireAuth, (req, res) => {
  const data = req.body && req.body.data;
  if (!data) {
    return res.status(400).json({ success: false, message: "No data provided." });
  }
  const updatedAt = new Date().toISOString();
  stmts.upsertFinanceData.run(req.user.id, JSON.stringify(data), updatedAt);
  return res.json({ success: true });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Finance Tracker backend running on http://localhost:${PORT}`);
  console.log(`   DB: ${DB_PATH}`);
});
