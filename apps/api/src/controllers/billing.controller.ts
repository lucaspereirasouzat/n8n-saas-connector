import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { stripeClient } from "../services/stripe.js";
import { users } from "../store/memory.js";
import type { Plan, User } from "../types/domain.js";

const paidPlans = new Set<Plan>(["starter", "pro"]);

export const stripeWebhook: RequestHandler = (req, res) => {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return res.status(503).json({ error: "Stripe não configurada" });
  }

  try {
    const event = stripeClient().webhooks.constructEvent(
      req.body,
      req.header("stripe-signature") || "",
      env.stripeWebhookSecret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const user = users.get(session.metadata?.userId || "");
      const plan = session.metadata?.plan as Plan | undefined;
      if (user && plan && paidPlans.has(plan)) {
        user.plan = plan;
        user.trialUsed = true;
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      for (const user of users.values()) {
        if (user.stripeCustomerId === subscription.customer) user.plan = "free";
      }
    }

    return res.json({ received: true });
  } catch {
    return res.status(400).json({ error: "Assinatura inválida" });
  }
};

export const createCheckout: RequestHandler = async (req, res) => {
  const plan = String(req.body.plan || "") as Plan;
  const priceId =
    plan === "starter" ? env.stripePrices.starter : env.stripePrices.pro;
  if (!paidPlans.has(plan) || !priceId) {
    return res.status(400).json({ error: "Plano indisponível" });
  }

  try {
    const user: User = res.locals.user;
    const stripe = stripeClient();
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      user.stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(user.trialUsed ? {} : { trial_period_days: 14 }),
        metadata: { userId: user.id, plan },
      },
      metadata: { userId: user.id, plan },
      success_url: `${env.appUrl}/planos?status=sucesso`,
      cancel_url: `${env.appUrl}/planos?status=cancelado`,
      allow_promotion_codes: true,
    });
    return res.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao iniciar checkout";
    return res.status(503).json({ error: message });
  }
};

export const createPortal: RequestHandler = async (_req, res) => {
  const user: User = res.locals.user;
  if (!user.stripeCustomerId) {
    return res.status(400).json({ error: "Assinatura não encontrada" });
  }

  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.appUrl}/planos`,
    });
    return res.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao abrir portal";
    return res.status(503).json({ error: message });
  }
};
