import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { openDb } from "./src/db.js";
import { createAuth } from "./src/auth.js";
import { createPush } from "./src/push.js";
import { createRequests } from "./src/requests.js";
import { startPushWorker } from "./src/worker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, "public");
const INDEX_HTML = path.join(PUBLIC_DIR, "index.html");

const db = openDb({ dataDir: DATA_DIR });
const auth = createAuth({ db, jwtSecret: JWT_SECRET });
const push = createPush({ db });
const requests = createRequests({ db });

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

auth.attachRoutes(app);
push.attachRoutes(app, { authMiddleware: auth.authMiddleware });
requests.attachRoutes(app, { authMiddleware: auth.authMiddleware });

// health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// static (built client)
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      etag: true,
      maxAge: "1h",
    }),
  );
}

// SPA fallback
const sendIndexHtml = (req, res) => {
  if (!fs.existsSync(INDEX_HTML)) {
    return res
      .status(500)
      .type("text/plain")
      .send("Client is not built. PUBLIC_DIR/index.html is missing.");
  }
  return res.sendFile(INDEX_HTML);
};

app.get("/", sendIndexHtml);
app.get(/^\/app(\/.*)?$/, sendIndexHtml);

startPushWorker({ db, push });

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`app listening on :${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`DATA_DIR=${DATA_DIR}`);
});

