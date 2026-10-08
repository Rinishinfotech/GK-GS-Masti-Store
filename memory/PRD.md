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

## Implemented (2026-09-18, iteration 2)
- Razorpay LIVE (test keys): real Standard Checkout modal, HMAC-SHA256 verify, auto mock fallback if keys removed.
- Shiprocket shipping: auto shipment creation after payment for physical orders, AWB/courier auto-assign with retry (admin "Create Shiprocket Shipment" button), live tracking in customer My Orders (Track Shipment), webhook POST /api/shiprocket/webhook (x-api-key) auto-updates order status, pickup location "Patna" created via API. AWB blocked until Shiprocket wallet recharge (min Rs.100).
- Sub-categories: parent_id support, nested header dropdowns/mobile menu, admin "+ Sub Category" flow, parent pages include sub products.

## Implemented (2026-10-08, iteration 3)
- Storefront: clickable Class Notes (/notes) and Exam Books (/books) menu pages listing all products of each kind; Home "View all" links point to them; header labels renamed.
- Checkout: new address fields (name, phone, address line 1, city, state, area/village, post office, police station, house/street optional, landmark, pincode); payment method selector (Prepaid Razorpay / COD for physical-only orders); live shipping quote with courier name + ETA.
- Shiprocket full integration: live rates via Serviceability API on product/cart/checkout (PincodeChecker component), server-side revalidation at order placement, product weight/dims fields in admin, smart package calc (books stack), COD auto-shipment, free-shipping threshold + markup/discount + courier strategy (cheapest/fastest/manual) in admin settings, admin Shipping dashboard (connection test, settings, shipments with label/pickup/sync/retry), webhook + manual sync.

## Implemented (2026-10-08, iteration 4)
- BUSINESS RULE CHANGE: PDF notes (type "digital") are now PHYSICAL products — printed & shipped to the customer address with live Shiprocket shipping charges and auto-shipment creation. No instant download entitlement for digital products; only "Book + PDF" combos (type "both") still unlock the PDF in My Digital Materials after payment (combos are COD-blocked since the PDF unlocks instantly). COD is available for notes orders. Digital products are never out of stock ("Made to order — printed & shipped"). Verified 38/38 backend + full frontend E2E (iteration_5).

## Backlog / Next Tasks
- P0: Real WhatsApp support number (currently placeholder 919876543210); update robots.txt sitemap URL on custom domain. Razorpay live keys are ACTIVE (2026-10-22) — real payments enabled. Shiprocket wallet recharge (min Rs.100) still pending for AWB assignment.
- P1: Order emails/notifications (Resend), forgot-password flow, hero banners manageable from admin, coupon admin UI.
- P2: Pagination on category pages, review moderation, sales charts over time, multi-image product gallery, shipping aggregator API (Shiprocket) for auto tracking.
