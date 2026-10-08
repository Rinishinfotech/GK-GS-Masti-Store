import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Truck, RefreshCw, Loader2, CheckCircle2, XCircle, FileDown, PackagePlus, RotateCcw, MapPin } from "lucide-react";
import { api, inr, formatApiError } from "../../lib/api";

const AdminShipping = () => {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [acting, setActing] = useState("");

  const checkStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const { data } = await api.get("/admin/shiprocket/status");
      setStatus(data);
    } catch (err) {
      setStatus({ connected: false, error: formatApiError(err) });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const load = useCallback(() => {
    api.get("/admin/settings/shipping").then((r) => setSettings(r.data)).catch(() => {});
    api.get("/admin/orders").then((r) => {
      setShipments(r.data.filter((o) => o.has_physical && (o.payment_status === "paid" || o.payment_status === "cod")));
    }).catch(() => {});
    checkStatus();
  }, [checkStatus]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...settings,
        free_shipping_above: parseFloat(settings.free_shipping_above) || 0,
        markup_percent: parseFloat(settings.markup_percent) || 0,
        markup_flat: parseFloat(settings.markup_flat) || 0,
        cod_charge: parseFloat(settings.cod_charge) || 0,
        default_weight: parseFloat(settings.default_weight) || 0.5,
        default_length: parseFloat(settings.default_length) || 25,
        default_breadth: parseFloat(settings.default_breadth) || 18,
        default_height: parseFloat(settings.default_height) || 2,
      };
      const { data } = await api.put("/admin/settings/shipping", payload);
      setSettings(data);
      toast.success("Shipping settings saved");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const action = async (order, kind) => {
    setActing(order.id + kind);
    try {
      const { data } = await api.post(`/admin/orders/${order.id}/${kind}`);
      if (kind === "label" && data.label_url) {
        window.open(data.label_url, "_blank");
        toast.success("Label generated");
      } else if (kind === "pickup") {
        toast.success("Pickup scheduled with courier");
      } else if (kind === "sync") {
        toast.success(`Synced: ${data.current_status || data.order_status}`);
      } else if (kind === "ship") {
        toast.success(data.awb_code ? `Shipment created — AWB ${data.awb_code}` : "Shipment created in Shiprocket");
      }
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActing("");
    }
  };

  const set = (k) => (e) => setSettings({ ...settings, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div data-testid="admin-shipping-page">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Shipping (Shiprocket)</h1>
      <p className="mt-1 text-sm text-slate-500">Connection, pickup location, live rates and shipment management</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" data-testid="shiprocket-status-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${status?.connected ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {status === null ? "Checking connection..." : status.connected ? "Shiprocket Connected" : "Shiprocket Not Connected"}
              </p>
              <p className="text-xs text-slate-500">{status?.email || status?.error || ""}</p>
            </div>
            {status?.connected ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : status ? <XCircle className="h-5 w-5 text-red-500" /> : null}
          </div>
          <button
            data-testid="shiprocket-test-connection-btn"
            onClick={checkStatus}
            disabled={statusLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {statusLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Test Connection
          </button>
        </div>
        {status?.pickups?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {status.pickups.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <MapPin className="h-3 w-3" /> {p.pickup_location} — {p.city}, {p.pin_code}
              </span>
            ))}
          </div>
        )}
      </div>

      {settings && (
        <form onSubmit={saveSettings} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" data-testid="shipping-settings-form">
          <h2 className="font-heading text-lg font-bold text-slate-900">Rate &amp; Pickup Configuration</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Pickup Location Name</label>
              <input data-testid="settings-pickup-location" value={settings.pickup_location} onChange={set("pickup_location")} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Pickup Pincode</label>
              <input data-testid="settings-pickup-pincode" value={settings.pickup_pincode} onChange={set("pickup_pincode")} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Courier Selection</label>
              <select data-testid="settings-courier-strategy" value={settings.courier_strategy} onChange={set("courier_strategy")} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
                <option value="cheapest">Cheapest available courier</option>
                <option value="fastest">Fastest courier</option>
                <option value="manual">Manual (preferred courier)</option>
              </select>
            </div>
            {settings.courier_strategy === "manual" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Preferred Courier Name</label>
                <input data-testid="settings-preferred-courier" value={settings.preferred_courier} onChange={set("preferred_courier")} placeholder="e.g. Delhivery" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Free shipping above (₹, 0 = off)</label>
              <input data-testid="settings-free-above" type="number" min="0" value={settings.free_shipping_above} onChange={set("free_shipping_above")} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Markup %</label>
              <input data-testid="settings-markup-percent" type="number" value={settings.markup_percent} onChange={set("markup_percent")} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Markup / Discount flat (₹, negative = discount)</label>
              <input data-testid="settings-markup-flat" type="number" value={settings.markup_flat} onChange={set("markup_flat")} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">COD extra charge (₹)</label>
              <input data-testid="settings-cod-charge" type="number" min="0" value={settings.cod_charge} onChange={set("cod_charge")} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input data-testid="settings-cod-enabled" type="checkbox" checked={!!settings.cod_enabled} onChange={set("cod_enabled")} className="h-4 w-4 rounded accent-red-600" />
                Enable Cash on Delivery
              </label>
            </div>
          </div>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Default package (used when product has no dimensions)</h3>
          <div className="mt-3 grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[["default_weight", "Weight (kg)"], ["default_length", "Length (cm)"], ["default_breadth", "Breadth (cm)"], ["default_height", "Height (cm)"]].map(([k, label]) => (
              <div key={k}>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
                <input data-testid={`settings-${k}`} type="number" step="0.1" min="0" value={settings[k]} onChange={set(k)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
              </div>
            ))}
          </div>
          <button
            type="submit"
            data-testid="shipping-settings-save-btn"
            disabled={saving}
            className="mt-5 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Shipping Settings
          </button>
        </form>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white" data-testid="shipments-table">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-heading text-lg font-bold text-slate-900">Shipments</h2>
          <p className="text-xs text-slate-500">Paid / COD orders with physical items</p>
        </div>
        {shipments.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No shipments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Order</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Shipment</th>
                  <th className="p-4">AWB / Courier</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((o) => {
                  const sr = o.shiprocket || {};
                  return (
                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid="shipment-row">
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">#{o.order_number}</p>
                        <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                      </td>
                      <td className="p-4 text-slate-600">{o.user_name}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "cod" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="p-4">
                        {sr.shipment_id ? (
                          <div className="text-xs">
                            <p className="font-semibold text-slate-800">{sr.status}</p>
                            <p className="text-slate-400">ID: {sr.shipment_id}</p>
                            {sr.awb_error && <p className="text-red-600">{sr.awb_error}</p>}
                            {sr.last_event_status && <p className="text-slate-500">Last: {sr.last_event_status}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not created</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {sr.awb_code ? <p className="font-semibold text-slate-800">{sr.awb_code}</p> : "—"}
                        {sr.courier_name && <p>{sr.courier_name}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          {!sr.shipment_id && (
                            <button onClick={() => action(o, "ship")} disabled={acting} title="Create shipment" data-testid="shipment-create-btn" className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-50">
                              {acting === o.id + "ship" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackagePlus className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {sr.shipment_id && !sr.awb_code && (
                            <button onClick={() => action(o, "ship")} disabled={acting} title="Retry AWB" data-testid="shipment-retry-btn" className="rounded-lg bg-amber-500 p-2 text-white hover:bg-amber-600 disabled:opacity-50">
                              {acting === o.id + "ship" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {sr.shipment_id && (
                            <>
                              <button onClick={() => action(o, "label")} disabled={acting} title="Shipping label" data-testid="shipment-label-btn" className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-800 disabled:opacity-50">
                                {acting === o.id + "label" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                              </button>
                              <button onClick={() => action(o, "pickup")} disabled={acting} title="Schedule pickup" data-testid="shipment-pickup-btn" className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-50">
                                {acting === o.id + "pickup" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                              </button>
                              <button onClick={() => action(o, "sync")} disabled={acting} title="Sync tracking" data-testid="shipment-sync-btn" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                                {acting === o.id + "sync" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminShipping;
