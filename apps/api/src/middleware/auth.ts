import crypto from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { env } from "../config/env.js";
import { sessions, users } from "../store/memory.js";

export function currentUser(req: Request) {
  const sessionId = req.cookies.flowly_session;
  const session = sessions.get(sessionId);

  if (!session || session.expires < Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    return undefined;
  }

  return users.get(session.userId);
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Não autenticado" });

  res.locals.user = user;
  next();
};

export function createSession(res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  sessions.set(token, { userId, expires: Date.now() + 7 * 86_400_000 });
  res.cookie("flowly_session", token, {
    httpOnly: true,
    secure: env.production,
    sameSite: "lax",
    maxAge: 7 * 86_400_000,
    path: "/",
  });
}
