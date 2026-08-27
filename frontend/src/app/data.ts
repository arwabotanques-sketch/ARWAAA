// Was a fixed union of 3 hardcoded categories; now a real category_id (or
// legacy slug for the mock entry below) since categories are admin-managed.
export type ProductCategory = string;
export type SkinType = "All" | "Oily" | "Dry" | "Combination" | "Sensitive" | "Normal";

export interface IngredientItem {
  name: string;
  emoji: string;
  desc: string;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  price: number;
  oldPrice: number;
  discount: number;
  weight: string;
  category: ProductCategory;
  benefits: string[];
  skinTypes: SkinType[];
  ingredients: IngredientItem[];
  howToUse: string[];
  warnings: string[];
  shippingInfo: string;
  returnPolicy: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  slug: string;
  imageUrl?: string | null; // real Cloudinary image from the backend, if any
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  videoUrl?: string | null; // real Cloudinary video from the backend, if any
}

export interface Review {
  id: string;
  productId: string;
  name: string;
  city: string;
  rating: number;
  title: string;
  text: string;
  date: string;
  verified: boolean;
}

// NOTE: the mock PRODUCTS array that used to live here has been removed.
// Every page now gets real product data from the backend via `useStore()`
// (see store.tsx -> fetchStorefrontProducts() in api/products.ts). The
// Product/Review types and the constants below are still used for typing,
// filters, and the homepage's static testimonial content.

export const REVIEWS: Review[] = [
  {
    id: "r1",
    productId: "arwa-beauty-soap-200g",
    name: "Ayesha Malik",
    city: "Lahore",
    rating: 5,
    title: "Best soap I have ever used!",
    text: "I have been using Arwa Botaniqs for three weeks and my skin has never felt this clean. The lather is incredible and the botanical scent is so refreshing. My acne has reduced significantly and my skin looks brighter!",
    date: "June 28, 2026",
    verified: true,
  },
  {
    id: "r2",
    productId: "arwa-beauty-soap-200g",
    name: "Fatima Zahra",
    city: "Karachi",
    rating: 5,
    title: "Perfect for sensitive skin",
    text: "Finally a soap that doesn't dry out my sensitive skin. I have tried so many products and this is the one that actually works. The neem and aloe combination is just perfect. My skin feels hydrated and calm.",
    date: "June 20, 2026",
    verified: true,
  },
  {
    id: "r3",
    productId: "arwa-beauty-soap-200g",
    name: "Zara Ahmed",
    city: "Islamabad",
    rating: 5,
    title: "Cleared my daughter's acne!",
    text: "Ordered for my teenage daughter who struggles with breakouts. After just two weeks the difference is clearly visible. Genuine botanical ingredients you can trust. Will order again — highly recommend!",
    date: "June 15, 2026",
    verified: true,
  },
  {
    id: "r4",
    productId: "arwa-beauty-soap-200g",
    name: "Hina Qureshi",
    city: "Faisalabad",
    rating: 5,
    title: "Luxurious feel at an incredible price",
    text: "The packaging alone made me fall in love but the product exceeded all expectations. My skin feels incredibly soft and hydrated all day long. Worth every rupee — and the discount makes it an absolute steal!",
    date: "June 10, 2026",
    verified: true,
  },
  {
    id: "r5",
    productId: "arwa-beauty-soap-200g",
    name: "Sana Tariq",
    city: "Multan",
    rating: 5,
    title: "Visible brightening in two weeks",
    text: "I was skeptical at first but the results speak for themselves. My complexion is noticeably brighter and my pores look smaller. The activated charcoal does an amazing job at deep cleansing. Will not go back to chemical soaps.",
    date: "June 3, 2026",
    verified: true,
  },
];

export const ALL_BENEFITS = [
  "Acne Control",
  "Skin Brightening",
  "Oil Control",
  "Deep Cleansing",
  "Hydration",
  "Baby Friendly",
  "Sensitive Skin",
];

export const ALL_SKIN_TYPES: SkinType[] = ["All", "Oily", "Dry", "Combination", "Sensitive", "Normal"];
export const ALL_WEIGHTS = ["100g", "200g", "300g"];
// NOTE: the hardcoded ALL_CATEGORIES list that used to live here has been
// removed — Shop.tsx now fetches real, admin-managed categories from
// GET /api/categories (see api/categories.ts) instead of 3 fixed options.

export const POPULAR_SEARCHES = [
  "Beauty Soap",
  "Acne Soap",
  "Natural Soap",
  "Brightening Soap",
  "Sensitive Skin",
];
