import { useEffect, useState } from "react";
import { IndianRupee, ShoppingBag, Users, Truck, BookOpen, FileText } from "lucide-react";
import { api, inr } from "../../lib/api";

const AdminDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/analytics").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <p className="py-20 text-center text-slate-400">Loading analytics...</p>;

  const totalSales = data.physical_sales + data.digital_sales;
  const physicalPct = totalSales > 0 ? Math.round((data.physical_sales / totalSales) * 100) : 0;

  const cards = [
    { label: "Total Sales (Revenue)", value: inr(data.total_revenue), icon: IndianRupee, color: "bg-emerald-50 text-emerald-600", testid: "metric-revenue" },
    { label: "Total Orders", value: data.total_orders, icon: ShoppingBag, color: "bg-red-50 text-red-600", testid: "metric-orders" },
    { label: "Total Learners", value: data.total_learners, icon: Users, color: "bg-amber-50 text-amber-600", testid: "metric-learners" },
    { label: "Pending Deliveries", value: data.pending_deliveries, icon: Truck, color: "bg-indigo-50 text-indigo-600", testid: "metric-pending" },
    { label: "Total Products", value: data.total_products, icon: BookOpen, color: "bg-slate-100 text-slate-600", testid: "metric-products" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Store performance at a glance</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={c.testid}>
            <div className={`inline-flex rounded-xl p-2.5 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{c.value}</p>
            <p className="text-xs font-semibold text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6" data-testid="metric-sales-ratio">
        <h2 className="font-heading text-lg font-bold text-slate-900">Physical vs Digital PDF Sales</h2>
        <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="bg-red-500 transition-all" style={{ width: `${physicalPct}%` }} />
          <div className="bg-emerald-500 transition-all" style={{ width: `${100 - physicalPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <BookOpen className="h-4 w-4" /> Physical: {inr(data.physical_sales)} ({physicalPct}%)
          </span>
          <span className="flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <FileText className="h-4 w-4" /> Digital PDF: {inr(data.digital_sales)} ({100 - physicalPct}%)
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6" data-testid="recent-orders">
        <h2 className="font-heading text-lg font-bold text-slate-900">Recent Orders</h2>
        {data.recent_orders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pr-4">Order</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Payment</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 font-semibold text-slate-900">#{o.order_number}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{o.user_name}</td>
                    <td className="py-2.5 pr-4 font-semibold">{inr(o.total)}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600 capitalize">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
