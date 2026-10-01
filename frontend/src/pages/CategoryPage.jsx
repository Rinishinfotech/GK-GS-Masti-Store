import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { SEO } from "../components/SEO";
import { ProductCard } from "../components/ProductCard";
import { useCategories } from "../hooks/useCategories";

const CategoryPage = () => {
  const { group, slug } = useParams();
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("new");

  const category = categories.find((c) => c.group === group && c.slug === slug);

  useEffect(() => {
    setLoading(true);
    const params = { kind: group, category: slug, sort, limit: 60 };
    if (typeFilter !== "all") params.type = typeFilter;
    api.get("/products", { params })
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [group, slug, typeFilter, sort]);

  const title = category
    ? `${category.name} ${group === "notes" ? "Notes" : "Books"}`
    : "Category";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="category-page">
      <SEO title={title} description={`Shop ${title} at GK GS Masti Store - best prices, instant PDF access and fast delivery.`} />
      <div className="rounded-3xl bg-gradient-to-r from-red-50 via-amber-50/60 to-emerald-50/40 border border-slate-200 p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
          {group === "notes" ? "Class Notes" : "Exam Books"}
        </p>
        <h1 className="font-heading mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {products.length} product{products.length !== 1 ? "s" : ""} available. Trusted content for {category?.name || "your exam"} preparation with instant PDF access and home delivery.
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
        <div className="py-20 text-center" data-testid="empty-category">
          <p className="text-lg font-semibold text-slate-700">No products here yet</p>
          <p className="mt-1 text-sm text-slate-500">Check back soon or browse other categories.</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700">
            Back to Home
          </Link>
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

export default CategoryPage;
