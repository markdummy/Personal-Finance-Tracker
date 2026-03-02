const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const Database = require("better-sqlite3");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET is not set. A random secret will be generated, which " +
    "means all sessions will be invalidated on server restart. " +
    "Set the JWT_SECRET environment variable for persistent sessions."
  );
}
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_EXPIRES_IN = "7d";
const BCRYPT_SALT_ROUNDS = 12;

// Ensure db directory exists
const DB_DIR = path.join(__dirname, "db");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

// SQLite setup
const db = new Database(path.join(DB_DIR, "finance.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
// Serve all static frontend files from the project root
app.use(express.static(path.join(__dirname)));

// ── Helper ──────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
  req.user = payload;
  next();
}

// ── API Routes ───────────────────────────────────────────────────────────────

// Rate limiter for auth endpoints: max 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// POST /api/auth/register
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || typeof username !== "string" ||
      !password || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 3) {
    return res.status(400).json({ success: false, message: "Username must be at least 3 characters." });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  try {
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(trimmed);
    if (existing) {
      return res.status(409).json({ success: false, message: "Username already taken." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const info = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(trimmed, passwordHash);

    const token = signToken({ id: info.lastInsertRowid, username: trimmed });
    return res.status(201).json({ success: true, token, username: trimmed });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || typeof username !== "string" ||
      !password || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  const trimmed = username.trim().toLowerCase();

  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(trimmed);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const token = signToken({ id: user.id, username: user.username });
    return res.json({ success: true, token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// GET /api/auth/me  — verify token and return current user info
app.get("/api/auth/me", authLimiter, requireAuth, (req, res) => {
  res.json({ success: true, username: req.user.username });
});

// ── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Finance Tracker server running on http://localhost:${PORT}`);
});
