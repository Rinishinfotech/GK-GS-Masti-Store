import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, ShoppingCart, Heart, Menu, X, ChevronDown, User, Package, Download, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useCategories } from "../hooks/useCategories";

const flattenCats = (items) => {
  const out = [];
  const walk = (pid, depth) => {
    items
      .filter((c) => (c.parent_id || null) === pid)
      .forEach((c) => {
        out.push({ ...c, depth });
        walk(c.id, depth + 1);
      });
  };
  walk(null, 0);
  return out;
};

const CatLinks = ({ items, group, close }) =>
  flattenCats(items).map((c) => (
    <Link
      key={c.id}
      to={`/category/${group}/${c.slug}`}
      data-testid={`nav-cat-${group}-${c.slug}`}
      onClick={close}
      style={{ paddingLeft: `${16 + c.depth * 16}px` }}
      className={`block rounded-xl py-2.5 pr-4 text-sm hover:bg-red-50 hover:text-red-600 transition-colors ${
        c.depth === 0 ? "font-semibold text-slate-700" : "text-slate-500"
      }`}
    >
      {c.depth > 0 && "— "}{c.name}
    </Link>
  ));

const NavDropdown = ({ label, items, group, testid }) => {
  const [open, setOpen] = useState(false);
  return (
  <div className="relative group">
    <div className="flex items-center">
      <Link
        to={`/${group}`}
        data-testid={testid}
        className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-red-600 transition-colors"
      >
        {label}
      </Link>
      <button
        data-testid={`${testid}-toggle`}
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label={`${label} menu`}
        className="-ml-1 p-1.5 text-slate-500 hover:text-red-600 transition-colors"
      >
        <ChevronDown className={`h-4 w-4 transition-transform group-hover:rotate-180 ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
    <div className={`${open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 translate-y-1"} group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all absolute left-0 top-full z-50 w-64 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl`}>
      <CatLinks items={items} group={group} close={() => setOpen(false)} />
      {items.length === 0 && <p className="px-4 py-2 text-sm text-slate-400">No categories yet</p>}
    </div>
  </div>
  );
};

export const Header = () => {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { notes, books } = useCategories();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3">
          <button
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu-btn"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 shrink-0" data-testid="header-logo">
            <img src="/logo.png" alt="GK GS Masti Store" className="h-11 w-11 rounded-full object-cover ring-2 ring-amber-500/70 shadow-sm" />
            <div className="hidden sm:block leading-tight">
              <p className="font-heading font-extrabold text-red-600 text-base tracking-tight">GK GS MASTI</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Official Store</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center">
            <NavDropdown label="Class Notes" items={notes} group="notes" testid="nav-dropdown-notes" />
            <NavDropdown label="Exam Books" items={books} group="books" testid="nav-dropdown-books" />
          </nav>

          <form onSubmit={submit} className="hidden md:flex flex-1 max-w-md ml-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                data-testid="search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search books, exams, notes..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 ml-auto md:ml-0">
            <Link to="/wishlist" className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors" data-testid="wishlist-counter-button" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wishCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {wishCount}
                </span>
              )}
            </Link>
            <Link to="/cart" className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors" data-testid="cart-counter-button" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  data-testid="user-menu-button"
                  onClick={() => setUserOpen(!userOpen)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-24 truncate">{user.name.split(" ")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {userOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <Link to="/account" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600" data-testid="user-menu-account">
                        <User className="h-4 w-4" /> My Account
                      </Link>
                      <Link to="/account?tab=orders" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600" data-testid="user-menu-orders">
                        <Package className="h-4 w-4" /> My Orders
                      </Link>
                      <Link to="/account?tab=downloads" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600" data-testid="user-menu-downloads">
                        <Download className="h-4 w-4" /> My Downloads
                      </Link>
                      {user.role === "admin" && (
                        <Link to="/admin" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50" data-testid="user-menu-admin">
                          <LayoutDashboard className="h-4 w-4" /> Admin Panel
                        </Link>
                      )}
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50" data-testid="user-menu-logout">
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="login-link"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search books, exams, notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>
        </form>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white" data-testid="mobile-menu">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            <p className="px-2 pt-1 text-xs font-bold uppercase tracking-wider text-amber-600">Class Notes</p>
            <CatLinks items={notes} group="notes" close={() => setMobileOpen(false)} />
            <p className="px-2 pt-3 text-xs font-bold uppercase tracking-wider text-amber-600">Exam Books</p>
            <CatLinks items={books} group="books" close={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
};
