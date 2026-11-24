export const PRODUCTS = [
  { id: "mug", name: "Stoneware Mug", price: 16, emoji: "☕", blurb: "Hand-glazed, holds 350 ml." },
  { id: "notebook", name: "Linen Notebook", price: 14, emoji: "📓", blurb: "A5, dotted pages, lay-flat." },
  { id: "lamp", name: "Brass Desk Lamp", price: 48, emoji: "💡", blurb: "Warm 2700K, dimmable." },
  { id: "tote", name: "Canvas Tote", price: 18, emoji: "👜", blurb: "Heavy 12 oz cotton canvas." },
  { id: "candle", name: "Cedar Candle", price: 18, emoji: "🕯️", blurb: "40-hour soy wax burn." },
  { id: "plant", name: "Trailing Pothos", price: 22, emoji: "🪴", blurb: "Easy-care, in a 12 cm pot." },
];

export const COUPONS = [
  { code: "WELCOME5", type: "fixed", amount: 5, expires: "2027-12-31" },
  { code: "FALL10", type: "percent", amount: 10, expires: "2026-10-31" },
];

export const SHIPPING_FEE = 6;
export const FREE_SHIPPING_FROM = 50; // "Free shipping on orders of $50 or more"
