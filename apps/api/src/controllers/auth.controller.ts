import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { createSession } from "../middleware/auth.js";
import { integrations, resetTokens, sessions, users } from "../store/memory.js";
import type { User } from "../types/domain.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { publicUser } from "../utils/public-user.js";

export const register: RequestHandler = (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Confira nome, e-mail e senha (mínimo 8 caracteres)." });
  }
  if ([...users.values()].some((user) => user.email === email)) {
    return res.status(409).json({ error: "E-mail já cadastrado." });
  }

  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    password: hashPassword(password),
    photo: "",
    theme: "system",
    plan: "free",
    trialUsed: false,
  };
  users.set(user.id, user);
  integrations.set(user.id, []);
  createSession(res, user.id);
  return res.status(201).json({ user: publicUser(user) });
};

export const login: RequestHandler = (req, res) => {
  const email = String(req.body.email || "").toLowerCase();
  const password = String(req.body.password || "");
  const user = [...users.values()].find(
    (candidate) => candidate.email === email,
  );

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }

  createSession(res, user.id);
  return res.json({ user: publicUser(user) });
};

export const logout: RequestHandler = (req, res) => {
  sessions.delete(req.cookies.flowly_session);
  res.clearCookie("flowly_session", { path: "/" });
  res.status(204).end();
};

export const me: RequestHandler = (_req, res) => {
  res.json({ user: publicUser(res.locals.user) });
};

export const forgotPassword: RequestHandler = (req, res) => {
  const email = String(req.body.email || "").toLowerCase();
  const user = [...users.values()].find(
    (candidate) => candidate.email === email,
  );

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
      userId: user.id,
      expires: Date.now() + 3_600_000,
    });
    if (!env.production)
      console.info(`[dev] reset: ${env.appUrl}/redefinir-senha?token=${token}`);
  }

  res.json({
    message: "Se o e-mail estiver cadastrado, enviaremos as instruções.",
  });
};
