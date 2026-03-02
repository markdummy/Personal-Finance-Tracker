// GET  /api/data  — retrieve the current user's finance data
// POST /api/data  — save/replace the current user's finance data
const { initDb, getAuthUser, sql } = require("./_db");

module.exports = async (req, res) => {
  await initDb();

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (req.method === "GET") {
    const { rows } = await sql`SELECT data FROM finance_data WHERE user_id = ${user.id}`;
    if (!rows[0]) return res.json({ success: true, data: null });
    try {
      return res.json({ success: true, data: JSON.parse(rows[0].data) });
    } catch {
      return res.json({ success: true, data: null });
    }
  }

  if (req.method === "POST") {
    const data = req.body && req.body.data;
    if (!data) {
      return res.status(400).json({ success: false, message: "No data provided." });
    }
    const serialized = JSON.stringify(data);
    if (serialized.length > 1_000_000) {
      return res.status(413).json({ success: false, message: "Data exceeds the 1 MB limit." });
    }
    const updatedAt = new Date().toISOString();
    await sql`
      INSERT INTO finance_data (user_id, data, updated_at)
      VALUES (${user.id}, ${serialized}, ${updatedAt})
      ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    `;
    return res.json({ success: true });
  }

  return res.status(405).json({ success: false, message: "Method not allowed." });
};
