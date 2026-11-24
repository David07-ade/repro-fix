# repro-fix report

**Status:** 🟢 Verified — reproduced, fixed, re-tested green

Bug reproduced, fixed and verified in a real browser.

## Bug report

> In the cart, pressing the minus button on an item with quantity 1 makes the quantity 0 and then negative, and the total goes negative

## Frozen Kane test

```text
Click "Add to cart" on the Stoneware Mug once, then click the "−" (Decrease Stoneware Mug) button in the "Your cart" panel once. Verify that the cart never shows a quantity of 0 or less and no negative amount appears anywhere, i.e. the Stoneware Mug is either removed ("Your cart is empty" is shown) or still shows quantity 1, and the Total is not negative.
```

## Runs

| # | Phase | Result | What Kane saw | Fix applied before this run | Evidence |
|---|---|---|---|---|---|
| 1 | reproduce | 🔴 fail | Decreasing the only Stoneware Mug leaves it visible in the cart with quantity 0 instead of removing it and showing an empty cart. |  | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86MH459ZZMEA7JG79VZX15H/dashboard/share/US_8ODKYGJBZZJE8DTGIEA8W7QPSYA1FVQ7OFPZISYTFKLI0HRKSOMN9Q82CZLF87MT?type=summary&agentView=true&fqdn=summary-page) |
| 2 | verify | 🟢 pass | updated the Stoneware Mug cart on localhost | decrementItem in src/cart.js lowered the quantity without a floor, so a quantity of 1 went to 0 and then negative. It now drops any line whose quantity reaches 0, so the cart shows "Your cart is empty" and the total can't go negative. I didn't run the app or the Kane test. | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86MKWXXP11FQPXRRZQFM8W9/dashboard/share/US_WHSAFW3I0L1WLA4XREOG41B15MY6FTQVWONPJEVRA2BS2GBB0A6IX8ZGEPKGJKJJ?type=summary&agentView=true&fqdn=summary-page) |
| 3 | regression (expired-coupon-fall10-is-still-accepted-at-checkou) | 🟢 pass | applied an expired FALL10 coupon on Brightcart |  | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86MPFZ7Y73424X7GCKKR3TG/dashboard/share/US_6ZHXRXUDO8WT3UHKNFORNB34ZJJ72BOQYG4QS2PRTDEZPWCX01E030AA5Q2IDVEY?type=summary&agentView=true&fqdn=summary-page) |
| 4 | regression (searching-for-mug-in-lowercase-shows-no-products-f) | 🟢 pass | searched for mug on the Brightcart page |  | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86MS02XT98XBBR8R9SHRTV3/dashboard/share/US_T5Q8SEV9C0S1Q05Y9R3X2A9LT1E3E0E6V2JXUK44A25M5ABCKCMXI1QJ2F90CN1Q?type=summary&agentView=true&fqdn=summary-page) |

## Code change

Files: `src/cart.js`

```diff
diff --git a/demo/brightcart/src/cart.js b/demo/brightcart/src/cart.js
index 28751bc..f9d6162 100644
--- a/demo/brightcart/src/cart.js
+++ b/demo/brightcart/src/cart.js
@@ -2,9 +2,9 @@ import { FREE_SHIPPING_FROM, PRODUCTS, SHIPPING_FEE } from "./data.js";
 import { discountFor } from "./coupons.js";
 
 export function searchProducts(query) {
-  const q = query.trim();
+  const q = query.trim().toLowerCase();
   if (!q) return PRODUCTS;
-  return PRODUCTS.filter((p) => p.name.includes(q));
+  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
 }
 
 export function addItem(cart, id) {
@@ -14,7 +14,9 @@ export function addItem(cart, id) {
 }
 
 export function decrementItem(cart, id) {
-  return cart.map((l) => (l.id === id ? { ...l, qty: l.qty - 1 } : l));
+  return cart
+    .map((l) => (l.id === id ? { ...l, qty: l.qty - 1 } : l))
+    .filter((l) => l.qty > 0);
 }
 
 export function removeItem(cart, id) {
diff --git a/demo/brightcart/src/coupons.js b/demo/brightcart/src/coupons.js
index f92cd0e..cfe1764 100644
--- a/demo/brightcart/src/coupons.js
+++ b/demo/brightcart/src/coupons.js
@@ -12,6 +12,9 @@ export function validateCoupon(rawCode, now = new Date()) {
   if (!code) return { error: COUPON_ERRORS.empty };
   const coupon = COUPONS.find((c) => c.code === code);
   if (!coupon) return { error: COUPON_ERRORS.notFound };
+  if (coupon.expires && now > new Date(`${coupon.expires}T23:59:59.999`)) {
+    return { error: COUPON_ERRORS.expired };
+  }
   return { coupon };
 }
```

---
Kane credits used: **70** · Kane runs: 4
