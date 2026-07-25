import crypto from "node:crypto";

export function hashPassword(
  password: string,
  salt = crypto.randomBytes(16).toString("hex"),
) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;

  const storedKey = Buffer.from(key, "hex");
  const suppliedKey = crypto.scryptSync(password, salt, 64);
  return (
    storedKey.length === suppliedKey.length &&
    crypto.timingSafeEqual(storedKey, suppliedKey)
  );
}
