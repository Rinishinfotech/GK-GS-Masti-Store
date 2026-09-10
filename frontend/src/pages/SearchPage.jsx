import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { api } from "../lib/api";
import { SEO } from "../components/SEO";
import { ProductCard } from "../components/ProductCard";

const SearchPage = () => {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get("/products", { params: { search: q, limit: 60 } })
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="search-page">
      <SEO title={`Search: ${q}`} />
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
        Search results for "{q}"
      </h1>
      <p className="mt-1 text-sm text-slate-500">{products.length} result{products.length !== 1 ? "s" : ""} found</p>
      {loading ? (
        <p className="py-20 text-center text-slate-400">Searching...</p>
      ) : products.length === 0 ? (
        <div className="py-20 text-center" data-testid="no-results">
          <SearchX className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-lg font-semibold text-slate-700">No results found</p>
          <p className="mt-1 text-sm text-slate-500">Try different keywords like "Daroga", "SSC GD" or "BPSC".</p>
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

export default SearchPage;
