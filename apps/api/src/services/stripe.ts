import Stripe from "stripe";
import { env } from "../config/env.js";

export function stripeClient() {
  if (!env.stripeSecretKey) throw new Error("Stripe não configurada");
  return new Stripe(env.stripeSecretKey);
}
