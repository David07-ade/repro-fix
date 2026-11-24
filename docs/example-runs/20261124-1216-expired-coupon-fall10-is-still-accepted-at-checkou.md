# repro-fix report

**Status:** 🟢 Verified — reproduced, fixed, re-tested green

Bug reproduced, fixed and verified in a real browser.

## Bug report

> Expired coupon FALL10 is still accepted at checkout — it should be rejected

## Frozen Kane test

```text
On the Brightcart page, click "Add to cart" on the Stoneware Mug, type FALL10 into the "Coupon code" field, and click "Apply". Verify that the message "This coupon has expired" is shown, that no "Coupon FALL10 applied" message appears, and that the Discount in the cart summary stays $0.
```

## Runs

| # | Phase | Result | What Kane saw | Fix applied before this run | Evidence |
|---|---|---|---|---|---|
| 1 | reproduce | 🔴 fail | Applying FALL10 gives a coupon-applied message and a $1.60 discount instead of reporting that the coupon has expired. |  | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86M38MT63FSBD9HHN9A6KV4/dashboard/share/US_G7K9H8VX7773HBVDZOE5QD6O84KASCEI28JV9PSONW1XJYM68TXA1M7DI7EEMR8C?type=summary&agentView=true&fqdn=summary-page) |
| 2 | verify | 🟢 pass | applied the FALL10 coupon to a Stoneware Mug cart on localhost | validateCoupon never checked a coupon's `expires` date. It now returns the 'This coupon has expired' error when the current time is past the end of the expiry day. FALL10 expired 2026-10-31, so it is rejected and no discount is applied. I didn't run the app or the Kane test. | [Kane run](https://test-manager.lambdatest.com/projects/01M86J98GMW5P46FC4EH5X4BC0/test-cases/01M86M5YPGNTQAAN4MJM87H8QK/dashboard/share/US_29RD8YP6TNW72IPT5ZYI4YGW0VJWVGAQO70D2OFRJYT21JS0L1XVZRP7RLWDHXUR?type=summary&agentView=true&fqdn=summary-page) |

## Code change

Files: `src/coupons.js`

```diff
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
Kane credits used: **41.3** · Kane runs: 2
