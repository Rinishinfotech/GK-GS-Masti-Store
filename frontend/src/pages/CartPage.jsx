import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { PincodeChecker } from "../components/PincodeChecker";
import { imgSrc, inr } from "../lib/api";
import { SEO } from "../components/SEO";

const CartPage = () => {
  const { items, setQty, remove, subtotal, hasPhysical } = useCart();
  const navigate = useNavigate();
  const shipping = items.length === 0 ? 0 : hasPhysical ? 50 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="cart-page">
      <SEO title="Cart" />
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Your Cart</h1>

      {items.length === 0 ? (
        <div className="py-20 text-center" data-testid="empty-cart">
          <ShoppingBag className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-700">Your cart is empty</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.product_id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4" data-testid="cart-item">
                <Link to={`/product/${item.slug}`} className="shrink-0">
                  <img
                    src={imgSrc(item.image)}
                    alt={item.title}
                    className="h-24 w-24 rounded-xl object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = imgSrc(""); }}
                  />
                </Link>
                <div className="flex flex-1 flex-col">
                  <Link to={`/product/${item.slug}`} className="text-sm font-semibold text-slate-900 line-clamp-2 hover:text-red-600">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {item.type === "digital" ? "PDF Download" : item.type === "both" ? "Book + PDF" : "Printed Book"}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-lg border border-slate-200">
                      <button onClick={() => setQty(item.product_id, item.qty - 1)} className="p-1.5 text-slate-600" data-testid="cart-qty-minus" aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => setQty(item.product_id, item.qty + 1)} className="p-1.5 text-slate-600" data-testid="cart-qty-plus" aria-label="Increase">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-slate-900">{inr(item.price * item.qty)}</span>
                      <button onClick={() => remove(item.product_id)} className="p-1.5 text-slate-400 hover:text-red-600" data-testid="cart-remove-btn" aria-label="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6" data-testid="cart-summary">
            <h2 className="font-heading text-lg font-bold text-slate-900">Order Summary</h2>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span data-testid="cart-subtotal">{inr(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery charges</span>
                <span data-testid="cart-shipping" className={shipping === 0 ? "font-bold text-emerald-600" : ""}>
                  {shipping === 0 ? "FREE" : inr(shipping)}
                </span>
              </div>
              {!hasPhysical && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  Digital-only order: zero delivery charges, instant access.
                </p>
              )}
              <div className="border-t border-slate-100 pt-2.5 flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span data-testid="cart-total">{inr(subtotal + shipping)}</span>
              </div>
            </div>
            <button
              data-testid="proceed-checkout-btn"
              onClick={() => navigate("/checkout")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </button>
            {hasPhysical && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Truck className="h-3.5 w-3.5" /> Check delivery &amp; shipping rate
                </p>
                <PincodeChecker compact items={items.map((i) => ({ product_id: i.product_id, qty: i.qty }))} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
