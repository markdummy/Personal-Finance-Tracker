// Shared database helpers for Vercel serverless functions.
// Uses @vercel/postgres (Neon Postgres) when POSTGRES_URL is set.

const { sql } = require("@vercel/postgres");
const crypto = require("crypto");

// Cache the init promise so tables are only created once per cold start.
// Reset on failure so the next request can retry (e.g., transient DB error).
let _initPromise = null;

async function initDb() {
  if (!_initPromise) {
    _initPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id            TEXT PRIMARY KEY,
          username      TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at    TEXT NOT NULL,
          auth_token    TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS finance_data (
          user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          data       TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `;
    })().catch((err) => {
      _initPromise = null; // allow retry on the next request
      throw err;
    });
  }
  return _initPromise;
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Returns the authenticated user object, or null if the token is invalid.
async function getAuthUser(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { rows } = await sql`
    SELECT id, username FROM users WHERE auth_token = ${token}
  `;
  return rows[0] || null;
}

module.exports = { initDb, generateToken, getAuthUser, sql };
