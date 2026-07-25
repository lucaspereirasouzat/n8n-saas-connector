import type { RequestHandler } from "express";
import type { Theme, User } from "../types/domain.js";
import { publicUser } from "../utils/public-user.js";

const themes = new Set<Theme>(["light", "dark", "system"]);
const safePhoto = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export const updateProfile: RequestHandler = (req, res) => {
  const user: User = res.locals.user;
  const name = String(req.body.name || "").trim();
  const photo = String(req.body.photo || "");
  const theme = String(req.body.theme || "") as Theme;

  if (
    name.length < 2 ||
    photo.length > 500_000 ||
    (photo !== "" && !safePhoto.test(photo)) ||
    !themes.has(theme)
  ) {
    return res.status(400).json({ error: "Perfil inválido" });
  }

  user.name = name;
  user.photo = photo;
  user.theme = theme;
  return res.json({ user: publicUser(user) });
};
