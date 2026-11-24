import { useState } from "react";
import { addItem, decrementItem, money, removeItem, searchProducts, totals } from "./cart.js";
import { validateCoupon } from "./coupons.js";
import { FREE_SHIPPING_FROM } from "./data.js";

export default function App() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);
  const [placed, setPlaced] = useState(false);

  const results = searchProducts(query);
  const t = totals(cart, coupon);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  function applyCoupon(e) {
    e.preventDefault();
    const r = validateCoupon(code);
    if (r.error) {
      setCoupon(null);
      setCouponMsg({ kind: "error", text: r.error });
    } else {
      setCoupon(r.coupon);
      setCouponMsg({ kind: "ok", text: `Coupon ${r.coupon.code} applied` });
    }
  }

  return (
    <div className="page">
      <header className="top">
        <div className="brand">
          <span className="logo">✦</span> Brightcart
        </div>
        <div className="bag" aria-label="Cart items">
          Cart · {count}
        </div>
      </header>

      <p className="promo">Free shipping on orders of ${FREE_SHIPPING_FROM} or more</p>

      <main className="layout">
        <section>
          <label className="search">
            <span>Search products</span>
            <input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>

          {results.length === 0 ? (
            <p className="empty">No products found</p>
          ) : (
            <ul className="grid">
              {results.map((p) => (
                <li key={p.id} className="card">
                  <div className="emoji" aria-hidden>
                    {p.emoji}
                  </div>
                  <h3>{p.name}</h3>
                  <p className="blurb">{p.blurb}</p>
                  <div className="row">
                    <strong>{money(p.price)}</strong>
                    <button onClick={() => setCart((c) => addItem(c, p.id))}>Add to cart</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="summary">
          <h2>Your cart</h2>
          {t.lines.length === 0 && <p className="empty">Your cart is empty</p>}
          <ul className="lines">
            {t.lines.map((l) => (
              <li key={l.id}>
                <span className="name">{l.product.name}</span>
                <span className="qty">
                  <button aria-label={`Decrease ${l.product.name}`} onClick={() => setCart((c) => decrementItem(c, l.id))}>
                    −
                  </button>
                  <span aria-label={`${l.product.name} quantity`}>{l.qty}</span>
                  <button aria-label={`Increase ${l.product.name}`} onClick={() => setCart((c) => addItem(c, l.id))}>
                    +
                  </button>
                </span>
                <span className="amt">{money(l.lineTotal)}</span>
                <button className="link" onClick={() => setCart((c) => removeItem(c, l.id))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form className="coupon" onSubmit={applyCoupon}>
            <input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="submit">Apply</button>
          </form>
          {couponMsg && (
            <p className={`msg ${couponMsg.kind}`} role="status">
              {couponMsg.text}
            </p>
          )}

          <dl className="totals">
            <dt>Subtotal</dt>
            <dd>{money(t.subtotal)}</dd>
            <dt>Discount</dt>
            <dd>{t.discount ? `−${money(t.discount)}` : money(0)}</dd>
            <dt>Shipping</dt>
            <dd>{t.shipping === 0 ? "Free" : money(t.shipping)}</dd>
            <dt className="grand">Total</dt>
            <dd className="grand">{money(t.total)}</dd>
          </dl>

          <button className="checkout" disabled={t.lines.length === 0} onClick={() => setPlaced(true)}>
            Place order
          </button>
          {placed && <p className="msg ok">Order placed — thank you!</p>}
        </aside>
      </main>
    </div>
  );
}
