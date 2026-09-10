import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star, FileText, BookOpen, Package } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { imgSrc, inr } from "../lib/api";

const TypeBadge = ({ type }) => {
  if (type === "digital")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        <FileText className="h-3 w-3" /> PDF
      </span>
    );
  if (type === "both")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        <Package className="h-3 w-3" /> Book + PDF
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
      <BookOpen className="h-3 w-3" /> Book
    </span>
  );
};

export const Stars = ({ rating = 0, className = "h-3.5 w-3.5" }) => (
  <span className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`${className} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
      />
    ))}
  </span>
);

export const ProductCard = ({ product, index = 0 }) => {
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const price = product.discount_price || product.price;
  const off = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;
  const outOfStock = product.type !== "digital" && product.stock <= 0;

  return (
    <div
      data-testid={`product-card-${index + 1}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <Link to={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={imgSrc(product.cover || (product.images || [])[0])}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.onerror = null; e.target.src = imgSrc(""); }}
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <TypeBadge type={product.type} />
          {off > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{off}% OFF</span>
          )}
        </div>
      </Link>
      <button
        data-testid="product-wishlist-btn"
        onClick={() => toggle(product.id)}
        aria-label="Toggle wishlist"
        className={`absolute right-3 top-3 rounded-full p-2 shadow-sm transition-colors ${
          has(product.id) ? "bg-red-600 text-white" : "bg-white/90 text-slate-500 hover:text-red-600"
        }`}
      >
        <Heart className={`h-4 w-4 ${has(product.id) ? "fill-current" : ""}`} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">{product.category.name}</p>
        )}
        <Link to={`/product/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 leading-snug hover:text-red-600 transition-colors">
            {product.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-xs text-slate-400">({product.review_count || 0})</span>
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-slate-900">{inr(price)}</span>
            {off > 0 && <span className="ml-1.5 text-xs text-slate-400 line-through">{inr(product.price)}</span>}
          </div>
          <button
            data-testid="product-add-to-cart-btn"
            onClick={() => add(product)}
            disabled={outOfStock}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {outOfStock ? "Out of Stock" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};
