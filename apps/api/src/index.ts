import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import auth from "./routes/auth.js";
import canvases from "./routes/canvases.js";
import folders from "./routes/folders.js";
import pages from "./routes/pages.js";
import stats from "./routes/stats.js";

const app = new Hono();
const allowedOrigins = (
  process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(logger());
app.use(prettyJSON());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.route("/auth", auth);
app.route("/canvases", canvases);
app.route("/folders", folders);
app.route("/pages", pages);
app.route("/stats", stats);

app.get("/health", (c) => c.json({ status: "Ok" }));

app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

export default {
  port: Number(process.env.PORT) || 4001,
  fetch: app.fetch,
};
