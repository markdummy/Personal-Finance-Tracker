// POST /api/auth/logout
const { initDb, getAuthUser, sql } = require("../_db");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  await initDb();

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  await sql`UPDATE users SET auth_token = NULL WHERE id = ${user.id}`;
  return res.json({ success: true });
};
