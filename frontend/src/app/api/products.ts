import { fetchAllRatingSummaries } from "./reviews";
import { apiFetch } from "./client";
import type { Product, IngredientItem } from "../data";

// Shape your database actually returns (snake_case, boolean status, etc.)
export interface BackendProduct {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  slug: string;
  subtitle: string | null;
  sku: string | null;
  description: string | null;
  weight: string | null;
  price: string | number;
  old_price: string | number | null;
  discount: number | null;
  stock: number;
  sold: number;
  tags: string[] | null;
  featured: boolean;
  status: boolean;             // true = active, false = draft
  image_url: string | null;
  image_public_id: string | null;
  image_url_2?: string | null;
  image_url_3?: string | null;
  video_url?: string | null;
  // Present in the DB row (SELECT p.*) but not previously surfaced here —
  // needed for the customer-facing storefront mapper below.
  ingredients?: string | null;
  benefits?: string | null;
  brand?: string | null;
  sale_price?: string | number | null;
  created_at?: string;
}

// Shape your existing Admin.tsx UI already expects (camelCase, text status)
export interface AdminProduct {
  id: string;
  name: string;
  subtitle: string;
  sku: string;
  price: number;
  oldPrice: number;
  discount: number;
  stock: number;
  sold: number;
  status: "active" | "draft";
  featured: boolean;
  category: string;      // category_id, used by the form
  categoryName: string;  // category_name, used for display
  tags: string[];
  weight: string;
  imageUrl: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
}

// Converts one backend product into the shape the UI expects
export function toAdminProduct(p: BackendProduct): AdminProduct {
  return {
    id: p.id,
    name: p.name,
    subtitle: p.subtitle || "",
    sku: p.sku || "",
    price: Number(p.price),
    oldPrice: Number(p.old_price) || 0,
    discount: p.discount || 0,
    stock: p.stock,
    sold: p.sold,
    status: p.status ? "active" : "draft",
    featured: p.featured,
    category: p.category_id,
    categoryName: p.category_name || "",
    tags: p.tags || [],
    weight: p.weight || "",
    imageUrl: p.image_url,
    imageUrl2: p.image_url_2 ?? null,
    imageUrl3: p.image_url_3 ?? null,
  };
}

export async function fetchProducts(): Promise<AdminProduct[]> {
  const data = await apiFetch("/products");
  return data.products.map(toAdminProduct);
}

// Builds the multipart form the backend expects, from the AdminProduct form shape
function buildProductFormData(form: AdminProduct & { imageFile?: File | null; videoFile?: File | null; imageFile2?: File | null; imageFile3?: File | null }): FormData {
  const fd = new FormData();
  fd.append("category_id", form.category);
  fd.append("name", form.name);
  fd.append("slug", form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  fd.append("subtitle", form.subtitle);
  fd.append("sku", form.sku);
  fd.append("price", String(form.price));
  fd.append("old_price", String(form.oldPrice));
  fd.append("discount", String(form.discount));
  fd.append("stock", String(form.stock));
  fd.append("sold", String(form.sold));
  fd.append("tags", JSON.stringify(form.tags));
  fd.append("featured", String(form.featured));
  fd.append("status", String(form.status === "active")); // "active" -> "true", "draft" -> "false"
  fd.append("weight", form.weight);
  if (form.imageFile) fd.append("image", form.imageFile);
  if (form.videoFile) fd.append("video", form.videoFile);
  if (form.imageFile2) fd.append("image2", form.imageFile2);
  if (form.imageFile3) fd.append("image3", form.imageFile3);
  return fd;
}

export async function createProduct(form: AdminProduct & { imageFile?: File | null; videoFile?: File | null; imageFile2?: File | null; imageFile3?: File | null }): Promise<AdminProduct> {
  const data = await apiFetch("/products", { method: "POST", body: buildProductFormData(form) });
  return toAdminProduct(data.product);
}

export async function updateProduct(id: string, form: AdminProduct & { imageFile?: File | null; videoFile?: File | null; imageFile2?: File | null; imageFile3?: File | null }): Promise<AdminProduct> {
  const data = await apiFetch(`/products/${id}`, { method: "PUT", body: buildProductFormData(form) });
  return toAdminProduct(data.product);
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/products/${id}`, { method: "DELETE" });
}

// Public lookup by slug — used by Checkout to re-verify stock right before payment,
// since a product's stock can change between "added to cart" and "checking out."
export async function fetchProductStockBySlug(slug: string): Promise<{ id: string; stock: number } | null> {
  try {
    const data = await apiFetch(`/products/${slug}`);
    const p: BackendProduct = data.product;
    return { id: p.id, stock: p.stock };
  } catch {
    return null; // product deleted/unavailable — treat as out of stock
  }
}

// =====================================================================
// STOREFRONT (customer-facing) MAPPING
// =====================================================================
// The customer UI (Home/Shop/ProductDetail/Cart/Checkout) was built against
// a richer mock shape (see ../data.ts `Product`) than the products table
// currently stores. Rather than fabricate data, we map what's real 1:1 and
// use honest, clearly-labelled defaults for the rest:
//   - rating / reviewCount default to 0 (no reviews table yet — Phase 5)
//   - skinTypes defaults to ["All"] (not tracked per-product yet)
//   - howToUse / warnings / shippingInfo / returnPolicy fall back to the
//     store's generic care & policy copy (same for every product today,
//     not per-product data) — pulled from STORE_DEFAULTS below so it lives
//     in one place instead of being duplicated per page.
// If/when these become real per-product fields, add DB columns and this
// mapper is the only place that needs to change.

export const STORE_DEFAULTS = {
  skinTypes: ["All"] as const,
  howToUse: [
    "Wet your face or body thoroughly with warm water.",
    "Lather the product gently between your palms or directly on skin.",
    "Massage in circular motions for 30–60 seconds.",
    "Rinse thoroughly with clean water.",
    "Pat skin dry with a soft towel — do not rub.",
    "Use twice daily — morning and evening — for optimal results.",
  ],
  warnings: [
    "For external use only. Avoid direct contact with eyes.",
    "If irritation occurs, discontinue use and consult a dermatologist.",
    "Keep out of reach of children under 3 years.",
    "Store in a cool, dry place away from direct sunlight.",
  ],
  shippingInfo:
    "We deliver across Pakistan within 2–4 business days. Flat shipping rate of Rs. 300 per order, regardless of quantity.",
  returnPolicy:
    "2-day return policy from the date of delivery. Contact us within 2 days for a hassle-free return.",
};

// "Neem, Aloe Vera, Tea Tree" (free text from the admin form) -> list items.
// No per-ingredient description/emoji is stored, so those stay generic.
function parseIngredients(raw: string | null | undefined): IngredientItem[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(name => ({ name, emoji: "🌿", desc: "" }));
}

function parseBenefits(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

function isRecent(created_at?: string, days = 14): boolean {
  if (!created_at) return false;
  const ageMs = Date.now() - new Date(created_at).getTime();
  return ageMs >= 0 && ageMs <= days * 24 * 60 * 60 * 1000;
}

interface StorefrontProduct extends Product {
  videoUrl?: string | null;
}

export function toStorefrontProduct(p: BackendProduct): Product {
  const price = Number(p.price) || 0;
  const oldPrice = Number(p.old_price) || price;
  const storefrontProduct: StorefrontProduct = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle || "",
    tagline: p.category_name || p.brand || "",
    description: p.description || "",
    price,
    oldPrice,
    discount: p.discount || 0,
    weight: p.weight || "",
    category: p.category_id, // matches Category.id from fetchCategories()
    benefits: (() => { const b = parseBenefits(p.benefits); return b.length > 0 ? b : (p.tags || []); })(),
    skinTypes: [...STORE_DEFAULTS.skinTypes],
    ingredients: parseIngredients(p.ingredients),
    howToUse: STORE_DEFAULTS.howToUse,
    warnings: STORE_DEFAULTS.warnings,
    shippingInfo: STORE_DEFAULTS.shippingInfo,
    returnPolicy: STORE_DEFAULTS.returnPolicy,
    stock: p.stock ?? 0,
    rating: 0,
    reviewCount: 0,
    isNew: isRecent(p.created_at),
    isBestSeller: (p.sold ?? 0) > 15,
    isFeatured: !!p.featured,
    imageUrl: p.image_url,
    imageUrl2: p.image_url_2 ?? null,
    imageUrl3: p.image_url_3 ?? null,
    videoUrl: p.video_url ?? null,
  };
  return storefrontProduct;
}

// All active products, mapped for the storefront. Used by Home/Shop/Root/
// Dashboard/SkinQuiz via the shared `products` list in store.tsx — fetched
// once there rather than separately on every page.
export async function fetchStorefrontProducts(): Promise<Product[]> {
  const [data, summaries] = await Promise.all([
    apiFetch("/products"),
    fetchAllRatingSummaries().catch(() => ({} as Record<string, { avg: number; count: number }>)),
  ]);
  return (data.products as BackendProduct[])
    .filter(p => p.status) // hide drafts from customers
    .map(p => {
      const prod = toStorefrontProduct(p);
      const s = summaries[p.id];
      if (s) { prod.rating = s.avg; prod.reviewCount = s.count; }
      return prod;
    });
}

export async function fetchStorefrontProductBySlug(slug: string): Promise<Product> {
  const data = await apiFetch(`/products/${slug}`);
  return toStorefrontProduct(data.product);
}