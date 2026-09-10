import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { api } from "../lib/api";
import { Stars } from "./ProductCard";

export const Testimonials = () => {
  const [items, setItems] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get("/testimonials").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="mt-16" data-testid="testimonials-section">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Success Stories</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            What Our Learners Say
          </h2>
        </div>
        <div className="hidden sm:flex gap-2">
          <button onClick={() => scroll(-1)} data-testid="testimonial-prev-btn" aria-label="Previous" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} data-testid="testimonial-next-btn" aria-label="Next" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto no-scrollbar snap-x pb-2">
        {items.map((t) => (
          <div
            key={t.id}
            data-testid="testimonial-card"
            className="snap-start shrink-0 w-[320px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <Quote className="h-6 w-6 text-red-200" />
            <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-4">{t.text}</p>
            <div className="mt-4 flex items-center gap-3">
              <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
              <div>
                <p className="text-sm font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-amber-600 font-semibold">{t.exam}</p>
              </div>
              <div className="ml-auto">
                <Stars rating={t.rating} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
