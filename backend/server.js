// BACKEND SERVER — Personal Finance Tracker
// Handles user registration and login with SQLite + bcrypt.
// Run: node server.js  (from the backend/ directory)

const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
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
    created_at  TEXT NOT NULL
  )
`);

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
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

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) {
    return res
      .status(409)
      .json({ success: false, message: "Username already taken." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id =
    Date.now().toString(36) + Math.random().toString(36).substring(2);
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
  ).run(id, username, passwordHash, createdAt);

  console.log("✅ USER REGISTERED:", username);
  return res.status(201).json({
    success: true,
    user: { id, username, createdAt },
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

  const user = db
    .prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
    .get(username);

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

  console.log("✅ USER LOGGED IN:", username);
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
    },
  });
});

// POST /api/auth/logout  (client-side sessions — just an acknowledgement)
app.post("/api/auth/logout", (_req, res) => {
  res.json({ success: true });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Finance Tracker backend running on http://localhost:${PORT}`);
  console.log(`   DB: ${DB_PATH}`);
});
