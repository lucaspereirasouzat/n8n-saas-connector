import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { stripeWebhook } from "./controllers/billing.controller.js";
import { verifyOrigin } from "./middleware/security.js";
import { authRouter } from "./routes/auth.routes.js";
import { billingRouter } from "./routes/billing.routes.js";
import { integrationRouter } from "./routes/integration.routes.js";
import { profileRouter } from "./routes/profile.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", verifyOrigin);
app.use("/api/auth", authRouter);
app.use("/api/billing", billingRouter);
app.use("/api/profile", profileRouter);
app.use("/api", integrationRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
