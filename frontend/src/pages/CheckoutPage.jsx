import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreditCard, Smartphone, Landmark, Wallet, Loader2, BadgeCheck } from "lucide-react";
import { api, inr, formatApiError } from "../lib/api";
import { SEO } from "../components/SEO";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const emptyAddress = { name: "", mobile: "", line1: "", line2: "", city: "", state: "", pincode: "" };

const MockPaymentModal = ({ open, amount, onSuccess, onCancel }) => {
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onSuccess(`pay_mock_${Math.random().toString(36).slice(2, 14)}`);
    }, 1400);
  };

  const methods = [
    { id: "upi", label: "UPI", icon: Smartphone },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "netbanking", label: "NetBanking", icon: Landmark },
    { id: "wallet", label: "Wallet", icon: Wallet },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md" data-testid="mock-payment-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Razorpay <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Test Mode</span>
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500">Mock payment for testing. No real money is charged.</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              data-testid={`pay-method-${m.id}`}
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-[11px] font-semibold transition-colors ${
                method === m.id ? "border-red-600 bg-red-50 text-red-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <m.icon className="h-5 w-5" />
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-500">Amount payable</p>
          <p className="text-2xl font-extrabold text-slate-900" data-testid="mock-pay-amount">{inr(amount)}</p>
        </div>
        <button
          data-testid="mock-pay-confirm-btn"
          onClick={pay}
          disabled={processing}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
          {processing ? "Processing..." : `Pay ${inr(amount)}`}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const AddressForm = ({ value, onChange, prefix }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {[
      ["name", "Full Name", "text"],
      ["mobile", "Mobile Number", "tel"],
      ["line1", "Address Line 1", "text"],
      ["line2", "Address Line 2 (optional)", "text"],
      ["city", "City", "text"],
      ["state", "State", "text"],
      ["pincode", "Pincode", "text"],
    ].map(([key, label, type]) => (
      <div key={key} className={key === "line1" || key === "line2" ? "sm:col-span-2" : ""}>
        <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
        <input
          data-testid={`${prefix}-${key}-input`}
          type={type}
          value={value[key]}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>
    ))}
  </div>
);

const CheckoutPage = () => {
  const { items, subtotal, hasPhysical, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState(emptyAddress);
  const [billing, setBilling] = useState(emptyAddress);
  const [sameBilling, setSameBilling] = useState(true);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (user) {
      setAddress((a) => ({ ...a, name: user.name || "", mobile: user.mobile || "", line1: user.address || "" }));
    }
  }, [user]);

  useEffect(() => {
    if (user === null) navigate("/login");
    if (user && items.length === 0 && !payment) navigate("/cart");
  }, [user, items, navigate, payment]);

  const shipping = hasPhysical ? 50 : 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const { data } = await api.post("/coupons/validate", { code: coupon, subtotal });
      setDiscount(data.discount);
      toast.success(`Coupon applied: ${inr(data.discount)} off`);
    } catch (err) {
      setDiscount(0);
      toast.error(formatApiError(err));
    }
  };

  const validateAddress = (a) =>
    a.name.trim() && /^\d{10}$/.test(a.mobile.trim()) && a.line1.trim() && a.city.trim() && a.state.trim() && /^\d{6}$/.test(a.pincode.trim());

  const placeOrder = async () => {
    if (!validateAddress(address)) {
      toast.error("Please fill a valid delivery address (10-digit mobile, 6-digit pincode)");
      return;
    }
    if (!sameBilling && !validateAddress(billing)) {
      toast.error("Please fill a valid billing address");
      return;
    }
    setPlacing(true);
    try {
      const { data: order } = await api.post("/orders", {
        items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
        address,
        billing: sameBilling ? null : billing,
        coupon: discount > 0 ? coupon : null,
      });
      const { data: pay } = await api.post("/payments/create-order", { order_id: order.id });
      setPayment({ order, ...pay });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setPlacing(false);
    }
  };

  const onPaymentSuccess = async (paymentId) => {
    try {
      await api.post("/payments/verify", {
        order_id: payment.order.id,
        razorpay_payment_id: paymentId,
        razorpay_signature: "mock_signature",
      });
      clear();
      toast.success("Payment successful! Order confirmed.");
      navigate("/account?tab=orders");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="checkout-page">
      <SEO title="Checkout" />
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-4">Delivery Address</h2>
            <AddressForm value={address} onChange={setAddress} prefix="addr" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-slate-900">Billing Address</h2>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={sameBilling}
                  onChange={(e) => setSameBilling(e.target.checked)}
                  data-testid="same-billing-checkbox"
                  className="h-4 w-4 rounded accent-red-600"
                />
                Same as delivery
              </label>
            </div>
            {!sameBilling && <AddressForm value={billing} onChange={setBilling} prefix="billing" />}
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6" data-testid="order-summary">
          <h2 className="font-heading text-lg font-bold text-slate-900">Order Summary</h2>
          <div className="mt-4 max-h-52 space-y-3 overflow-y-auto">
            {items.map((i) => (
              <div key={i.product_id} className="flex justify-between gap-3 text-sm">
                <span className="text-slate-600 line-clamp-1">{i.title} × {i.qty}</span>
                <span className="font-semibold text-slate-900 shrink-0">{inr(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              data-testid="checkout-coupon-input"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Coupon code (try WELCOME10)"
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
            <button
              data-testid="apply-coupon-btn"
              onClick={applyCoupon}
              className="rounded-xl border border-red-600 px-4 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              Apply
            </button>
          </div>
          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between font-semibold text-emerald-600"><span>Coupon discount</span><span data-testid="coupon-discount">-{inr(discount)}</span></div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery charges</span>
              <span className={shipping === 0 ? "font-bold text-emerald-600" : ""}>{shipping === 0 ? "FREE" : inr(shipping)}</span>
            </div>
            <div className="border-t border-slate-100 pt-2.5 flex justify-between text-base font-bold text-slate-900">
              <span>Total</span><span data-testid="checkout-total">{inr(total)}</span>
            </div>
          </div>
          <button
            data-testid="checkout-submit-btn"
            onClick={placeOrder}
            disabled={placing || items.length === 0}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {placing && <Loader2 className="h-4 w-4 animate-spin" />}
            {placing ? "Placing order..." : `Pay ${inr(total)}`}
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">UPI • Cards • NetBanking • Wallets via Razorpay</p>
        </div>
      </div>

      <MockPaymentModal
        open={!!payment}
        amount={payment ? payment.amount / 100 : 0}
        onSuccess={onPaymentSuccess}
        onCancel={() => setPayment(null)}
      />
    </div>
  );
};

export default CheckoutPage;
