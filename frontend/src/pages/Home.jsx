import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Zap, ShieldCheck, Headset } from "lucide-react";
import { api } from "../lib/api";
import { SEO } from "../components/SEO";
import { HeroSlider } from "../components/HeroSlider";
import { ProductCard } from "../components/ProductCard";
import { Testimonials } from "../components/Testimonials";
import { useCategories } from "../hooks/useCategories";

const EXAM_COLORS = [
  "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
];

const Home = () => {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [latestNotes, setLatestNotes] = useState([]);
  const { notes } = useCategories();

  useEffect(() => {
    api.get("/products", { params: { kind: "books", featured: "true", limit: 8 } })
      .then((r) => setFeaturedBooks(r.data)).catch(() => {});
    api.get("/products", { params: { kind: "notes", sort: "new", limit: 8 } })
      .then((r) => setLatestNotes(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      <SEO />
      <div className="bg-gradient-to-r from-red-50 via-amber-50/50 to-emerald-50/30 pt-6 pb-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeroSlider />
          <div className="mt-6 flex flex-wrap gap-2.5 justify-center pb-4">
            {notes.filter((c) => !c.parent_id).map((c, i) => (
              <Link
                key={c.id}
                to={`/category/notes/${c.slug}`}
                data-testid={`exam-chip-${c.slug}`}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${EXAM_COLORS[i % 3]}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: "Notes Printed & Shipped", text: "PDF notes printed and delivered to you" },
            { icon: Truck, title: "Fast Book Delivery", text: "Tracked shipping across India" },
            { icon: ShieldCheck, title: "Secure Payments", text: "UPI, cards, netbanking & wallets" },
            { icon: Headset, title: "WhatsApp Support", text: "Quick help for orders & downloads" },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-3" data-testid={`feature-${i}`}>
              <div className="rounded-xl bg-red-50 p-2.5 text-red-600 shrink-0">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{f.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-14" data-testid="featured-books-section">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Handpicked</p>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Featured Books</h2>
            </div>
            <Link to="/books" className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredBooks.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>

        <section className="mt-14" data-testid="latest-notes-section">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Instant Download</p>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Latest Notes</h2>
            </div>
            <Link to="/notes" className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {latestNotes.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>

        <Testimonials />
      </div>
    </div>
  );
};

export default Home;
