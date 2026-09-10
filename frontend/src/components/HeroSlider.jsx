import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1544456203-0af5a69f5789?crop=entropy&cs=srgb&fm=jpg&q=85",
    tag: "Bihar Special",
    title: "Bihar Daroga & Police Notes",
    subtitle: "Handwritten-style PDF notes with previous year questions. Instant download after payment.",
    cta: "Shop Notes",
    link: "/category/notes/bihar-daroga",
  },
  {
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?crop=entropy&cs=srgb&fm=jpg&q=85",
    tag: "Bestseller",
    title: "GK GS Master Guide 2026",
    subtitle: "The complete printed guide for all Bihar & central exams. Free shipping on combos.",
    cta: "Shop Books",
    link: "/category/books/bihar-daroga",
  },
  {
    image: "https://images.unsplash.com/photo-1514369118554-e20d93546b30?crop=entropy&cs=srgb&fm=jpg&q=85",
    tag: "New Launch",
    title: "SSC GD & Railway Special",
    subtitle: "One-liner notes and practice sets trusted by 10,000+ aspirants across Bihar.",
    cta: "Explore SSC GD",
    link: "/category/notes/ssc-gd",
  },
];

export const HeroSlider = () => {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  return (
    <div className="relative overflow-hidden rounded-3xl" data-testid="hero-slider">
      <div className="relative h-72 sm:h-96">
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className="hero-slide absolute inset-0"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}
          >
            <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto w-full px-6 sm:px-10">
                <span className="inline-block rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-900">
                  {s.tag}
                </span>
                <h1 className="mt-3 max-w-xl text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  {s.title}
                </h1>
                <p className="mt-3 max-w-md text-sm sm:text-base text-slate-200">{s.subtitle}</p>
                <Link
                  to={s.link}
                  data-testid={`hero-cta-${i}`}
                  className="mt-5 inline-block rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                >
                  {s.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        data-testid="hero-slider-prev-btn"
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        data-testid="hero-slider-next-btn"
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white transition-colors"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
};
