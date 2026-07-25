export type Theme = "light" | "dark" | "system";
export type Plan = "free" | "starter" | "pro";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  photo: string;
  theme: Theme;
  stripeCustomerId?: string;
  plan: Plan;
  trialUsed: boolean;
}

export interface Integration {
  id: string;
  provider: string;
  name: string;
  active: boolean;
  workflowId?: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  expires: number;
}
