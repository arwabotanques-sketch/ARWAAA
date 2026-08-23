import { apiFetch } from "./client";

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  discount: number;
  maxUses: number | null;
  uses: number;
  expiry: string | null;
  status: "active" | "draft" | "inactive";
}

function mapCoupon(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    discount: Number(c.discount),
    maxUses: c.max_uses !== null && c.max_uses !== undefined ? Number(c.max_uses) : null,
    uses: Number(c.uses),
    expiry: c.expiry || null,
    status: c.status,
  };
}

// ==========================================
// ADMIN — full CRUD
// ==========================================
export async function fetchCoupons(): Promise<Coupon[]> {
  const data = await apiFetch("/coupons");
  return data.coupons.map(mapCoupon);
}

export interface CouponInput {
  code: string;
  type: "percent" | "fixed";
  discount: number;
  maxUses: number | null;
  expiry: string | null;
  status: "active" | "draft" | "inactive";
}

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  const data = await apiFetch("/coupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return mapCoupon(data.coupon);
}

export async function updateCoupon(id: string, input: CouponInput): Promise<Coupon> {
  const data = await apiFetch(`/coupons/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return mapCoupon(data.coupon);
}

export async function deleteCoupon(id: string): Promise<void> {
  await apiFetch(`/coupons/${id}`, { method: "DELETE" });
}

// ==========================================
// PUBLIC — Cart/Checkout validate a code
// ==========================================
export interface ValidatedCoupon {
  code: string;
  type: "percent" | "fixed";
  discount: number;
}

// Throws (via apiFetch) with a real backend message ("Invalid coupon code",
// "This coupon has expired", etc.) if the code isn't valid right now — callers
// should catch and show err.message rather than a generic "Invalid coupon code".
export async function validateCouponCode(code: string): Promise<ValidatedCoupon> {
  const data = await apiFetch(`/coupons/validate/${encodeURIComponent(code)}`);
  return data.coupon;
}
