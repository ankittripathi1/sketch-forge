import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { env } from "./lib/env.js";
import { requestLogger } from "./lib/logging.js";
import { originGuard } from "./middleware/originGuard.js";
import auth from "./routes/auth.js";
import canvases from "./routes/canvases.js";
import folders from "./routes/folders.js";
import pages from "./routes/pages.js";
import stats from "./routes/stats.js";

const app = new Hono();

app.use(requestLogger);
app.use(prettyJSON());

// In production the web app and this API share PUBLIC_ORIGIN, so these requests
// are same-origin and never preflighted. The header still matters in local
// development, where the Next dev server runs on its own port.
app.use(
  cors({
    origin: env.PUBLIC_ORIGIN,
    credentials: true,
  }),
);

app.use(originGuard);

app.route("/auth", auth);
app.route("/canvases", canvases);
app.route("/folders", folders);
app.route("/pages", pages);
app.route("/stats", stats);

app.get("/health", (c) => c.json({ status: "Ok" }));

app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

export default {
  port: env.PORT,
  fetch: app.fetch,
};
