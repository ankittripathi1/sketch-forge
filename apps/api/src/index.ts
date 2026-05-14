import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import auth from "./routes/auth.js";
import canvases from "./routes/canvases.js";

const app = new Hono();

app.use(logger());
app.use(prettyJSON());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.route("/auth", auth);
app.route("/canvases", canvases);

app.get("/health", (c) => c.json({ status: "Ok" }));

app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

export default {
  port: 4001,
  fetch: app.fetch,
};
