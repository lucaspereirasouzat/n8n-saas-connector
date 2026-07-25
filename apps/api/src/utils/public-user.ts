import type { User } from "../types/domain.js";

export function publicUser(user: User) {
  const { id, name, email, photo, theme, plan } = user;
  return { id, name, email, photo, theme, plan };
}
