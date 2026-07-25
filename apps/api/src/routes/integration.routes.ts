import { Router } from "express";
import {
  createIntegration,
  dashboard,
  updateIntegration,
} from "../controllers/integration.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const integrationRouter = Router();
integrationRouter.get("/dashboard", requireAuth, dashboard);
integrationRouter.post("/integrations", requireAuth, createIntegration);
integrationRouter.patch("/integrations/:id", requireAuth, updateIntegration);
