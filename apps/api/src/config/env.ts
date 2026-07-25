export const env = {
  port: Number(process.env.PORT || 3001),
  appUrl: process.env.APP_URL || "http://localhost:5173",
  production: process.env.NODE_ENV === "production",
  sessionSecret: process.env.SESSION_SECRET,
  n8nBaseUrl: process.env.N8N_BASE_URL,
  n8nApiKey: process.env.N8N_API_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePrices: {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
  },
} as const;

export function validateEnvironment() {
  if (env.production && (!env.sessionSecret || env.sessionSecret.length < 32)) {
    throw new Error("SESSION_SECRET segura é obrigatória em produção");
  }
}
