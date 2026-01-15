export function startPushWorker({ db, push, intervalMs = 1000, logger = console }) {
  let stopped = false;

  async function tick() {
    if (stopped) return;
    const now = Date.now();

    const due = db
      .prepare(
        `
          SELECT id, user_id, type, accepted_at
          FROM requests
          WHERE push_sent_at IS NULL AND accepted_at <= ?
          ORDER BY accepted_at ASC
          LIMIT 20
        `,
      )
      .all(now);

    for (const reqRow of due) {
      const subs = db
        .prepare("SELECT id, subscription_json FROM push_subscriptions WHERE user_id = ? ORDER BY updated_at DESC")
        .all(reqRow.user_id);

      const payload = JSON.stringify({
        title: "Заявка принята",
        body: reqRow.type === "type1" ? "Тип заявки 1 принята" : "Тип заявки 2 принята",
        url: "/app",
        requestId: reqRow.id,
      });

      for (const subRow of subs) {
        let subscription;
        try {
          subscription = JSON.parse(subRow.subscription_json);
        } catch {
          db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(subRow.id);
          continue;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          await push.sendToSubscription(subscription, payload);
        } catch (err) {
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(subRow.id);
          } else {
            const body = err?.body || err?.message || String(err);
            logger.warn?.("push send failed", {
              requestId: reqRow.id,
              statusCode,
              err: body,
            });
          }
        }
      }

      db.prepare("UPDATE requests SET push_sent_at = ? WHERE id = ?").run(now, reqRow.id);
    }
  }

  const timer = setInterval(() => {
    tick().catch((err) => logger.error?.("worker tick failed", err));
  }, intervalMs);
  timer.unref?.();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

