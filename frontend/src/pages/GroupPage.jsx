import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { SEO } from "../components/SEO";
import { ProductCard } from "../components/ProductCard";

const GroupPage = ({ kind }) => {
  const isNotes = kind === "notes";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("new");

  useEffect(() => {
    setLoading(true);
    const params = { kind, sort, limit: 100 };
    if (typeFilter !== "all") params.type = typeFilter;
    api.get("/products", { params })
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [kind, typeFilter, sort]);

  const title = isNotes ? "Class Notes" : "Exam Books";
  const desc = isNotes
    ? "All class notes and PDF study material — instant download after payment."
    : "All printed exam books — delivered to your doorstep with tracking.";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid={`${kind}-page`}>
      <SEO title={title} description={desc} />
      <div className="rounded-3xl bg-gradient-to-r from-red-50 via-amber-50/60 to-emerald-50/40 border border-slate-200 p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-600">GK GS Masti Store</p>
        <h1 className="font-heading mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {products.length} product{products.length !== 1 ? "s" : ""} available. {desc}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {["all", "physical", "digital", "both"].map((t) => (
            <button
              key={t}
              data-testid={`filter-${t}`}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                typeFilter === t ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t === "all" ? "All" : t === "physical" ? "Books" : t === "digital" ? "PDF" : "Combos"}
            </button>
          ))}
        </div>
        <select
          data-testid="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none"
        >
          <option value="new">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {loading ? (
        <p className="py-20 text-center text-slate-400">Loading products...</p>
      ) : products.length === 0 ? (
        <div className="py-20 text-center" data-testid="empty-group">
          <p className="text-lg font-semibold text-slate-700">No products here yet</p>
          <p className="mt-1 text-sm text-slate-500">Check back soon — new material is added regularly.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupPage;
