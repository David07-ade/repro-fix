import { FREE_SHIPPING_FROM, PRODUCTS, SHIPPING_FEE } from "./data.js";
import { discountFor } from "./coupons.js";

export function searchProducts(query) {
  const q = query.trim();
  if (!q) return PRODUCTS;
  return PRODUCTS.filter((p) => p.name.includes(q));
}

export function addItem(cart, id) {
  const line = cart.find((l) => l.id === id);
  if (line) return cart.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l));
  return [...cart, { id, qty: 1 }];
}

export function decrementItem(cart, id) {
  return cart.map((l) => (l.id === id ? { ...l, qty: l.qty - 1 } : l));
}

export function removeItem(cart, id) {
  return cart.filter((l) => l.id !== id);
}

export function totals(cart, coupon) {
  const lines = cart.map((l) => {
    const p = PRODUCTS.find((x) => x.id === l.id);
    return { ...l, product: p, lineTotal: p.price * l.qty };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discount = discountFor(coupon, subtotal);
  const afterDiscount = subtotal - discount;
  const shipping = subtotal === 0 || afterDiscount > FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  return { lines, subtotal, discount, shipping, total: afterDiscount + shipping };
}

export const money = (n) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;
