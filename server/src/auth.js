import jwt from "jsonwebtoken";
import { z } from "zod";

const verifySchema = z.object({
  phone: z.string().min(3).max(32),
  code: z.string().min(1).max(16),
});

export function createAuth({ db, jwtSecret }) {
  function signToken({ userId, phone }) {
    return jwt.sign({ sub: String(userId), phone }, jwtSecret, {
      expiresIn: "30d",
    });
  }

  function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "unauthorized" });

    try {
      const payload = jwt.verify(token, jwtSecret);
      const userId = Number(payload.sub);
      if (!Number.isFinite(userId)) return res.status(401).json({ error: "unauthorized" });
      req.user = { id: userId, phone: payload.phone };
      return next();
    } catch {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  function attachRoutes(app) {
    app.post("/api/auth/verify", (req, res) => {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "bad_request" });

      const { phone, code } = parsed.data;
      if (code !== "1111") return res.status(401).json({ error: "invalid_code" });

      const now = Date.now();
      const insert = db.prepare(
        "INSERT INTO users (phone, created_at) VALUES (?, ?) ON CONFLICT(phone) DO NOTHING",
      );
      insert.run(phone, now);
      const user = db.prepare("SELECT id, phone FROM users WHERE phone = ?").get(phone);
      const token = signToken({ userId: user.id, phone: user.phone });
      return res.json({ token, user: { id: user.id, phone: user.phone } });
    });

    app.get("/api/me", authMiddleware, (req, res) => {
      const user = db.prepare("SELECT id, phone FROM users WHERE id = ?").get(req.user.id);
      if (!user) return res.status(401).json({ error: "unauthorized" });
      return res.json({ user });
    });
  }

  return { authMiddleware, attachRoutes };
}

