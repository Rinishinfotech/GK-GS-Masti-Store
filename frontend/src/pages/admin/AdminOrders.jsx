import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import { api, inr, formatApiError } from "../../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

const STATUS_STYLES = {
  pending: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-red-100 text-red-700",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [tracking, setTracking] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const params = {};
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    api.get("/admin/orders", { params }).then((r) => setOrders(r.data)).catch(() => setOrders([]));
  }, [typeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openOrder = (o) => {
    setSelected(o);
    setEditStatus(o.status);
    setTracking(o.tracking_number || "");
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/orders/${selected.id}`, { status: editStatus, tracking_number: tracking });
      toast.success("Order updated");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="admin-orders-page">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Orders</h1>
      <p className="mt-1 text-sm text-slate-500">View transactions, update shipping status and tracking numbers</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <select data-testid="orders-type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
          <option value="">All types</option>
          <option value="physical">Physical (contains books)</option>
          <option value="digital">Digital only</option>
        </select>
        <select data-testid="orders-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {orders === null ? (
        <p className="py-20 text-center text-slate-400">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="py-20 text-center text-slate-400" data-testid="no-admin-orders">No orders found.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Total</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid="admin-order-row">
                  <td className="p-4">
                    <p className="font-semibold text-slate-900">#{o.order_number}</p>
                    <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-800">{o.user_name}</p>
                    <p className="text-xs text-slate-400">{o.user_email}</p>
                  </td>
                  <td className="p-4 text-slate-600">
                    {o.has_physical && o.has_digital ? "Book + PDF" : o.has_physical ? "Physical" : "Digital"}
                  </td>
                  <td className="p-4 font-semibold text-slate-900">{inr(o.total)}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_STYLES[o.status] || STATUS_STYLES.pending}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openOrder(o)} className="p-2 text-slate-500 hover:text-red-600" data-testid="admin-view-order-btn" aria-label="View order">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="order-detail-modal">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Order #{selected.order_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">{selected.user_name}</p>
                  <p className="text-slate-500">{selected.user_email}</p>
                  <p className="mt-2 text-slate-600">
                    {selected.address.line1}{selected.address.line2 ? `, ${selected.address.line2}` : ""}, {selected.address.city}, {selected.address.state} - {selected.address.pincode}
                  </p>
                  <p className="text-slate-600">Mobile: {selected.address.mobile}</p>
                </div>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-3">
                      <span className="text-slate-700 line-clamp-1">{item.title} × {item.qty}</span>
                      <span className="font-semibold shrink-0">{inr(item.price * item.qty)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{inr(selected.subtotal)}</span></div>
                    {selected.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({selected.coupon_code})</span><span>-{inr(selected.discount)}</span></div>}
                    <div className="flex justify-between text-slate-500"><span>Shipping</span><span>{selected.shipping_fee === 0 ? "FREE" : inr(selected.shipping_fee)}</span></div>
                    <div className="flex justify-between font-bold text-slate-900"><span>Total</span><span>{inr(selected.total)}</span></div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Order Status</label>
                    <select data-testid="order-status-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm capitalize">
                      {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Tracking Number</label>
                    <input
                      data-testid="tracking-number-input"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="e.g. DL123456789IN"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  data-testid="order-save-btn"
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
