// POST /api/auth/login
const bcrypt = require("bcryptjs");
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

  const { rows } = await sql`
    SELECT id, username, password_hash, created_at FROM users WHERE username = ${username}
  `;
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid username or password." });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ success: false, message: "Invalid username or password." });
  }

  const token = generateToken();
  await sql`UPDATE users SET auth_token = ${token} WHERE id = ${user.id}`;

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
};
