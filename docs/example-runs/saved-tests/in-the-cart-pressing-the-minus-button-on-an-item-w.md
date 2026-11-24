---
name: in-the-cart-pressing-the-minus-button-on-an-item-w
bug: "In the cart, pressing the minus button on an item with quantity 1 makes the quantity 0 and then negative, and the total goes negative"
---
Click "Add to cart" on the Stoneware Mug once, then click the "−" (Decrease Stoneware Mug) button in the "Your cart" panel once. Verify that the cart never shows a quantity of 0 or less and no negative amount appears anywhere, i.e. the Stoneware Mug is either removed ("Your cart is empty" is shown) or still shows quantity 1, and the Total is not negative.
