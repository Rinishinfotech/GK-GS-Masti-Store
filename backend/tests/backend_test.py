"""End-to-end backend tests for GK GS Masti Store."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback read from /app/frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1].rstrip("/")

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "palakneuroclinic@gmail.com"
ADMIN_PASSWORD = "Admin@123"

TS = int(time.time())
USER_EMAIL = f"testuser_{TS}@test.com"
USER_PASSWORD = "test123"

state = {}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_token(session):
    # register
    payload = {
        "name": "Test Learner",
        "email": USER_EMAIL,
        "mobile": "9876500000",
        "password": USER_PASSWORD,
        "address": "123 Test Street, Patna, Bihar 800001",
    }
    r = session.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    state["user_id"] = data["user"]["id"]
    return data["token"]


# ---------------- Health & config ----------------
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200


def test_config(session):
    r = session.get(f"{API}/config")
    assert r.status_code == 200
    d = r.json()
    assert "shipping_fee" in d


# ---------------- Categories & products ----------------
def test_categories(session):
    r = session.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) >= 12
    groups = {c["group"] for c in cats}
    assert "notes" in groups and "books" in groups
    state["categories"] = cats


def test_products_list(session):
    r = session.get(f"{API}/products")
    assert r.status_code == 200
    prods = r.json()
    assert len(prods) >= 1
    state["products"] = prods
    # verify no _id
    assert all("_id" not in p for p in prods)


def test_product_detail(session):
    r = session.get(f"{API}/products/bihar-daroga-complete-handwritten-notes-pdf")
    assert r.status_code == 200
    p = r.json()
    assert p["price"] > 0
    state["digital_product"] = p


def test_product_sample(session):
    p = state["digital_product"]
    r = session.get(f"{API}/products/{p['id']}/sample")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")


def test_products_filter_by_kind_notes(session):
    r = session.get(f"{API}/products", params={"kind": "notes"})
    assert r.status_code == 200
    for p in r.json():
        assert p["category"]["group"] == "notes"


def test_products_search(session):
    r = session.get(f"{API}/products", params={"search": "SSC"})
    assert r.status_code == 200
    # Should return results (SSC GD is a category)


# ---------------- Auth ----------------
def test_register_and_me(session, user_token):
    r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200
    assert r.json()["email"] == USER_EMAIL


def test_login_invalid(session):
    r = session.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_duplicate_register(session):
    r = session.post(f"{API}/auth/register", json={
        "name": "X", "email": USER_EMAIL, "mobile": "9876500000",
        "password": "test123", "address": "abc"})
    assert r.status_code == 400


# ---------------- Coupons ----------------
def test_coupon_welcome10(session):
    r = session.post(f"{API}/coupons/validate", json={"code": "WELCOME10", "subtotal": 1000})
    assert r.status_code == 200
    d = r.json()
    assert d["discount"] == 100 or abs(d["discount"] - 100) < 0.01


def test_coupon_masti50_min(session):
    r = session.post(f"{API}/coupons/validate", json={"code": "MASTI50", "subtotal": 100})
    # min 499 - either 400 or discount 0
    assert r.status_code in (200, 400)


# ---------------- Wishlist ----------------
def test_wishlist_add(session, user_token):
    h = {"Authorization": f"Bearer {user_token}"}
    pid = state["digital_product"]["id"]
    r = session.post(f"{API}/wishlist", json={"product_id": pid}, headers=h)
    assert r.status_code == 200
    r2 = session.get(f"{API}/wishlist", headers=h)
    assert r2.status_code == 200
    assert any(x["id"] == pid for x in r2.json())


# ---------------- Order + Mock Payment + Downloads ----------------
def test_create_order_digital_only(session, user_token):
    h = {"Authorization": f"Bearer {user_token}"}
    dp = state["digital_product"]
    payload = {
        "items": [{"product_id": dp["id"], "qty": 1}],
        "address": {
            "name": "Test Learner", "mobile": "9876500000",
            "line1": "123 Test", "city": "Patna", "state": "Bihar",
            "pincode": "800001",
        },
        "coupon": "WELCOME10",
    }
    r = session.post(f"{API}/orders", json=payload, headers=h)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["shipping_fee"] == 0  # digital only
    assert o["discount"] > 0
    state["order"] = o


def test_payment_create_and_verify(session, user_token):
    h = {"Authorization": f"Bearer {user_token}"}
    oid = state["order"]["id"]
    r = session.post(f"{API}/payments/create-order", json={"order_id": oid}, headers=h)
    assert r.status_code == 200
    d = r.json()
    assert d["mock"] is True
    r2 = session.post(f"{API}/payments/verify", json={
        "order_id": oid,
        "razorpay_order_id": d["razorpay_order_id"],
        "razorpay_payment_id": "pay_mock_test123",
        "razorpay_signature": "sig_mock",
    }, headers=h)
    assert r2.status_code == 200, r2.text
    assert r2.json()["order"]["payment_status"] == "paid"


def test_downloads_after_paid(session, user_token):
    h = {"Authorization": f"Bearer {user_token}"}
    r = session.get(f"{API}/downloads", headers=h)
    assert r.status_code == 200
    downloads = r.json()
    pid = state["digital_product"]["id"]
    assert any(d["product"]["id"] == pid for d in downloads)
    # download file
    r2 = session.get(f"{API}/downloads/{pid}/file", headers=h)
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("application/pdf")


def test_my_orders(session, user_token):
    h = {"Authorization": f"Bearer {user_token}"}
    r = session.get(f"{API}/orders", headers=h)
    assert r.status_code == 200
    orders = r.json()
    assert len(orders) >= 1
    assert orders[0]["payment_status"] == "paid"


# ---------------- Admin ----------------
def test_admin_login(session, admin_token):
    r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_admin_analytics(session, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    r = session.get(f"{API}/admin/analytics", headers=h)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_revenue", "total_orders", "total_learners", "physical_sales",
              "digital_sales", "pending_deliveries"):
        assert k in d


def test_admin_products_crud(session, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    cat = state["categories"][0]
    payload = {
        "title": f"TEST_Product_{TS}",
        "category_id": cat["id"],
        "type": "digital",
        "price": 199,
        "discount_price": 149,
        "description": "test",
        "stock": 0,
        "active": True,
    }
    r = session.post(f"{API}/admin/products", json=payload, headers=h)
    assert r.status_code == 200, r.text
    prod = r.json()
    pid = prod["id"]
    state["admin_product_id"] = pid

    # update (PUT requires full ProductIn body)
    updated_payload = dict(payload)
    updated_payload["price"] = 250
    r2 = session.put(f"{API}/admin/products/{pid}", json=updated_payload, headers=h)
    assert r2.status_code == 200, r2.text
    assert r2.json()["price"] == 250

    # verify list
    r3 = session.get(f"{API}/admin/products", headers=h)
    assert any(p["id"] == pid for p in r3.json())

    # delete
    r4 = session.delete(f"{API}/admin/products/{pid}", headers=h)
    assert r4.status_code == 200


def test_admin_order_update(session, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    oid = state["order"]["id"]
    r = session.put(f"{API}/admin/orders/{oid}", json={
        "status": "shipped",
        "tracking_number": "DL123456789IN",
    }, headers=h)
    assert r.status_code == 200
    assert r.json()["tracking_number"] == "DL123456789IN"
    assert r.json()["status"] == "shipped"


def test_admin_customers(session, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    r = session.get(f"{API}/admin/customers", headers=h)
    assert r.status_code == 200
    uid = state["user_id"]
    assert any(c["id"] == uid for c in r.json())
    r2 = session.get(f"{API}/admin/customers/{uid}", headers=h)
    assert r2.status_code == 200
    d = r2.json()
    assert d["customer"]["email"] == USER_EMAIL
    assert len(d["orders"]) >= 1
    assert len(d["entitlements"]) >= 1


def test_admin_categories_crud(session, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    r = session.post(f"{API}/admin/categories", json={
        "name": f"TEST_CTET_{TS}", "group": "notes"}, headers=h)
    assert r.status_code == 200
    cat_id = r.json()["id"]
    # ensure appears in list
    r2 = session.get(f"{API}/categories")
    assert any(c["id"] == cat_id for c in r2.json())
    # cleanup
    session.delete(f"{API}/admin/categories/{cat_id}", headers=h)


def test_admin_forbidden_for_user(user_token):
    # Use fresh session so no admin cookies leak from shared session fixture
    s = requests.Session()
    h = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
    r = s.get(f"{API}/admin/analytics", headers=h)
    assert r.status_code in (401, 403)
