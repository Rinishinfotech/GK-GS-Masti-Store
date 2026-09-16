# GK GS Masti Store — PRD

## Original Problem Statement
Full e-commerce store for competitive exam books & PDF notes (Bihar Daroga, Bihar Police, BPSC Teacher, BSSC, Railway, SSC GD) with: sticky header (logo, Notes & Books category dropdowns, search, cart counter, user menu), hero promo slider, featured books grid, latest notes, testimonials carousel, 3-column footer, floating WhatsApp button, SEO baseline (meta titles, OG tags, sitemap.xml, robots.txt, responsive). Admin panel (/admin): analytics (revenue, orders, learners, physical vs digital ratio, pending deliveries), product CRUD (covers, prices, categories, stock, sample + locked PDFs), order management (physical/digital filter, shipping status, tracking numbers), customer management. Customers: registration (name, mobile, email, password, address), login, profile, cart, checkout with conditional delivery charges (₹0 for digital-only), coupons, wishlist, Razorpay payments (UPI/cards/netbanking/wallets), order tracking, "My Orders" and "My Digital Materials/Downloads" tabs.

## Architecture
- Backend: FastAPI + MongoDB (motor), JWT Bearer auth (7-day tokens, bcrypt, brute-force lockout), Razorpay in MOCK mode (switch to live by setting RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in backend/.env), Emergent object storage for covers/sample/full PDFs, reportlab-generated seed PDFs, dynamic /api/sitemap.xml.
- Frontend: React + Tailwind + shadcn, clean minimal light theme (red/amber/green brand), localStorage cart, server-side wishlist, contexts: Auth/Cart/Wishlist.
- File: backend/server.py (all routes), frontend/src/{pages,components,context,hooks,lib}.

## User Personas
- Aspirant/learner: browses, buys books + PDFs, downloads instantly.
- Admin/owner (palakneuroclinic@gmail.com): manages catalog, orders, customers.

## Implemented (2026-09-10)
- Sticky header with category mega-dropdowns (Notes/Books), search, cart & wishlist counters, user menu, mobile menu.
- Homepage: hero slider, exam chips, trust features, Featured Books, Latest Notes, testimonials carousel, 3-column footer, floating WhatsApp button (prefilled message).
- Category pages with type filters + sorting; search page; product detail with specs, ratings/reviews (post review), sample PDF preview modal, related products, qty, Add to Cart, Buy Now.
- Auth: register (name/mobile/email/address/password), login, profile edit, admin seeding.
- Cart (qty, remove, subtotal), checkout (delivery + billing address, coupon WELCOME10/MASTI50, ₹50 shipping only if physical items), mock Razorpay payment modal, instant digital entitlement on payment.
- Customer dashboard: My Orders (status + tracking), My Digital Materials (PDF downloads), Wishlist, Profile.
- Admin: dashboard analytics (revenue, orders, learners, physical vs digital ratio bar, pending deliveries, recent orders), product CRUD with cover/sample/full-PDF uploads, category CRUD, order management (filters, status updates, tracking numbers), customer management (search, order history, entitlements audit).
- SEO: dynamic titles/meta/OG per page, /api/sitemap.xml, public/robots.txt, responsive layouts.
- Seed data: 12 categories (6 exams × notes/books), 12 products, 4 testimonials, 2 coupons.

## Backlog / Next Tasks
- P0: Swap Razorpay test keys for live keys when ready to accept real payments; real WhatsApp support number; update robots.txt sitemap URL on custom domain.
- P1: Order emails/notifications (Resend), forgot-password flow, hero banners manageable from admin, coupon admin UI.
- P2: Pagination on category pages, review moderation, sales charts over time, multi-image product gallery, shipping aggregator API (Shiprocket) for auto tracking.
