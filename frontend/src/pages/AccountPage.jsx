import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Package, Download, Heart, User, Loader2, FileText, Truck } from "lucide-react";
import { api, inr, imgSrc, formatApiError } from "../lib/api";
import { SEO } from "../components/SEO";
import { useAuth } from "../context/AuthContext";
import { ProductCard } from "../components/ProductCard";

const STATUS_STYLES = {
  pending: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-red-100 text-red-700",
};

const OrdersTab = () => {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get("/orders").then((r) => setOrders(r.data)).catch(() => setOrders([]));
  }, []);

  if (orders === null) return <p className="py-10 text-center text-slate-400">Loading orders...</p>;
  if (orders.length === 0)
    return (
      <div className="py-14 text-center" data-testid="no-orders">
        <Package className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-700">No orders yet</p>
        <Link to="/" className="mt-3 inline-block rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white">Start Shopping</Link>
      </div>
    );

  return (
    <div className="space-y-4" data-testid="orders-list">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="order-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900">#{o.order_number}</p>
              <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[o.status] || STATUS_STYLES.pending}`} data-testid="order-status">
                {o.status}
              </span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {o.payment_status}
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {o.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <img
                  src={imgSrc(item.image)}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.src = imgSrc(""); }}
                />
                <span className="flex-1 text-slate-700 line-clamp-1">{item.title} × {item.qty}</span>
                <span className="font-semibold text-slate-900">{inr(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500">
              {o.has_physical && (
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" />
                  {o.tracking_number ? `Tracking: ${o.tracking_number}` : "Tracking number will be shared once shipped"}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900">Total: {inr(o.total)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const DownloadsTab = () => {
  const [items, setItems] = useState(null);
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    api.get("/downloads").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  const download = async (p) => {
    setDownloading(p.id);
    try {
      const res = await api.get(`/downloads/${p.id}/file`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${p.slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDownloading("");
    }
  };

  if (items === null) return <p className="py-10 text-center text-slate-400">Loading downloads...</p>;
  if (items.length === 0)
    return (
      <div className="py-14 text-center" data-testid="no-downloads">
        <FileText className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-700">No digital materials yet</p>
        <p className="mt-1 text-sm text-slate-500">Purchased PDF notes will appear here instantly after payment.</p>
      </div>
    );

  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="downloads-list">
      {items.map(({ product: p, granted_at }, i) => (
        <div key={p.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <img
            src={imgSrc(p.cover || (p.images || [])[0])}
            alt=""
            className="h-20 w-20 rounded-xl object-cover"
            onError={(e) => { e.target.onerror = null; e.target.src = imgSrc(""); }}
          />
          <div className="flex flex-1 flex-col">
            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{p.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Purchased {new Date(granted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <button
              data-testid={`download-pdf-btn-${i + 1}`}
              onClick={() => download(p)}
              disabled={downloading === p.id}
              className="mt-auto flex w-fit items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {downloading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download PDF
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const WishlistTab = () => {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get("/wishlist").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="py-10 text-center text-slate-400">Loading wishlist...</p>;
  if (items.length === 0)
    return (
      <div className="py-14 text-center">
        <Heart className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-700">Wishlist is empty</p>
      </div>
    );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {items.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
};

const ProfileTab = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: "", mobile: "", address: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || "", mobile: user.mobile || "", address: user.address || "", password: "" });
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, mobile: form.mobile, address: form.address };
      if (form.password) payload.password = form.password;
      const { data } = await api.put("/auth/profile", payload);
      setUser(data);
      setForm((f) => ({ ...f, password: "" }));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6" data-testid="profile-form">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Email (cannot change)</label>
        <input value={user?.email || ""} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-400" />
      </div>
      {[["name", "Full Name"], ["mobile", "Mobile Number"]].map(([key, label]) => (
        <div key={key}>
          <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
          <input
            data-testid={`profile-${key}-input`}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>
      ))}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
        <textarea
          data-testid="profile-address-input"
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">New Password (leave blank to keep current)</label>
        <input
          data-testid="profile-password-input"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>
      <button
        type="submit"
        data-testid="profile-save-btn"
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Changes
      </button>
    </form>
  );
};

const TABS = [
  { id: "orders", label: "My Orders", icon: Package },
  { id: "downloads", label: "My Digital Materials", icon: Download },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "profile", label: "Profile Settings", icon: User },
];

const AccountPage = () => {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const tab = params.get("tab") || "orders";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="customer-dashboard">
      <SEO title="My Account" />
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
        Hi, {user?.name?.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-slate-500">Manage your orders, downloads and profile</p>

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`customer-dashboard-tab-${t.id}`}
            onClick={() => setParams({ tab: t.id })}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "orders" && <OrdersTab />}
        {tab === "downloads" && <DownloadsTab />}
        {tab === "wishlist" && <WishlistTab />}
        {tab === "profile" && <ProfileTab />}
      </div>
    </div>
  );
};

export default AccountPage;
