import { COUPONS } from "./data.js";

export const COUPON_ERRORS = {
  empty: "Enter a coupon code",
  notFound: "Coupon not found",
  expired: "This coupon has expired",
};

/** Returns { coupon } when the code can be used, or { error } with a message for the shopper. */
export function validateCoupon(rawCode, now = new Date()) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: COUPON_ERRORS.empty };
  const coupon = COUPONS.find((c) => c.code === code);
  if (!coupon) return { error: COUPON_ERRORS.notFound };
  return { coupon };
}

export function discountFor(coupon, subtotal) {
  if (!coupon) return 0;
  const raw = coupon.type === "percent" ? (subtotal * coupon.amount) / 100 : coupon.amount;
  return Math.min(raw, subtotal);
}
