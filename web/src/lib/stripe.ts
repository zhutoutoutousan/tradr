import Stripe from "stripe";

// Lazily construct the Stripe client so the app still builds/runs without a
// secret key configured (the checkout route returns a helpful error instead).
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}
