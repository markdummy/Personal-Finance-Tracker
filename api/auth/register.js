// POST /api/auth/register
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { initDb, generateToken, sql } = require("../_db");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  await initDb();

  const username = ((req.body && req.body.username) || "").trim().toLowerCase();
  const password = (req.body && req.body.password) || "";

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }
  if (username.length < 3) {
    return res.status(400).json({ success: false, message: "Username must be at least 3 characters." });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  const { rows: existing } = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (existing.length > 0) {
    return res.status(409).json({ success: false, message: "Username already taken." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const token = generateToken();

  await sql`
    INSERT INTO users (id, username, password_hash, created_at, auth_token)
    VALUES (${id}, ${username}, ${passwordHash}, ${createdAt}, ${token})
  `;

  console.log("✅ USER REGISTERED:", username);
  return res.status(201).json({
    success: true,
    user: { id, username, createdAt },
    token,
  });
};
