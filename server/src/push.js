import webPush from "web-push";
import { z } from "zod";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

function getKv(db, key) {
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setKv(db, key, value) {
  db.prepare("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    key,
    value,
  );
}

export function createPush({ db }) {
  let publicKey = getKv(db, "vapid_public_key");
  let privateKey = getKv(db, "vapid_private_key");

  if (!publicKey || !privateKey) {
    const keys = webPush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    setKv(db, "vapid_public_key", publicKey);
    setKv(db, "vapid_private_key", privateKey);
  }

  webPush.setVapidDetails("mailto:demo@local", publicKey, privateKey);

  async function sendToSubscription(subscription, payloadJson) {
    return webPush.sendNotification(subscription, payloadJson);
  }

  function attachRoutes(app, { authMiddleware }) {
    app.get("/api/push/vapidPublicKey", (req, res) => {
      return res.json({ publicKey });
    });

    app.post("/api/push/subscribe", authMiddleware, (req, res) => {
      const parsed = subscriptionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "bad_request" });
      const sub = parsed.data;

      const now = Date.now();
      db.prepare(
        `
          INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, subscription_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, endpoint) DO UPDATE SET
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            subscription_json = excluded.subscription_json,
            updated_at = excluded.updated_at
        `,
      ).run(req.user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, JSON.stringify(sub), now);

      return res.json({ ok: true });
    });

    app.post("/api/push/unsubscribe", authMiddleware, (req, res) => {
      const parsed = z
        .object({ endpoint: z.string().url() })
        .safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "bad_request" });
      db.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?").run(
        req.user.id,
        parsed.data.endpoint,
      );
      return res.json({ ok: true });
    });
  }

  return { publicKey, attachRoutes, sendToSubscription };
}

