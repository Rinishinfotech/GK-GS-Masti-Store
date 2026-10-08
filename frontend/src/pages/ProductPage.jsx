import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, ShoppingCart, Zap, FileText, Minus, Plus, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, imgSrc, inr, formatApiError } from "../lib/api";
import { SEO } from "../components/SEO";
import { Stars, ProductCard } from "../components/ProductCard";
import { SamplePdfModal } from "../components/SamplePdfModal";
import { PincodeChecker } from "../components/PincodeChecker";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const ProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [notFound, setNotFound] = useState(false);

  const load = () => {
    api.get(`/products/${slug}`)
      .then((r) => {
        setProduct(r.data);
        if (r.data.category) {
          api.get("/products", { params: { kind: r.data.category.group, limit: 8 } })
            .then((res) => setRelated(res.data.filter((p) => p.id !== r.data.id).slice(0, 4)))
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true));
  };

  useEffect(() => {
    setProduct(null);
    setNotFound(false);
    setQty(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (notFound)
    return (
      <div className="py-24 text-center" data-testid="product-not-found">
        <p className="text-xl font-bold text-slate-800">Product not found</p>
        <Link to="/" className="mt-4 inline-block rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white">Go Home</Link>
      </div>
    );
  if (!product) return <p className="py-24 text-center text-slate-400">Loading...</p>;

  const price = product.discount_price || product.price;
  const off = product.discount_price ? Math.round(((product.price - product.discount_price) / product.price) * 100) : 0;
  const outOfStock = product.type !== "digital" && product.stock <= 0;

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/products/${product.id}/reviews`, { rating, comment });
      toast.success("Review submitted");
      setComment("");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="product-page">
      <SEO title={product.title} description={product.description} image={imgSrc(product.cover)} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <img
            src={imgSrc(product.cover || (product.images || [])[0])}
            alt={product.title}
            className="aspect-[4/3] w-full object-cover"
            data-testid="product-image"
            onError={(e) => { e.target.onerror = null; e.target.src = imgSrc(""); }}
          />
        </div>
        <div>
          {product.category && (
            <Link
              to={`/category/${product.category.group}/${product.category.slug}`}
              className="text-xs font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700"
            >
              {product.category.name} {product.category.group === "notes" ? "Notes" : "Books"}
            </Link>
          )}
          <h1 className="font-heading mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900" data-testid="product-title">
            {product.title}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Stars rating={product.rating} className="h-4 w-4" />
            <span className="text-sm text-slate-500">{product.rating} ({product.review_count || 0} reviews)</span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-slate-900" data-testid="product-price">{inr(price)}</span>
            {off > 0 && (
              <>
                <span className="text-lg text-slate-400 line-through">{inr(product.price)}</span>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">{off}% OFF</span>
              </>
            )}
          </div>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed" data-testid="product-description">
            {product.description}
          </p>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p>
                  <p className="text-sm font-semibold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
          )}

          {product.type !== "digital" && (
            <p className={`mt-4 text-sm font-semibold ${outOfStock ? "text-red-600" : "text-emerald-600"}`} data-testid="stock-status">
              {outOfStock ? "Out of stock" : `In stock (${product.stock} available)`}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 text-slate-600" data-testid="qty-minus" aria-label="Decrease">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-bold" data-testid="qty-value">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-2.5 text-slate-600" data-testid="qty-plus" aria-label="Increase">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              data-testid="product-add-to-cart-btn"
              onClick={() => add(product, qty)}
              disabled={outOfStock}
              className="flex items-center gap-2 rounded-xl border-2 border-red-600 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <ShoppingCart className="h-4 w-4" /> Add to Cart
            </button>
            <button
              data-testid="buy-now-btn"
              onClick={() => { add(product, qty); navigate("/checkout"); }}
              disabled={outOfStock}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              <Zap className="h-4 w-4" /> Buy Now
            </button>
            <button
              data-testid="product-wishlist-btn"
              onClick={() => toggle(product.id)}
              aria-label="Wishlist"
              className={`rounded-xl border p-3 transition-colors ${
                has(product.id) ? "border-red-600 bg-red-600 text-white" : "border-slate-200 text-slate-500 hover:text-red-600"
              }`}
            >
              <Heart className={`h-4 w-4 ${has(product.id) ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {product.sample_pdf && (
              <button
                data-testid="product-sample-pdf-btn"
                onClick={() => setSampleOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                <FileText className="h-4 w-4" /> View Free Sample PDF
              </button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
            {product.type !== "digital" && (
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-red-500" /> Home delivery with tracking</span>
            )}
            {product.type !== "physical" && (
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-emerald-500" /> Instant PDF access after payment</span>
            )}
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-amber-500" /> Secure payment</span>
          </div>

          {product.type !== "digital" && (
            <div className="mt-5 max-w-sm rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Truck className="h-3.5 w-3.5" /> Check delivery &amp; shipping rate
              </p>
              <PincodeChecker compact items={[{ product_id: product.id, qty }]} />
            </div>
          )}
        </div>
      </div>

      <section className="mt-14" data-testid="reviews-section">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Ratings &amp; Reviews</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {(product.reviews || []).length === 0 && (
              <p className="text-sm text-slate-500">No reviews yet. Be the first to review.</p>
            )}
            {(product.reviews || []).slice().reverse().map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="review-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{r.user_name}</p>
                  <Stars rating={r.rating} />
                </div>
                {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 h-fit">
            <h3 className="font-heading font-bold text-slate-900">Write a review</h3>
            {user ? (
              <form onSubmit={submitReview} className="mt-3 space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" onClick={() => setRating(i)} data-testid={`rating-star-${i}`} aria-label={`${i} star`}>
                      <Stars rating={i <= rating ? 1 : 0} className="h-6 w-6" />
                    </button>
                  ))}
                </div>
                <textarea
                  data-testid="review-comment-input"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
                <button type="submit" data-testid="review-submit-btn" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                  Submit Review
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                <Link to="/login" className="font-semibold text-red-600">Login</Link> to write a review.
              </p>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14" data-testid="related-products">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900 mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      <SamplePdfModal product={product} open={sampleOpen} onClose={() => setSampleOpen(false)} />
    </div>
  );
};

export default ProductPage;
