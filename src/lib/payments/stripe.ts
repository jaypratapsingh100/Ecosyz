import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe not configured. Set STRIPE_SECRET_KEY.');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });
  }
  return _stripe;
}

const PLAN_PRICES: Record<string, { amount: number; currency: string }> = {
  plus: { amount: 999, currency: 'inr' },
};

export async function createCheckoutSession(
  plan: string,
  userId: string,
  email: string,
  successUrl: string,
  cancelUrl: string,
  stripeCustomerId?: string | null
) {
  const priceConfig = PLAN_PRICES[plan.toLowerCase()];
  if (!priceConfig) throw new Error(`Invalid plan: ${plan}`);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: stripeCustomerId ? undefined : email,
    customer: stripeCustomerId || undefined,
    line_items: [
      {
        price_data: {
          currency: priceConfig.currency,
          product_data: {
            name: `Open Idea ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            description: 'Monthly subscription',
          },
          unit_amount: priceConfig.amount * 100, // Convert to smallest currency unit
        },
        quantity: 1,
      },
    ],
    metadata: { userId, plan },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  return getStripe().checkout.sessions.create(sessionParams);
}
