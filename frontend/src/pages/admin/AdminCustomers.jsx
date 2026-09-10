import { useEffect, useState } from "react";
import { Eye, FileText } from "lucide-react";
import { api, inr } from "../../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const AdminCustomers = () => {
  const [customers, setCustomers] = useState(null);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get("/admin/customers").then((r) => setCustomers(r.data)).catch(() => setCustomers([]));
  }, []);

  const openDetail = async (id) => {
    const { data } = await api.get(`/admin/customers/${id}`);
    setDetail(data);
  };

  const filtered = (customers || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.mobile || "").includes(search)
  );

  return (
    <div data-testid="admin-customers-page">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Customers</h1>
      <p className="mt-1 text-sm text-slate-500">Search learners, view order history and PDF entitlements</p>

      <input
        data-testid="customer-search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email or mobile..."
        className="mt-5 w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
      />

      {customers === null ? (
        <p className="py-20 text-center text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-slate-400" data-testid="no-customers">No customers found.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Customer</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Orders</th>
                <th className="p-4">Total Spent</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid="admin-customer-row">
                  <td className="p-4">
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </td>
                  <td className="p-4 text-slate-600">{c.mobile}</td>
                  <td className="p-4 text-slate-600">{c.order_count}</td>
                  <td className="p-4 font-semibold text-slate-900">{inr(c.total_spent)}</td>
                  <td className="p-4 text-slate-600">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => openDetail(c.id)} className="p-2 text-slate-500 hover:text-red-600" data-testid="admin-view-customer-btn" aria-label="View customer">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="customer-detail-modal">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.customer.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 text-sm">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-slate-600">{detail.customer.email} • {detail.customer.mobile}</p>
                  <p className="mt-1 text-slate-500">{detail.customer.address || "No address saved"}</p>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-slate-900">Order History ({detail.orders.length})</h3>
                  {detail.orders.length === 0 && <p className="mt-2 text-slate-400">No orders.</p>}
                  <div className="mt-2 space-y-2">
                    {detail.orders.map((o) => (
                      <div key={o.id} className="flex justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                        <div>
                          <p className="font-semibold text-slate-800">#{o.order_number}</p>
                          <p className="text-xs text-slate-400 capitalize">{o.status} • {o.payment_status}</p>
                        </div>
                        <p className="font-semibold">{inr(o.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-slate-900">PDF Entitlements ({detail.entitlements.length})</h3>
                  {detail.entitlements.length === 0 && <p className="mt-2 text-slate-400">No digital purchases.</p>}
                  <div className="mt-2 space-y-2">
                    {detail.entitlements.map((e) => (
                      <div key={e.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-4 py-2.5">
                        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">{e.product_title}</p>
                          <p className="text-xs text-slate-400">Granted {new Date(e.granted_at).toLocaleDateString("en-IN")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;
