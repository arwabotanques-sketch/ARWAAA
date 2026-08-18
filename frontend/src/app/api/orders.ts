import { apiFetch } from "./client";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderTimelineEntry {
  id: string;
  status: string;
  note: string;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  payment: string;
  paymentStatus: string;
  paymentProofUrl: string | null;
  paymentReference: string | null;
  status: string;
  items: number;
  total: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  trackingNumber: string | null;
  courier: string | null;
  adminNote: string;
  date: string;
  createdAt: string;
}

function mapOrder(o: any): AdminOrder {
  return {
    id: o.id,
    orderNumber: o.order_number,
    customer: o.customer_name,
    email: o.customer_email,
    phone: o.customer_phone,
    address: o.shipping_address,
    city: o.shipping_city,
    province: o.shipping_province,
    payment: o.payment_method,
    paymentStatus: o.payment_status,
    paymentProofUrl: o.payment_proof_url || null,
    paymentReference: o.payment_reference || null,
    status: o.order_status,
    // getOrders() joins item_count; getOrderById() doesn't include it on the order
    // row itself (items come back as a separate array there) — default to 0 rather
    // than NaN/undefined so `${detail.items} item(s)` never renders garbage.
    items: o.item_count != null ? Number(o.item_count) : 0,
    total: Number(o.total),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    shippingFee: Number(o.shipping_fee),
    trackingNumber: o.tracking_number || null,
    courier: o.courier || null,
    adminNote: o.notes || "",
    date: new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    createdAt: o.created_at,
  };
}

function mapItem(i: any): OrderItem {
  return {
    id: i.id,
    productId: i.product_id,
    productName: i.product_name,
    productImage: i.product_image || null,
    price: Number(i.price),
    quantity: i.quantity,
    subtotal: Number(i.subtotal),
  };
}

function mapTimeline(t: any): OrderTimelineEntry {
  return {
    id: t.id,
    status: t.status,
    note: t.note,
    createdAt: t.created_at,
  };
}

// ==========================================
// ADMIN — GET ALL ORDERS
// ==========================================
export async function fetchOrders(): Promise<AdminOrder[]> {
  const data = await apiFetch("/orders");
  return data.orders.map(mapOrder);
}

// ==========================================
// ADMIN — GET SINGLE ORDER (items + timeline)
// ==========================================
export async function fetchOrderDetail(
  id: string
): Promise<{ order: AdminOrder; items: OrderItem[]; timeline: OrderTimelineEntry[] }> {
  const data = await apiFetch(`/orders/${id}`);
  return {
    order: mapOrder(data.order),
    items: data.items.map(mapItem),
    timeline: data.timeline.map(mapTimeline),
  };
}

// ==========================================
// ADMIN — UPDATE ORDER STATUS
// ==========================================
export async function updateOrderStatus(id: string, status: string): Promise<AdminOrder> {
  const data = await apiFetch(`/orders/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_status: status }),
  });
  return mapOrder(data.order);
}

// ==========================================
// ADMIN — UPDATE ORDER NOTES
// ==========================================
export async function updateOrderNotes(id: string, notes: string): Promise<AdminOrder> {
  const data = await apiFetch(`/orders/${id}/notes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return mapOrder(data.order);
}

// ==========================================
// ADMIN — APPROVE/REJECT MANUAL JAZZCASH/EASYPAISA PAYMENT
// ==========================================
// The backend's PUT /orders/:id/verify-payment only returns {success, message},
// not the order itself — so after calling it, we re-fetch the order to hand
// Admin.tsx back a real, fully-updated AdminOrder (same shape updateOrderStatus/
// updateOrderNotes return), keeping its setOrders/setDetail(updated) pattern intact.
export async function verifyManualPayment(id: string, approve: boolean): Promise<AdminOrder> {
  await apiFetch(`/orders/${id}/verify-payment`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approve }),
  });
  const { order } = await fetchOrderDetail(id);
  return order;
}
