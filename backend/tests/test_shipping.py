"""Shipping / Shiprocket / COD integration tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "palakneuroclinic@gmail.com", "password": "Admin@123"}
USER = {"email": "learner@test.com", "password": "test123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_token():
    r = requests.post(f"{API}/auth/login", json=USER, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def products():
    r = requests.get(f"{API}/products", timeout=20)
    assert r.status_code == 200
    prods = r.json()
    physical = next(p for p in prods if p["type"] == "physical")
    digital = next(p for p in prods if p["type"] == "digital")
    combo = next((p for p in prods if p["type"] == "both"), None)
    return {"physical": physical, "digital": digital, "combo": combo, "all": prods}


# ---------- Shipping check (public) ----------
def test_shipping_check_serviceable(products):
    body = {"pincode": "800020", "items": [{"product_id": products["physical"]["id"], "qty": 1}], "cod": False}
    r = requests.post(f"{API}/shipping/check", json=body, timeout=40)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("serviceable") is True
    assert d.get("shipping_fee") is not None and d["shipping_fee"] >= 0
    # should include courier info
    assert "courier_name" in d or "courier" in d or "message" in d


def test_shipping_check_unserviceable(products):
    body = {"pincode": "999999", "items": [{"product_id": products["physical"]["id"], "qty": 1}], "cod": False}
    r = requests.post(f"{API}/shipping/check", json=body, timeout=40)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("serviceable") is False


def test_shipping_check_invalid_pincode(products):
    body = {"pincode": "123", "items": [{"product_id": products["physical"]["id"], "qty": 1}], "cod": False}
    r = requests.post(f"{API}/shipping/check", json=body, timeout=20)
    assert r.status_code == 400


def test_shipping_check_digital_notes_shipped(products):
    """Digital notes are now PRINTED & SHIPPED — shipping fee must apply (>0 for serviceable pincode)."""
    body = {"pincode": "800020", "items": [{"product_id": products["digital"]["id"], "qty": 1}], "cod": False}
    r = requests.post(f"{API}/shipping/check", json=body, timeout=40)
    assert r.status_code == 200
    d = r.json()
    assert d.get("serviceable") is True
    assert not d.get("digital_only"), "Digital notes should NOT be treated as digital_only anymore"
    assert d.get("shipping_fee", 0) > 0, f"Expected shipping fee > 0, got {d.get('shipping_fee')}"


# ---------- Admin shipping settings ----------
def test_admin_shipping_settings_get(admin_token):
    r = requests.get(f"{API}/admin/settings/shipping",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ("courier_strategy", "free_shipping_above", "cod_enabled", "cod_charge", "pickup_pincode"):
        assert k in d


def test_admin_shipping_settings_put_persist(admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    cur = requests.get(f"{API}/admin/settings/shipping", headers=h, timeout=20).json()
    # change free_shipping_above to 500 then restore
    new_payload = {**cur, "free_shipping_above": 500}
    # remove non-model fields that may slip in
    new_payload.pop("id", None)
    r = requests.put(f"{API}/admin/settings/shipping", json=new_payload, headers=h, timeout=20)
    assert r.status_code == 200, r.text
    assert float(r.json()["free_shipping_above"]) == 500.0
    # restore
    restore = {**cur}
    restore.pop("id", None)
    r2 = requests.put(f"{API}/admin/settings/shipping", json=restore, headers=h, timeout=20)
    assert r2.status_code == 200
    assert float(r2.json()["free_shipping_above"]) == float(cur["free_shipping_above"])


def test_admin_shipping_settings_invalid_strategy(admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    cur = requests.get(f"{API}/admin/settings/shipping", headers=h, timeout=20).json()
    bad = {**cur, "courier_strategy": "random"}
    bad.pop("id", None)
    r = requests.put(f"{API}/admin/settings/shipping", json=bad, headers=h, timeout=20)
    assert r.status_code == 400


# ---------- Admin shiprocket status ----------
def test_admin_shiprocket_status(admin_token):
    r = requests.get(f"{API}/admin/shiprocket/status",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=40)
    assert r.status_code == 200
    d = r.json()
    assert "connected" in d
    # expect connected per playbook
    if d.get("connected"):
        assert isinstance(d.get("pickups"), list)


# ---------- COD order creation ----------
def test_cod_order_physical_success(user_token, products):
    h = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "items": [{"product_id": products["physical"]["id"], "qty": 1}],
        "address": {
            "name": "COD Tester", "mobile": "9876500000",
            "line1": "Test Line 1", "city": "Patna", "state": "Bihar",
            "pincode": "800020",
        },
        "payment_method": "cod",
    }
    r = requests.post(f"{API}/orders", json=payload, headers=h, timeout=60)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["payment_method"] == "cod"
    assert o["payment_status"] == "cod"
    assert o["status"] == "confirmed"
    assert o["shipping_fee"] >= 0


def test_cod_allowed_for_digital_notes(user_token, products):
    """Digital notes are now physical (printed & shipped) — COD must be allowed."""
    h = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "items": [{"product_id": products["digital"]["id"], "qty": 1}],
        "address": {
            "name": "COD Tester", "mobile": "9876500000",
            "line1": "Test Line 1", "city": "Patna", "state": "Bihar",
            "pincode": "800020",
        },
        "payment_method": "cod",
    }
    r = requests.post(f"{API}/orders", json=payload, headers=h, timeout=60)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["payment_method"] == "cod"
    assert o["payment_status"] == "cod"
    assert o["status"] == "confirmed"
    assert o["shipping_fee"] > 0, "Notes orders must have shipping fee"
    assert o.get("has_physical") is True
    assert o.get("has_digital") is False, "Notes-only order must NOT grant digital entitlement"


def test_cod_rejected_for_combo(user_token, products):
    """Combo (type='both') must reject COD because PDF unlocks instantly on payment."""
    if not products.get("combo"):
        pytest.skip("No combo product in catalog")
    h = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "items": [{"product_id": products["combo"]["id"], "qty": 1}],
        "address": {
            "name": "COD Tester", "mobile": "9876500000",
            "line1": "Test Line 1", "city": "Patna", "state": "Bihar",
            "pincode": "800020",
        },
        "payment_method": "cod",
    }
    r = requests.post(f"{API}/orders", json=payload, headers=h, timeout=30)
    assert r.status_code == 400, f"Expected 400 for COD on combo, got {r.status_code}: {r.text}"


def test_cod_blocked_from_payment_create(user_token, products):
    """COD order should not be allowed to create a razorpay prepaid order."""
    h = {"Authorization": f"Bearer {user_token}"}
    # create COD order
    payload = {
        "items": [{"product_id": products["physical"]["id"], "qty": 1}],
        "address": {
            "name": "COD Tester", "mobile": "9876500000",
            "line1": "Test Line 1", "city": "Patna", "state": "Bihar",
            "pincode": "800020",
        },
        "payment_method": "cod",
    }
    r = requests.post(f"{API}/orders", json=payload, headers=h, timeout=60)
    assert r.status_code == 200
    oid = r.json()["id"]
    r2 = requests.post(f"{API}/payments/create-order", json={"order_id": oid}, headers=h, timeout=20)
    assert r2.status_code == 400


def test_unserviceable_pincode_rejected_at_order(user_token, products):
    h = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "items": [{"product_id": products["physical"]["id"], "qty": 1}],
        "address": {
            "name": "T", "mobile": "9876500000",
            "line1": "x", "city": "x", "state": "x",
            "pincode": "999999",
        },
        "payment_method": "prepaid",
    }
    r = requests.post(f"{API}/orders", json=payload, headers=h, timeout=40)
    assert r.status_code == 400
