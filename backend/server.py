from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import httpx
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "gkgsmasti"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    import requests as _requests
    resp = _requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> str:
    import requests as _requests
    for attempt in range(2):
        key = init_storage(force=attempt > 0)
        resp = _requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
        if resp.status_code != 404:
            break
    resp.raise_for_status()
    return resp.json()["path"]


def get_object(path: str):
    import requests as _requests
    for attempt in range(2):
        key = init_storage(force=attempt > 0)
        resp = _requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
        if resp.status_code != 404:
            break
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
SHIPPING_FEE = 50
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
SUPPORT_WHATSAPP = os.environ.get("SUPPORT_WHATSAPP", "919876543210")
SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external"
SHIPROCKET_API_EMAIL = os.environ.get("SHIPROCKET_API_EMAIL", "")
SHIPROCKET_API_PASSWORD = os.environ.get("SHIPROCKET_API_PASSWORD", "")
SHIPROCKET_PICKUP_LOCATION = os.environ.get("SHIPROCKET_PICKUP_LOCATION", "")
SHIPROCKET_PICKUP_PINCODE = os.environ.get("SHIPROCKET_PICKUP_PINCODE", "")
SHIPROCKET_WEBHOOK_SECRET = os.environ.get("SHIPROCKET_WEBHOOK_SECRET", "")

sr_token = None
sr_token_time = None


def shiprocket_enabled():
    return bool(SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD and SHIPROCKET_PICKUP_LOCATION)


async def sr_login():
    global sr_token, sr_token_time
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{SHIPROCKET_API_BASE}/auth/login",
            json={"email": SHIPROCKET_API_EMAIL, "password": SHIPROCKET_API_PASSWORD},
        )
        r.raise_for_status()
        sr_token = r.json()["token"]
        sr_token_time = now()
    return sr_token


async def sr_request(method: str, path: str, **kwargs):
    if not sr_token or (now() - sr_token_time).total_seconds() > 9 * 86400:
        await sr_login()
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.request(
            method, SHIPROCKET_API_BASE + path,
            headers={"Authorization": f"Bearer {sr_token}", "Content-Type": "application/json"},
            **kwargs,
        )
        if r.status_code == 401:
            await sr_login()
            r = await c.request(
                method, SHIPROCKET_API_BASE + path,
                headers={"Authorization": f"Bearer {sr_token}", "Content-Type": "application/json"},
                **kwargs,
            )
        r.raise_for_status()
        return r.json()

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


def now():
    return datetime.now(timezone.utc)


def new_id():
    return uuid.uuid4().hex


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or new_id()[:8]


# ---------------- Auth helpers ----------------

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "exp": now() + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("_id", None)
    u.pop("password_hash", None)
    return u


async def get_current_user(request: Request):
    h = request.headers.get("Authorization", "")
    token = h[7:] if h.startswith("Bearer ") else None
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        "access_token", token, httponly=True, secure=True, samesite="none", max_age=7 * 86400, path="/"
    )


# ---------------- Request models ----------------

class RegisterIn(BaseModel):
    name: str
    email: str
    mobile: str
    address: str = ""
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileIn(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    password: Optional[str] = None


class ReviewIn(BaseModel):
    rating: int
    comment: str = ""


class OrderItemIn(BaseModel):
    product_id: str
    qty: int = 1


class AddressIn(BaseModel):
    name: str
    mobile: str
    line1: str
    line2: str = ""
    city: str
    state: str
    pincode: str


class OrderIn(BaseModel):
    items: List[OrderItemIn]
    address: AddressIn
    billing: Optional[AddressIn] = None
    coupon: Optional[str] = None


class CouponValidateIn(BaseModel):
    code: str
    subtotal: float


class CategoryIn(BaseModel):
    name: str
    group: str  # notes | books
    parent_id: Optional[str] = None


class ReorderIn(BaseModel):
    ordered_ids: List[str]


class ProductIn(BaseModel):
    title: str
    description: str = ""
    category_id: str
    type: str = "physical"  # physical | digital | both
    price: float
    discount_price: Optional[float] = None
    stock: int = 0
    images: List[str] = []
    cover: str = ""
    sample_pdf: str = ""
    full_pdf: str = ""
    specs: dict = {}
    featured: bool = False


class OrderUpdateIn(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None


class PaymentCreateIn(BaseModel):
    order_id: str


class PaymentVerifyIn(BaseModel):
    order_id: str
    razorpay_payment_id: str
    razorpay_signature: str = ""


class WishlistIn(BaseModel):
    product_id: str


# ---------------- Serializers ----------------

def public_product(p: dict) -> dict:
    p = dict(p)
    p.pop("_id", None)
    p.pop("full_pdf", None)
    return p


def public_order(o: dict) -> dict:
    o = dict(o)
    o.pop("_id", None)
    return o


# ---------------- Config / health ----------------

@api_router.get("/")
async def root():
    return {"message": "GK GS Masti Store API"}


@api_router.get("/config")
async def get_config():
    return {
        "store_name": "GK GS Masti Store",
        "shipping_fee": SHIPPING_FEE,
        "support_whatsapp": SUPPORT_WHATSAPP,
        "payment_mode": "live" if (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) else "mock",
    }


# ---------------- Auth ----------------

@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(400, "Invalid email address")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not re.match(r"^\d{10}$", body.mobile.strip()):
        raise HTTPException(400, "Mobile number must be 10 digits")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user = {
        "id": new_id(),
        "name": body.name.strip(),
        "email": email,
        "mobile": body.mobile.strip(),
        "address": body.address.strip(),
        "role": "user",
        "password_hash": hash_password(body.password),
        "created_at": now().isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api_router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until"):
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > now():
            raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"updated_at": now().isoformat()}},
            upsert=True,
        )
        attempt = await db.login_attempts.find_one({"identifier": identifier})
        if attempt and attempt.get("count", 0) >= 5:
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"locked_until": (now() + timedelta(minutes=15)).isoformat(), "count": 0}},
            )
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    token = create_token(user)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"status": "logged_out"}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api_router.put("/auth/profile")
async def update_profile(body: ProfileIn, user=Depends(get_current_user)):
    updates = {}
    for field in ("name", "mobile", "address"):
        val = getattr(body, field)
        if val is not None:
            updates[field] = val
    if body.password:
        if len(body.password) < 6:
            raise HTTPException(400, "Password must be at least 6 characters")
        updates["password_hash"] = hash_password(body.password)
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


# ---------------- Categories ----------------

@api_router.get("/categories")
async def list_categories():
    return await db.categories.find({}, {"_id": 0}).sort([("position", 1), ("name", 1)]).to_list(500)


@api_router.post("/admin/categories")
async def create_category(body: CategoryIn, admin=Depends(require_admin)):
    if body.group not in ("notes", "books"):
        raise HTTPException(400, "Group must be 'notes' or 'books'")
    parent_id = None
    if body.parent_id:
        parent = await db.categories.find_one({"id": body.parent_id})
        if not parent:
            raise HTTPException(400, "Parent category not found")
        if parent["group"] != body.group:
            raise HTTPException(400, "Sub-category must be in the same group as its parent")
        if parent.get("parent_id"):
            raise HTTPException(400, "Only one level of sub-categories is allowed")
        parent_id = parent["id"]
    slug = slugify(body.name)
    if await db.categories.find_one({"slug": slug, "group": body.group}):
        raise HTTPException(400, "Category already exists in this group")
    position = await db.categories.count_documents({"group": body.group, "parent_id": parent_id})
    cat = {"id": new_id(), "name": body.name.strip(), "slug": slug, "group": body.group, "parent_id": parent_id, "position": position, "created_at": now().isoformat()}
    await db.categories.insert_one(cat)
    cat.pop("_id", None)
    return cat


@api_router.put("/admin/categories/{cat_id}")
async def update_category(cat_id: str, body: CategoryIn, admin=Depends(require_admin)):
    result = await db.categories.update_one({"id": cat_id}, {"$set": {"name": body.name.strip(), "group": body.group}})
    if result.matched_count == 0:
        raise HTTPException(404, "Category not found")
    return await db.categories.find_one({"id": cat_id}, {"_id": 0})


@api_router.post("/admin/categories/reorder")
async def reorder_categories(body: ReorderIn, admin=Depends(require_admin)):
    for idx, cid in enumerate(body.ordered_ids):
        await db.categories.update_one({"id": cid}, {"$set": {"position": idx}})
    return {"status": "reordered"}


@api_router.delete("/admin/categories/{cat_id}")
async def delete_category(cat_id: str, admin=Depends(require_admin)):
    await db.categories.delete_many({"$or": [{"id": cat_id}, {"parent_id": cat_id}]})
    return {"status": "deleted"}


# ---------------- Products ----------------

@api_router.get("/products")
async def list_products(
    kind: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    featured: Optional[str] = None,
    sort: str = "new",
    limit: int = 60,
):
    query = {"active": True}
    if kind in ("notes", "books"):
        cats = await db.categories.find({"group": kind}, {"_id": 0, "id": 1}).to_list(200)
        query["category_id"] = {"$in": [c["id"] for c in cats]}
    if category:
        cat = await db.categories.find_one({"slug": category}, {"_id": 0})
        if cat:
            children = await db.categories.find({"parent_id": cat["id"]}, {"_id": 0, "id": 1}).to_list(100)
            query["category_id"] = {"$in": [cat["id"]] + [c["id"] for c in children]}
    if type in ("physical", "digital", "both"):
        query["type"] = type
    if featured == "true":
        query["featured"] = True
    if search:
        regex = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [{"title": regex}, {"description": regex}]
    sort_map = {"new": ("created_at", -1), "price_asc": ("discount_price", 1), "price_desc": ("discount_price", -1)}
    sort_field, sort_dir = sort_map.get(sort, ("created_at", -1))
    products = await db.products.find(query, {"_id": 0, "full_pdf": 0}).sort(sort_field, sort_dir).to_list(limit)
    cat_ids = list({p["category_id"] for p in products})
    cats = await db.categories.find({"id": {"$in": cat_ids}}, {"_id": 0}).to_list(200) if cat_ids else []
    cat_map = {c["id"]: c for c in cats}
    for p in products:
        c = cat_map.get(p["category_id"])
        p["category"] = {"name": c["name"], "slug": c["slug"], "group": c["group"]} if c else None
    return products


@api_router.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug}, {"_id": 0, "full_pdf": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    cat = await db.categories.find_one({"id": p["category_id"]}, {"_id": 0})
    p["category"] = cat
    if p.get("sample_pdf"):
        p["has_sample"] = True
    return p


@api_router.get("/products/{product_id}/sample")
async def get_sample_pdf(product_id: str):
    p = await db.products.find_one({"id": product_id})
    if not p or not p.get("sample_pdf"):
        raise HTTPException(404, "Sample not available")
    try:
        data, _ = get_object(p["sample_pdf"])
    except Exception:
        raise HTTPException(404, "Sample file missing")
    return Response(content=data, media_type="application/pdf")


@api_router.post("/products/{product_id}/reviews")
async def add_review(product_id: str, body: ReviewIn, user=Depends(get_current_user)):
    if not (1 <= body.rating <= 5):
        raise HTTPException(400, "Rating must be between 1 and 5")
    p = await db.products.find_one({"id": product_id})
    if not p:
        raise HTTPException(404, "Product not found")
    review = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user["name"],
        "rating": body.rating,
        "comment": body.comment.strip(),
        "created_at": now().isoformat(),
    }
    reviews = p.get("reviews", [])
    reviews = [r for r in reviews if r.get("user_id") != user["id"]] + [review]
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
    await db.products.update_one(
        {"id": product_id}, {"$set": {"reviews": reviews, "rating": avg, "review_count": len(reviews)}}
    )
    return review


# ---------------- Wishlist ----------------

@api_router.get("/wishlist")
async def get_wishlist(user=Depends(get_current_user)):
    items = await db.wishlist.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    out = []
    for item in items:
        p = await db.products.find_one({"id": item["product_id"], "active": True}, {"_id": 0, "full_pdf": 0})
        if p:
            out.append(p)
    return out


@api_router.post("/wishlist")
async def add_wishlist(body: WishlistIn, user=Depends(get_current_user)):
    if not await db.products.find_one({"id": body.product_id}):
        raise HTTPException(404, "Product not found")
    await db.wishlist.update_one(
        {"user_id": user["id"], "product_id": body.product_id},
        {"$setOnInsert": {"id": new_id(), "created_at": now().isoformat()}},
        upsert=True,
    )
    return {"status": "added"}


@api_router.delete("/wishlist/{product_id}")
async def remove_wishlist(product_id: str, user=Depends(get_current_user)):
    await db.wishlist.delete_one({"user_id": user["id"], "product_id": product_id})
    return {"status": "removed"}


# ---------------- Coupons ----------------

async def compute_discount(code: str, subtotal: float):
    if not code:
        return 0.0, None
    coupon = await db.coupons.find_one({"code": code.strip().upper(), "active": True})
    if not coupon:
        raise HTTPException(400, "Invalid coupon code")
    if subtotal < coupon.get("min_order", 0):
        raise HTTPException(400, f"Coupon requires minimum order of Rs.{coupon['min_order']}")
    if coupon["kind"] == "percent":
        discount = round(subtotal * coupon["value"] / 100, 2)
    else:
        discount = float(coupon["value"])
    return min(discount, subtotal), coupon["code"]


@api_router.post("/coupons/validate")
async def validate_coupon(body: CouponValidateIn):
    discount, code = await compute_discount(body.code, body.subtotal)
    return {"valid": True, "code": code, "discount": discount}


# ---------------- Orders & Payments ----------------

@api_router.post("/orders")
async def create_order(body: OrderIn, user=Depends(get_current_user)):
    if not body.items:
        raise HTTPException(400, "Cart is empty")
    items = []
    subtotal = 0.0
    has_physical = False
    has_digital = False
    for it in body.items:
        p = await db.products.find_one({"id": it.product_id, "active": True})
        if not p:
            raise HTTPException(400, "A product in your cart is no longer available")
        if it.qty < 1:
            raise HTTPException(400, "Invalid quantity")
        if p["type"] in ("physical", "both") and p.get("stock", 0) < it.qty:
            raise HTTPException(400, f"Insufficient stock for {p['title']}")
        price = p.get("discount_price") or p["price"]
        subtotal += price * it.qty
        if p["type"] in ("physical", "both"):
            has_physical = True
        if p["type"] in ("digital", "both"):
            has_digital = True
        items.append({
            "product_id": p["id"],
            "title": p["title"],
            "slug": p["slug"],
            "type": p["type"],
            "price": price,
            "qty": it.qty,
            "image": p.get("cover") or (p.get("images") or [""])[0],
        })
    discount, coupon_code = await compute_discount(body.coupon, subtotal) if body.coupon else (0.0, None)
    shipping = float(SHIPPING_FEE) if has_physical else 0.0
    total = round(subtotal - discount + shipping, 2)
    count = await db.orders.count_documents({})
    order = {
        "id": new_id(),
        "order_number": f"GKGS{1001 + count}",
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user["name"],
        "items": items,
        "subtotal": round(subtotal, 2),
        "discount": discount,
        "coupon_code": coupon_code,
        "shipping_fee": shipping,
        "total": total,
        "address": body.address.model_dump(),
        "billing": (body.billing or body.address).model_dump(),
        "has_physical": has_physical,
        "has_digital": has_digital,
        "status": "pending",
        "payment_status": "pending",
        "payment_method": "razorpay",
        "razorpay_order_id": None,
        "razorpay_payment_id": None,
        "tracking_number": "",
        "created_at": now().isoformat(),
    }
    await db.orders.insert_one(order)
    return public_order(order)


@api_router.get("/orders")
async def my_orders(user=Depends(get_current_user)):
    return await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    return o


@api_router.post("/payments/create-order")
async def create_payment_order(body: PaymentCreateIn, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": body.order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["payment_status"] == "paid":
        raise HTTPException(400, "Order already paid")
    amount_paise = int(round(order["total"] * 100))
    if amount_paise < 100:
        raise HTTPException(400, "Order amount too low (minimum Rs.1)")
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        import razorpay
        rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        try:
            rzo = rz.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
                "receipt": order["order_number"][:40],
            })
        except Exception as e:
            logger.error("Razorpay order creation failed: %s", e)
            raise HTTPException(500, "Failed to create payment order with Razorpay")
        await db.orders.update_one({"id": order["id"]}, {"$set": {"razorpay_order_id": rzo["id"]}})
        return {"mock": False, "key_id": RAZORPAY_KEY_ID, "razorpay_order_id": rzo["id"], "amount": amount_paise, "currency": "INR"}
    mock_id = "order_mock_" + uuid.uuid4().hex[:16]
    await db.orders.update_one({"id": order["id"]}, {"$set": {"razorpay_order_id": mock_id}})
    return {"mock": True, "key_id": "rzp_test_mock", "razorpay_order_id": mock_id, "amount": amount_paise, "currency": "INR"}


@api_router.post("/payments/verify")
async def verify_payment(body: PaymentVerifyIn, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": body.order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    if not body.razorpay_payment_id:
        raise HTTPException(400, "Missing payment id")
    if order["payment_status"] != "paid":
        if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
            import razorpay
            rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
            try:
                rz.utility.verify_payment_signature({
                    "razorpay_order_id": order["razorpay_order_id"],
                    "razorpay_payment_id": body.razorpay_payment_id,
                    "razorpay_signature": body.razorpay_signature,
                })
            except Exception:
                raise HTTPException(400, "Payment verification failed")
        for item in order["items"]:
            if item["type"] in ("physical", "both"):
                await db.products.update_one({"id": item["product_id"]}, {"$inc": {"stock": -item["qty"]}})
            if item["type"] in ("digital", "both"):
                await db.entitlements.update_one(
                    {"user_id": user["id"], "product_id": item["product_id"]},
                    {"$setOnInsert": {"id": new_id(), "order_id": order["id"], "granted_at": now().isoformat()}},
                    upsert=True,
                )
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "payment_status": "paid",
                "status": "confirmed",
                "razorpay_payment_id": body.razorpay_payment_id,
                "paid_at": now().isoformat(),
            }},
        )
    updated = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
    if updated["payment_status"] == "paid" and updated.get("has_physical"):
        try:
            await create_shiprocket_shipment(updated)
            updated = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
        except Exception as e:
            logger.error("Shiprocket shipment failed for %s: %s", updated.get("order_number"), e)
    return {"status": "paid", "order": updated}


# ---------------- Shiprocket shipping ----------------

async def sr_assign_awb(order_id: str, shipment_id):
    data = {"awb_code": "", "courier_name": "", "status": "AWB_FAILED"}
    try:
        awb_result = await sr_request("POST", "/courier/assign/awb", json={"shipment_id": int(shipment_id)})
        awb_data = awb_result.get("response", {}).get("data", {})
        if awb_data.get("awb_code"):
            data = {
                "awb_code": str(awb_data["awb_code"]),
                "courier_name": awb_data.get("courier_name") or "",
                "status": "AWB_ASSIGNED",
            }
        else:
            data["awb_error"] = awb_data.get("awb_assign_error") or awb_result.get("message") or "AWB assignment failed"
    except Exception as e:
        logger.error("AWB assignment failed for order %s: %s", order_id, e)
        data["awb_error"] = "AWB assignment request failed"
    return data


async def create_shiprocket_shipment(order: dict):
    if not shiprocket_enabled():
        raise HTTPException(400, "Shiprocket is not configured (missing pickup location)")
    existing = order.get("shiprocket") or {}
    if existing.get("awb_code"):
        return existing
    if existing.get("shipment_id"):
        awb = await sr_assign_awb(order["id"], existing["shipment_id"])
        updates = {f"shiprocket.{k}": v for k, v in awb.items()}
        if awb["awb_code"]:
            updates["tracking_number"] = awb["awb_code"]
        await db.orders.update_one({"id": order["id"]}, {"$set": updates})
        return {**existing, **awb}
    addr = order["address"]
    physical_items = [i for i in order["items"] if i["type"] in ("physical", "both")]
    if not physical_items:
        raise HTTPException(400, "Order has no physical items to ship")
    qty = sum(i["qty"] for i in physical_items)
    name_parts = addr["name"].strip().split(None, 1)
    sr_body = {
        "order_id": order["order_number"],
        "order_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "pickup_location": SHIPROCKET_PICKUP_LOCATION,
        "billing_customer_name": name_parts[0],
        "billing_last_name": name_parts[1] if len(name_parts) > 1 else "-",
        "billing_address": addr["line1"],
        "billing_address_2": addr.get("line2", ""),
        "billing_city": addr["city"],
        "billing_state": addr["state"],
        "billing_pincode": addr["pincode"],
        "billing_country": "India",
        "billing_email": order["user_email"],
        "billing_phone": addr["mobile"],
        "shipping_is_billing": True,
        "order_items": [
            {"name": i["title"][:100], "sku": i["product_id"][:20], "units": i["qty"], "selling_price": i["price"], "hsn": 4901}
            for i in physical_items
        ],
        "payment_method": "Prepaid",
        "shipping_charges": order.get("shipping_fee", 0),
        "sub_total": round(sum(i["price"] * i["qty"] for i in physical_items), 2),
        "length": 25, "breadth": 18, "height": 6,
        "weight": max(0.5, round(0.5 * qty, 2)),
    }
    created = await sr_request("POST", "/orders/create/adhoc", json=sr_body)
    shipment_id = created.get("shipment_id")
    if not shipment_id:
        raise HTTPException(502, "Shiprocket did not return a shipment id")
    data = {
        "shiprocket_order_id": created.get("order_id"),
        "shipment_id": shipment_id,
        "awb_code": "",
        "courier_name": "",
        "status": "CREATED",
        "created_at": now().isoformat(),
    }
    data.update(await sr_assign_awb(order["id"], shipment_id))
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {"shiprocket": data, **({"tracking_number": data["awb_code"]} if data["awb_code"] else {})}},
    )
    return data


@api_router.get("/orders/{order_id}/tracking")
async def track_order(order_id: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    sr = order.get("shiprocket") or {}
    if not sr.get("awb_code"):
        return {"available": False, "message": "Shipment is being prepared. Tracking activates once a courier is assigned.", "shiprocket": sr}
    if not shiprocket_enabled():
        return {"available": False, "message": "Tracking temporarily unavailable", "shiprocket": sr}
    try:
        data = await sr_request("GET", f"/courier/track/awb/{sr['awb_code']}")
    except Exception:
        return {"available": False, "message": "Tracking temporarily unavailable", "shiprocket": sr}
    tracking = data.get("tracking_data") or {}
    activities = [
        {"date": t.get("date"), "status": t.get("activity") or t.get("sr_status_label"), "location": t.get("location")}
        for t in (tracking.get("shipment_track_activities") or [])[:10]
    ]
    return {
        "available": True,
        "current_status": tracking.get("shipment_track", [{}])[0].get("current_status") or sr.get("status"),
        "awb_code": sr["awb_code"],
        "courier_name": sr.get("courier_name", ""),
        "eta": tracking.get("etd"),
        "activities": activities,
    }


@api_router.post("/shiprocket/webhook")
async def shiprocket_webhook(request: Request):
    if request.headers.get("x-api-key") != SHIPROCKET_WEBHOOK_SECRET:
        raise HTTPException(401, "Invalid webhook key")
    event = await request.json()
    order_number = str(event.get("order_id") or "")
    awb = str(event.get("awb") or "")
    status_raw = (event.get("current_status") or "").lower()
    updates = {"shiprocket.last_event_status": event.get("current_status"), "shiprocket.webhook_at": now().isoformat()}
    mapped = None
    if "delivered" in status_raw:
        mapped = "delivered"
    elif "rto" in status_raw or "returned" in status_raw:
        mapped = "returned"
    elif "cancel" in status_raw:
        mapped = "cancelled"
    elif any(k in status_raw for k in ("shipped", "in transit", "out for delivery", "pickup")):
        mapped = "shipped"
    if mapped:
        updates["status"] = mapped
    if order_number:
        await db.orders.update_one({"order_number": order_number}, {"$set": updates})
    elif awb:
        await db.orders.update_one({"shiprocket.awb_code": awb}, {"$set": updates})
    return {"ok": True}


# ---------------- Downloads ----------------

@api_router.get("/downloads")
async def my_downloads(user=Depends(get_current_user)):
    ents = await db.entitlements.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    out = []
    for e in ents:
        p = await db.products.find_one({"id": e["product_id"]}, {"_id": 0, "full_pdf": 0})
        if p:
            out.append({"product": p, "granted_at": e["granted_at"], "order_id": e.get("order_id")})
    return out


@api_router.get("/downloads/{product_id}/file")
async def download_file(product_id: str, user=Depends(get_current_user)):
    ent = await db.entitlements.find_one({"user_id": user["id"], "product_id": product_id})
    if not ent:
        raise HTTPException(403, "You have not purchased this PDF")
    p = await db.products.find_one({"id": product_id})
    if not p or not p.get("full_pdf"):
        raise HTTPException(404, "File not available")
    try:
        data, _ = get_object(p["full_pdf"])
    except Exception:
        raise HTTPException(404, "File missing on server")
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{p["slug"]}.pdf"'},
    )


# ---------------- Testimonials ----------------

@api_router.get("/testimonials")
async def list_testimonials():
    return await db.testimonials.find({}, {"_id": 0}).to_list(50)


# ---------------- Admin: uploads ----------------

@api_router.post("/admin/upload")
async def admin_upload(kind: str = Form(...), file: UploadFile = File(...), admin=Depends(require_admin)):
    folder_map = {"cover": "covers", "sample": "samples", "pdf": "pdfs"}
    if kind not in folder_map:
        raise HTTPException(400, "Invalid upload kind")
    ext = Path(file.filename or "file").suffix.lower() or (".pdf" if kind != "cover" else ".png")
    path = f"{APP_NAME}/{folder_map[kind]}/{uuid.uuid4().hex}{ext}"
    content_type = file.content_type or ("application/pdf" if kind != "cover" else "image/png")
    put_object(path, await file.read(), content_type)
    return {"path": path, "kind": kind}


@api_router.get("/files/{path:path}")
async def serve_public_file(path: str):
    if not (path.startswith(f"{APP_NAME}/covers/") or path.startswith(f"{APP_NAME}/samples/")):
        raise HTTPException(403, "Forbidden")
    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(404, "File not found")
    return Response(content=data, media_type=content_type)


# ---------------- Admin: products ----------------

@api_router.get("/admin/products")
async def admin_list_products(admin=Depends(require_admin)):
    return await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.post("/admin/products")
async def admin_create_product(body: ProductIn, admin=Depends(require_admin)):
    if body.type not in ("physical", "digital", "both"):
        raise HTTPException(400, "Invalid product type")
    if not await db.categories.find_one({"id": body.category_id}):
        raise HTTPException(400, "Invalid category")
    slug = slugify(body.title)
    if await db.products.find_one({"slug": slug}):
        slug = f"{slug}-{new_id()[:6]}"
    product = body.model_dump()
    product.update({
        "id": new_id(),
        "slug": slug,
        "active": True,
        "rating": 0,
        "review_count": 0,
        "reviews": [],
        "created_at": now().isoformat(),
    })
    await db.products.insert_one(product)
    product.pop("_id", None)
    return product


@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, body: ProductIn, admin=Depends(require_admin)):
    updates = body.model_dump()
    result = await db.products.update_one({"id": product_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin=Depends(require_admin)):
    await db.products.delete_one({"id": product_id})
    return {"status": "deleted"}


# ---------------- Admin: orders ----------------

@api_router.get("/admin/orders")
async def admin_list_orders(type: Optional[str] = None, status: Optional[str] = None, admin=Depends(require_admin)):
    query = {}
    if type == "physical":
        query["has_physical"] = True
    elif type == "digital":
        query["has_digital"] = True
        query["has_physical"] = False
    if status:
        query["status"] = status
    return await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.put("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, body: OrderUpdateIn, admin=Depends(require_admin)):
    updates = {}
    if body.status:
        if body.status not in ("pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"):
            raise HTTPException(400, "Invalid status")
        updates["status"] = body.status
    if body.tracking_number is not None:
        updates["tracking_number"] = body.tracking_number
    if updates:
        result = await db.orders.update_one({"id": order_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(404, "Order not found")
    return await db.orders.find_one({"id": order_id}, {"_id": 0})


@api_router.post("/admin/orders/{order_id}/ship")
async def admin_create_shipment(order_id: str, admin=Depends(require_admin)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["payment_status"] != "paid":
        raise HTTPException(409, "Order is not paid yet")
    if not order.get("has_physical"):
        raise HTTPException(400, "Order has no physical items")
    try:
        return await create_shiprocket_shipment(order)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Shiprocket error for %s: %s", order.get("order_number"), e)
        raise HTTPException(502, "Shiprocket API error — check credentials and pickup location")


# ---------------- Admin: customers ----------------

@api_router.get("/admin/customers")
async def admin_list_customers(admin=Depends(require_admin)):
    users = await db.users.find({"role": "user"}, {"_id": 0, "password_hash": 0}).to_list(2000)
    out = []
    for u in users:
        orders = await db.orders.find({"user_id": u["id"]}, {"_id": 0, "total": 1, "payment_status": 1}).to_list(500)
        u["order_count"] = len(orders)
        u["total_spent"] = sum(o["total"] for o in orders if o["payment_status"] == "paid")
        out.append(u)
    return out


@api_router.get("/admin/customers/{user_id}")
async def admin_customer_detail(user_id: str, admin=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "Customer not found")
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    ents = await db.entitlements.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    for e in ents:
        p = await db.products.find_one({"id": e["product_id"]}, {"_id": 0, "title": 1, "slug": 1})
        e["product_title"] = p["title"] if p else "Unknown"
    return {"customer": u, "orders": orders, "entitlements": ents}


# ---------------- Admin: analytics ----------------

@api_router.get("/admin/analytics")
async def admin_analytics(admin=Depends(require_admin)):
    all_orders = await db.orders.find({}, {"_id": 0}).to_list(5000)
    paid = [o for o in all_orders if o["payment_status"] == "paid"]
    total_revenue = round(sum(o["total"] for o in paid), 2)
    physical_sales = 0.0
    digital_sales = 0.0
    for o in paid:
        for item in o["items"]:
            amount = item["price"] * item["qty"]
            if item["type"] == "physical":
                physical_sales += amount
            elif item["type"] == "digital":
                digital_sales += amount
            else:
                physical_sales += amount / 2
                digital_sales += amount / 2
    pending_deliveries = len([
        o for o in paid if o.get("has_physical") and o["status"] in ("confirmed", "processing", "shipped")
    ])
    total_learners = await db.users.count_documents({"role": "user"})
    recent = sorted(all_orders, key=lambda o: o["created_at"], reverse=True)[:6]
    return {
        "total_revenue": total_revenue,
        "total_orders": len(all_orders),
        "total_learners": total_learners,
        "physical_sales": round(physical_sales, 2),
        "digital_sales": round(digital_sales, 2),
        "pending_deliveries": pending_deliveries,
        "total_products": await db.products.count_documents({}),
        "recent_orders": recent,
    }


# ---------------- SEO ----------------

@api_router.get("/sitemap.xml")
async def sitemap(request: Request):
    host = request.headers.get("x-forwarded-host") or request.url.netloc
    proto = request.headers.get("x-forwarded-proto", "https")
    base = f"{proto}://{host}"
    urls = ["/", "/cart", "/about", "/privacy-policy", "/refund-policy", "/terms", "/login", "/register"]
    cats = await db.categories.find({}, {"_id": 0}).to_list(200)
    for c in cats:
        urls.append(f"/category/{c['group']}/{c['slug']}")
    products = await db.products.find({"active": True}, {"_id": 0, "slug": 1}).to_list(2000)
    for p in products:
        urls.append(f"/product/{p['slug']}")
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        xml += f"  <url><loc>{base}{u}</loc></url>\n"
    xml += "</urlset>"
    return Response(content=xml, media_type="application/xml")


# ---------------- Seed ----------------

SEED_IMAGES = [
    "https://images.unsplash.com/photo-1544456203-0af5a69f5789?crop=entropy&cs=srgb&fm=jpg&q=85",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?crop=entropy&cs=srgb&fm=jpg&q=85",
    "https://images.unsplash.com/photo-1516979187457-637abb4f9353?crop=entropy&cs=srgb&fm=jpg&q=85",
    "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?crop=entropy&cs=srgb&fm=jpg&q=85",
    "https://images.unsplash.com/photo-1577036057060-d318e280b0c2?crop=entropy&cs=srgb&fm=jpg&q=85",
    "https://images.unsplash.com/photo-1514369118554-e20d93546b30?crop=entropy&cs=srgb&fm=jpg&q=85",
    "https://images.unsplash.com/photo-1741699427788-74db37639fc3?crop=entropy&cs=srgb&fm=jpg&q=85",
    "https://images.unsplash.com/photo-1564609116494-380be7238d7d?crop=entropy&cs=srgb&fm=jpg&q=85",
]


def make_pdf_bytes(title: str, lines: List[str]) -> bytes:
    import io
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(60, 770, title[:70])
    c.setFont("Helvetica", 11)
    y = 735
    for line in lines:
        c.drawString(60, y, line[:95])
        y -= 20
        if y < 60:
            c.showPage()
            c.setFont("Helvetica", 11)
            y = 770
    c.save()
    return buf.getvalue()


async def seed_data():
    await db.users.create_index("email", unique=True)
    await db.wishlist.create_index([("user_id", 1), ("product_id", 1)], unique=True)
    await db.login_attempts.create_index("identifier")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "name": "Store Admin",
            "email": admin_email,
            "mobile": "9876543210",
            "address": "GK GS Masti Store, Patna, Bihar",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": now().isoformat(),
        })
        logger.info("Seeded admin user %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.categories.count_documents({}) == 0:
        exams = ["Bihar Daroga", "Bihar Police", "BPSC Teacher", "BSSC", "Railway", "SSC GD"]
        for group in ("notes", "books"):
            for name in exams:
                await db.categories.insert_one({
                    "id": new_id(), "name": name, "slug": slugify(name), "group": group,
                    "created_at": now().isoformat(),
                })
        logger.info("Seeded categories")

    missing_pos = await db.categories.find({"position": {"$exists": False}}).sort("created_at", 1).to_list(500)
    if missing_pos:
        scopes = {}
        for c in missing_pos:
            key = (c["group"], c.get("parent_id"))
            scopes.setdefault(key, []).append(c["id"])
        for (grp, pid), ids in scopes.items():
            base = await db.categories.count_documents({"group": grp, "parent_id": pid, "position": {"$exists": True}})
            for idx, cid in enumerate(ids):
                await db.categories.update_one({"id": cid}, {"$set": {"position": base + idx}})

    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([
            {"id": new_id(), "code": "WELCOME10", "kind": "percent", "value": 10, "min_order": 0, "active": True},
            {"id": new_id(), "code": "MASTI50", "kind": "flat", "value": 50, "min_order": 499, "active": True},
        ])

    if await db.testimonials.count_documents({}) == 0:
        await db.testimonials.insert_many([
            {"id": new_id(), "name": "Rahul Kumar", "exam": "Bihar Daroga 2025", "rating": 5,
             "text": "GK GS Masti's Daroga notes are pure gold. Crisp one-liners and previous year coverage helped me clear prelims in first attempt.",
             "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"},
            {"id": new_id(), "name": "Priya Singh", "exam": "BPSC Teacher", "rating": 5,
             "text": "Instant PDF download after payment, and the sample preview before buying is a great touch. Highly recommended for BPSC aspirants.",
             "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"},
            {"id": new_id(), "name": "Amit Verma", "exam": "SSC GD", "rating": 4,
             "text": "Ordered the SSC GD book + PDF combo. Book arrived in 4 days with tracking. PDF quality is excellent for revision on phone.",
             "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"},
            {"id": new_id(), "name": "Sneha Kumari", "exam": "Railway NTPC", "rating": 5,
             "text": "Best and most affordable notes for Railway exams. WhatsApp support replied within minutes when I had a download issue.",
             "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"},
        ])

    if await db.products.count_documents({}) == 0:
        cats = await db.categories.find({}, {"_id": 0}).to_list(200)
        cat_map = {(c["group"], c["slug"]): c["id"] for c in cats}

        def product(title, group, cat_slug, ptype, price, discount, stock, img_idx, featured, desc, pages):
            slug = slugify(title)
            sample_name, full_name = None, None
            if ptype in ("digital", "both"):
                sample_name = f"{APP_NAME}/samples/sample_{slug}.pdf"
                full_name = f"{APP_NAME}/pdfs/full_{slug}.pdf"
                put_object(sample_name, make_pdf_bytes(f"SAMPLE - {title}", [
                    "This is a free sample preview from GK GS Masti Store.",
                    "",
                    desc,
                    "",
                    "Inside the full PDF:",
                    "- Complete chapter-wise coverage as per latest syllabus",
                    "- Previous year questions with solutions",
                    "- One-liner revision points and mnemonics",
                    "",
                    "Buy the full PDF to unlock all pages instantly.",
                    "Preview only - GK GS Masti Store",
                ]), "application/pdf")
                put_object(full_name, make_pdf_bytes(title, [
                    desc,
                    "",
                    "Chapter 1: Overview and exam pattern analysis.",
                    "Chapter 2: Core concepts with solved examples.",
                    "Chapter 3: Previous year questions (2019-2025).",
                    "Chapter 4: Practice sets with answer keys.",
                    "Chapter 5: Quick revision one-liners.",
                    "",
                    "Thank you for purchasing from GK GS Masti Store!",
                    "All the best for your exam.",
                ]), "application/pdf")
            reviews = [
                {"id": new_id(), "user_id": "seed", "user_name": "Rakesh Y.", "rating": 5,
                 "comment": "Bahut badhiya content, exam oriented.", "created_at": now().isoformat()},
                {"id": new_id(), "user_id": "seed2", "user_name": "Neha K.", "rating": 4,
                 "comment": "Good value for money, fast delivery/download.", "created_at": now().isoformat()},
            ]
            return {
                "id": new_id(), "title": title, "slug": slug, "description": desc,
                "category_id": cat_map[(group, cat_slug)], "type": ptype,
                "price": price, "discount_price": discount, "stock": stock,
                "images": [SEED_IMAGES[img_idx % len(SEED_IMAGES)]],
                "cover": SEED_IMAGES[img_idx % len(SEED_IMAGES)],
                "sample_pdf": sample_name, "full_pdf": full_name,
                "specs": {"language": "Hindi", "pages": str(pages), "publisher": "GK GS Masti", "edition": "2026"},
                "featured": featured, "active": True,
                "rating": 4.5, "review_count": 2, "reviews": reviews,
                "created_at": now().isoformat(),
            }

        products = [
            product("Bihar Daroga Complete Handwritten Notes PDF", "notes", "bihar-daroga", "digital", 299, 199, 0, 5, True,
                    "Complete GS + Hindi notes for Bihar SI (Daroga) exam with previous year solved questions and one-liner revision points.", 320),
            product("Bihar Police Constable Quick Revision Notes PDF", "notes", "bihar-police", "digital", 199, 149, 0, 7, True,
                    "Quick revision notes for Bihar Police Constable exam covering GK, Hindi, Maths and current affairs.", 210),
            product("BPSC Teacher GS Complete Notes PDF", "notes", "bpsc-teacher", "digital", 349, 249, 0, 8, True,
                    "Full General Studies notes for BPSC Teacher (PRT/TGT/PGT) with Bihar special section and practice MCQs.", 410),
            product("BSSC Inter Level Complete Notes PDF", "notes", "bssc", "digital", 249, 179, 0, 2, False,
                    "Chapter-wise notes for BSSC Inter Level exam with solved previous year papers.", 280),
            product("Railway NTPC & Group D Science Notes PDF", "notes", "railway", "digital", 199, 129, 0, 3, False,
                    "Physics, Chemistry, Biology one-liner notes specially designed for RRB NTPC and Group D exams.", 190),
            product("SSC GD One-Liner Notes PDF", "notes", "ssc-gd", "digital", 149, 99, 0, 6, True,
                    "5000+ one-liner questions for SSC GD Constable covering GK, Maths, Reasoning and Hindi/English.", 240),
            product("GK GS Master Guide 2026 (Printed Book)", "books", "bihar-daroga", "physical", 499, 399, 50, 0, True,
                    "The flagship printed guide covering complete GS for all Bihar and central exams. Updated for 2026 pattern.", 560),
            product("Bihar Daroga 50 Practice Sets Book", "books", "bihar-daroga", "physical", 399, 299, 40, 4, True,
                    "50 full-length practice sets with detailed solutions for Bihar SI prelims and mains.", 420),
            product("BPSC Teacher Previous Year Question Bank", "books", "bpsc-teacher", "physical", 449, 349, 35, 1, True,
                    "Chapter-wise previous year questions (2011-2025) with explanations for BPSC Teacher exam.", 480),
            product("SSC GD Complete Book + PDF Combo", "books", "ssc-gd", "both", 599, 449, 25, 2, True,
                    "Printed book delivered to your home plus instant PDF access. Best value combo for SSC GD.", 520),
            product("Railway Group D Practice Book", "books", "railway", "physical", 349, 279, 60, 3, False,
                    "Practice book with 30 sets and detailed solutions for RRB Group D.", 380),
            product("BSSC Book + Notes PDF Combo", "books", "bssc", "both", 549, 399, 30, 4, False,
                    "Printed BSSC guide plus instant downloadable notes PDF for on-the-go revision.", 450),
        ]
        await db.products.insert_many(products)
        logger.info("Seeded %d products", len(products))


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error("Storage init failed: %s", e)
    try:
        await seed_data()
    except Exception as e:
        logger.error("Seed error: %s", e)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
