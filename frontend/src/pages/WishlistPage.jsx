import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { api } from "../lib/api";
import { SEO } from "../components/SEO";
import { ProductCard } from "../components/ProductCard";

const WishlistPage = () => {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get("/wishlist").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="wishlist-page">
      <SEO title="Wishlist" />
      <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">My Wishlist</h1>
      {items === null ? (
        <p className="py-20 text-center text-slate-400">Loading...</p>
      ) : items.length === 0 ? (
        <div className="py-20 text-center" data-testid="empty-wishlist">
          <Heart className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-700">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-slate-500">Save books and notes to buy them later.</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
