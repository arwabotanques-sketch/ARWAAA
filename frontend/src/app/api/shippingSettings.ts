import { apiFetch } from "./client";

export interface ShippingSettings {
  rate: number;
  minFree: number | null;
  days: string;
}

// Public — Cart/Checkout read the current rate
export async function fetchShippingSettings(): Promise<ShippingSettings> {
  const data = await apiFetch("/shipping-settings");
  return data.settings;
}

// Admin only — update the rate
export async function updateShippingSettings(input: ShippingSettings): Promise<ShippingSettings> {
  const data = await apiFetch("/shipping-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.settings;
}
