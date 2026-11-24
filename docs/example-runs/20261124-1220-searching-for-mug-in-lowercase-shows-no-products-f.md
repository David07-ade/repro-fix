# repro-fix report

**Status:** 🟢 Verified — reproduced, fixed, re-tested green

Bug reproduced, fixed and verified in a real browser.

## Bug report

> Searching for 'mug' in lowercase shows 'No products found' even though we sell a Stoneware Mug

## Frozen Kane test

```text
On the Brightcart page, type the lowercase word mug into the "Search products" input. Verify that the Stoneware Mug product is shown in the results and that the message "No products found" is not displayed.
```

## Runs

| # | Phase | Result | What Kane saw | Fix applied before this run | Evidence |
|---|---|---|---|---|---|
| 1 | reproduce | 🔴 fail | Searching for mug incorrectly shows no products even though Stoneware Mug is available. |  | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86M9AGAV6C3QPS3NN7T5M4K/dashboard/share/US_PDCTE6DZGRY48TKE2L0CNGOYEYYIRN3JUPQ9UGNFZ3C8MD9IQNJEUEIRRJ4LA44S?type=summary&agentView=true&fqdn=summary-page) |
| 2 | verify | 🟢 pass | searched for mugs on Brightcart | searchProducts compared the raw query to the product name with a case-sensitive includes(), so 'mug' never matched 'Stoneware Mug'. It now lowercases both the query and the name before matching. I didn't add a regression test: the project has no test setup, and the saved Kane test under .repro/ is off-limits. | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86MBZCQDS9P5B3FYX8Y386A/dashboard/share/US_DUXJCG0M3FNCZ3ZUFTDZZOHDD39HVMTP9F7YIIOZNIKE43KUT9UEHG5PXFDCHRQM?type=summary&agentView=true&fqdn=summary-page) |
| 3 | regression (expired-coupon-fall10-is-still-accepted-at-checkou) | 🟢 pass | applied the FALL10 coupon on Brightcart |  | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86ME3XRRJPZE8VPJ973CCZ6/dashboard/share/US_KJ5KG63F96YIPEUQQE0J5TYDHO0IOFMNB0JKN1Q57UPTFYZOL0PTZN946LP804VP?type=summary&agentView=true&fqdn=summary-page) |

## Code change

Files: `src/cart.js`

```diff
diff --git a/demo/brightcart/src/cart.js b/demo/brightcart/src/cart.js
index 28751bc..b191557 100644
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
Kane credits used: **44.5** · Kane runs: 3
