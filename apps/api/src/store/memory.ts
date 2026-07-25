import type { Integration, Session, User } from "../types/domain.js";
import { hashPassword } from "../utils/password.js";

export const users = new Map<string, User>();
export const sessions = new Map<string, Session>();
export const integrations = new Map<string, Integration[]>();
export const resetTokens = new Map<
  string,
  { userId: string; expires: number }
>();

const demoUser: User = {
  id: "demo-user",
  name: "Marina Costa",
  email: "marina@empresa.com",
  password: hashPassword("Demo123!"),
  photo: "",
  theme: "system",
  plan: "free",
  trialUsed: false,
};

users.set(demoUser.id, demoUser);
integrations.set(demoUser.id, [
  {
    id: "wa-1",
    provider: "whatsapp",
    name: "Atendimento WhatsApp",
    active: true,
    workflowId: "demo-1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "gm-1",
    provider: "gmail",
    name: "Triagem de e-mails",
    active: true,
    workflowId: "demo-2",
    createdAt: new Date().toISOString(),
  },
]);
