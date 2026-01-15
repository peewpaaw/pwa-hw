import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["type1", "type2"]),
  fio: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
});

export function createRequests({ db }) {
  function attachRoutes(app, { authMiddleware }) {
    app.get("/api/requests", authMiddleware, (req, res) => {
      const rows = db
        .prepare(
          `
            SELECT id, type, phone, fio, address, created_at, accepted_at, push_sent_at
            FROM requests
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 50
          `,
        )
        .all(req.user.id);
      return res.json({ requests: rows });
    });

    app.post("/api/requests", authMiddleware, (req, res) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "bad_request" });

      const now = Date.now();
      const acceptedAt = now + 10_000;

      const { type, fio, address } = parsed.data;
      const phone = req.user.phone;

      const info = db
        .prepare(
          `
            INSERT INTO requests (user_id, type, phone, fio, address, created_at, accepted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(req.user.id, type, phone, fio, address, now, acceptedAt);

      const request = db
        .prepare(
          `
            SELECT id, type, phone, fio, address, created_at, accepted_at, push_sent_at
            FROM requests
            WHERE id = ?
          `,
        )
        .get(info.lastInsertRowid);

      return res.status(201).json({ request });
    });
  }

  return { attachRoutes };
}

