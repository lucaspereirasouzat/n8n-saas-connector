import { Router } from "express";
import {
  createCheckout,
  createPortal,
} from "../controllers/billing.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const billingRouter = Router();
billingRouter.post("/checkout", requireAuth, createCheckout);
billingRouter.post("/portal", requireAuth, createPortal);
