import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  me,
  register,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, me);
authRouter.post("/forgot", forgotPassword);
