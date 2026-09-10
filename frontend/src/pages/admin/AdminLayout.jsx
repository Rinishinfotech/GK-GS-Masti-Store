import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Package, FolderTree, ShoppingBag, Users, ArrowLeft } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "admin-nav-analytics" },
  { to: "/admin/products", label: "Products", icon: Package, testid: "admin-nav-products" },
  { to: "/admin/categories", label: "Categories", icon: FolderTree, testid: "admin-nav-categories" },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, testid: "admin-nav-orders" },
  { to: "/admin/customers", label: "Customers", icon: Users, testid: "admin-nav-customers" },
];

const AdminLayout = () => (
  <div className="flex min-h-screen bg-slate-50" data-testid="admin-panel">
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 border-b border-slate-100 p-5">
        <img src="/logo.png" alt="GK GS Masti" className="h-9 w-9 rounded-full object-cover ring-2 ring-amber-500/70" />
        <div className="leading-tight">
          <p className="font-heading text-sm font-extrabold text-red-600">GK GS MASTI</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            data-testid={n.testid}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <Link to="/" className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100" data-testid="admin-back-to-store">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>
      </div>
    </aside>

    <div className="flex-1 min-w-0">
      <div className="md:hidden flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-200 bg-white px-3 py-2">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                isActive ? "bg-red-600 text-white" : "text-slate-600"
              }`
            }
          >
            <n.icon className="h-3.5 w-3.5" />
            {n.label}
          </NavLink>
        ))}
      </div>
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  </div>
);

export default AdminLayout;
