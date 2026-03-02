// Shared database helpers for Vercel serverless functions.
// Uses @neondatabase/serverless (Neon Postgres HTTP driver).
// Reads DATABASE_URL (set by the Vercel Neon integration) or the legacy POSTGRES_URL.

const { neon } = require("@neondatabase/serverless");
const crypto = require("crypto");

// Lazily create the Neon SQL function so the module can be imported even when
// the environment variable is not yet set (e.g. during local testing without a DB).
let _neonSql = null;
function _getSql() {
  if (!_neonSql) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error(
        "Database not configured: set DATABASE_URL (or POSTGRES_URL) environment variable."
      );
    }
    _neonSql = neon(connectionString);
  }
  return _neonSql;
}

// Tagged-template wrapper that returns { rows } — matching the @vercel/postgres
// shape expected by the rest of the codebase, so other files need no changes.
// Using async ensures errors from _getSql() are always returned as rejected Promises.
const sql = async (strings, ...values) => {
  const rows = await _getSql()(strings, ...values);
  return { rows };
};

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
