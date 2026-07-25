import type { RequestHandler } from "express";
import { env } from "../config/env.js";

export const verifyOrigin: RequestHandler = (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.header("origin");
    if (origin && origin !== env.appUrl) {
      return res.status(403).json({ error: "Origem não permitida" });
    }
  }

  res.setHeader("Cache-Control", "no-store");
  next();
};
