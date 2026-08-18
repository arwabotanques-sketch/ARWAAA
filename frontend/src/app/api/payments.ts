import { apiFetch } from "./client";

// Asks the backend to open a Stripe Checkout Session for an already-created
// (pending) order, and returns the URL to redirect the customer to.
export async function createStripeCheckoutSession(orderId: string): Promise<string> {
  const data = await apiFetch("/payments/stripe/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
  return data.url;
}

export interface GatewayCheckoutSession {
  url: string;
  fields: Record<string, string>;
}

// JazzCash and Easypaisa are form-POST (Page Post) hosted checkouts, not simple
// redirects — the backend returns the gateway URL plus the full set of signed hidden
// form fields, and the frontend auto-submits a real <form> to that URL (see
// autoPostRedirect in Checkout.tsx).
export async function createJazzCashCheckout(orderId: string): Promise<GatewayCheckoutSession> {
  return apiFetch("/payments/jazzcash/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
}

export async function createEasypaisaCheckout(orderId: string): Promise<GatewayCheckoutSession> {
  return apiFetch("/payments/easypaisa/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
}

// Uploads a JazzCash/Easypaisa payment screenshot + the reference/transaction ID
// the customer typed in, right after the order is created.
export async function submitPaymentProof(orderId: string, file: File, reference: string): Promise<void> {
  const fd = new FormData();
  fd.append("proof", file);
  fd.append("reference", reference);
  await apiFetch(`/orders/${orderId}/payment-proof`, { method: "POST", body: fd });
}

export interface PaymentGatewayConfig {
  stripe: boolean;
  jazzcash: boolean;
  easypaisa: boolean;
  cod: boolean;
}

// Lets the checkout page grey out a payment method the merchant hasn't finished
// onboarding yet, instead of letting the customer pick it and hit a broken/silent
// failure at "Proceed to Payment".
export async function fetchPaymentConfig(): Promise<PaymentGatewayConfig> {
  const data = await apiFetch("/payments/config");
  return data.gateways;
}
