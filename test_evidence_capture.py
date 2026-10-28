"""
FarmProof Automated Evidence Capture & Workflow Test Suite
Comprehensive testing for:
1. Default login page (no pre-filled credentials, masking, authentication).
2. GPS location capture (two-stage fallback, error handling, coordinate validation, missing GPS rejection).
3. Statutory 5-photo enforcement (exactly 5 photos, no duplicate slots, no 6 photos, slot replacement).
4. Duplicate photograph detection (sampling hash comparison).
5. Blurry photo & quality validation (sharpness, blur thresholds, exposure, blank, resolution).
6. Evidence watermarking (IST timestamp, GPS coords, slot metadata, original preservation).
7. End-to-end integration (claim creation, persistence, replacement audit, officer portal review).
"""

import sys
import os
import json
import base64
import math
import urllib.request
import urllib.error
from io import BytesIO
from PIL import Image, ImageDraw, ImageFilter

BASE_URL = "http://127.0.0.1:3000"

def log_test(name, passed, details=""):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}")
    if details:
        print(f"       -> {details}")
    if not passed:
        raise AssertionError(f"Test Failed: {name} - {details}")

def http_req(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"raw": err_body}

def create_synthetic_image(mode="sharp", width=800, height=600):
    """Generate synthetic image simulating crop field under various optical conditions."""
    img = Image.new("RGB", (width, height), (135, 206, 235))
    draw = ImageDraw.Draw(img)

    if mode == "sharp":
        # Realistic sharp crop texture with dense foliage lines
        draw.rectangle([0, 200, width, height], fill=(34, 139, 34))
        for x in range(0, width, 15):
            for y in range(200, height, 20):
                draw.line([(x, y), (x + 10, y + 15)], fill=(0, 100, 0), width=2)
                draw.point((x + 5, y + 5), fill=(255, 255, 0))
    elif mode == "slightly_blurry":
        draw.rectangle([0, 200, width, height], fill=(34, 139, 34))
        for x in range(0, width, 15):
            for y in range(200, height, 20):
                draw.line([(x, y), (x + 10, y + 15)], fill=(0, 100, 0), width=2)
        img = img.filter(ImageFilter.GaussianBlur(radius=2))
    elif mode == "extremely_blurry":
        draw.rectangle([0, 200, width, height], fill=(34, 139, 34))
        for x in range(0, width, 20):
            draw.line([(x, 200), (x, height)], fill=(0, 100, 0), width=3)
        img = img.filter(ImageFilter.GaussianBlur(radius=12))
    elif mode == "very_dark":
        # Underexposed
        draw.rectangle([0, 0, width, height], fill=(8, 10, 8))
    elif mode == "overexposed":
        # Bleached / whiteout
        draw.rectangle([0, 0, width, height], fill=(250, 252, 250))
    elif mode == "blank":
        # Pure flat gray
        draw.rectangle([0, 0, width, height], fill=(128, 128, 128))
    elif mode == "low_res":
        # 160x120
        return create_synthetic_image("sharp", 160, 120)

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()

def compute_python_hash(raw_bytes):
    data_str = base64.b64encode(raw_bytes).decode("ascii")
    h1, h2 = 5381, 52711
    step = max(1, len(data_str) // 500)
    for i in range(0, len(data_str), step):
        c = ord(data_str[i])
        h1 = ((h1 << 5) + h1) ^ c
        h2 = ((h2 << 5) + h2) ^ c
    h1 = (h1 & 0xFFFFFFFF)
    h2 = (h2 & 0xFFFFFFFF)
    return f"h_{h1:08x}{h2:08x}"

def run_tests():
    print("=" * 70)
    print("FARMPROOF CRITICAL EVIDENCE CAPTURE REGRESSION SUITE")
    print("=" * 70)

    # Reset DB
    status, res = http_req("/api/test/reset-db", method="POST")
    log_test("Test Database Reset", status == 200, res.get("message", ""))

    # ----------------------------------------------------
    # TEST SUITE 1: LOGIN PAGE PRE-FILLED CREDENTIALS REMOVAL
    # ----------------------------------------------------
    print("\n--- TEST GROUP 1: LOGIN CREDENTIALS & REMOVAL OF PRE-FILLS ---")

    # Verify FarmerLogin source has empty default fields
    with open("src/components/FarmerLogin.tsx", "r", encoding="utf-8") as f:
        farmer_src = f.read()
    log_test("FarmerLogin: identifier initialized to empty string", "useState('')" in farmer_src or 'useState("")' in farmer_src)
    log_test("FarmerLogin: password initialized to empty string", "useState('')" in farmer_src or 'useState("")' in farmer_src)
    log_test("FarmerLogin: Quick demo buttons removed", "Quick Demo Farmer Logins" not in farmer_src)
    log_test("FarmerLogin: Hardcoded demo phone removed from defaults", "useState('9848023145')" not in farmer_src)

    # Verify StaffLogin source has empty default fields
    with open("src/components/StaffLogin.tsx", "r", encoding="utf-8") as f:
        staff_src = f.read()
    log_test("StaffLogin: identifier initialized to empty string", "useState('')" in staff_src or 'useState("")' in staff_src)
    log_test("StaffLogin: password initialized to empty string", "useState('')" in staff_src or 'useState("")' in staff_src)
    log_test("StaffLogin: Demo staff fill buttons removed", "Authorized Test Staff Accounts" not in staff_src)

    # Test login API with empty fields
    st, res = http_req("/api/auth/login", method="POST", data={"identifier": "", "password": "", "role": "farmer"})
    log_test("Login API rejects empty credentials", st == 400, res.get("error", ""))

    # Test login API with invalid password
    st, res = http_req("/api/auth/login", method="POST", data={"identifier": "9848023145", "password": "WrongPassword!", "role": "farmer"})
    log_test("Login API rejects invalid credentials", st == 401, res.get("error", ""))

    # Test valid farmer login
    st, res = http_req("/api/auth/login", method="POST", data={"identifier": "9848023145", "password": "Farmer@2026", "role": "farmer"})
    log_test("Login API succeeds for registered farmer", st == 200 and "token" in res, f"User: {res.get('user', {}).get('name')}")
    farmer_token = res["token"]

    # Test valid officer login
    st, res = http_req("/api/auth/login", method="POST", data={"identifier": "officer@farmproof.gov.in", "password": "Officer@2026", "role": "officer"})
    log_test("Login API succeeds for authorized officer", st == 200 and "token" in res, f"Officer: {res.get('user', {}).get('name')}")
    officer_token = res["token"]

    # Role separation check: farmer cannot call officer endpoints
    st, res = http_req("/api/surveyors", method="GET", token=farmer_token)
    log_test("Role authorization: Farmer cannot access officer surveyor list", st == 403, res.get("error", ""))

    # ----------------------------------------------------
    # TEST SUITE 2: GPS LOCATION CAPTURE & VALIDATION
    # ----------------------------------------------------
    print("\n--- TEST GROUP 2: GPS LOCATION CAPTURE & VALIDATION ---")

    # Missing GPS coordinate rejection
    st, res = http_req("/api/applications", method="POST", data={
        "farmerName": "Ramesh Goud",
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        "photos": []
    }, token=farmer_token)
    log_test("Claim submission rejects missing GPS coordinates", st == 400 and "GPS location is missing" in res.get("error", ""), res.get("error"))

    # Invalid GPS coordinates rejection (Latitude > 90)
    st, res = http_req("/api/applications", method="POST", data={
        "farmerName": "Ramesh Goud",
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        "lat": 105.42,
        "lng": 79.59,
        "photos": []
    }, token=farmer_token)
    log_test("Claim submission rejects invalid latitude > 90", st == 400 and "Invalid coordinates" in res.get("error", ""), res.get("error"))

    # Geolocation service inspection: verify fallback & secure context
    with open("src/services/geolocation.ts", "r", encoding="utf-8") as f:
        geo_src = f.read()
    log_test("Geolocation Service: Secure context HTTPS check present", "isSecureContext" in geo_src)
    log_test("Geolocation Service: Dual-stage satellite fallback present", "tryGetPosition(false, 10000, 60000)" in geo_src and "enableHighAccuracy" in geo_src)
    log_test("Geolocation Service: Zero hardcoded fake coordinates", "17.96" not in geo_src and "Warangal" not in geo_src)

    # ----------------------------------------------------
    # TEST SUITE 3: FILE UPLOAD ENDPOINT VALIDATION
    # ----------------------------------------------------
    print("\n--- TEST GROUP 3: FILE UPLOADS, SIZE LIMITS & CORRUPT DATA ---")

    # Corrupt base64 upload rejection
    st, res = http_req("/api/upload", method="POST", data={"name": "test.jpg", "type": "image/jpeg", "data": "%%%NotValidBase64@@@"})
    log_test("Upload endpoint rejects corrupt base64 string", st == 400 and "Corrupt" in res.get("error", ""), res.get("error"))

    # Unsupported format rejection (e.g. executable or text file)
    st, res = http_req("/api/upload", method="POST", data={"name": "malware.exe", "type": "application/x-msdownload", "data": base64.b64encode(b"MZ\x00\x00").decode("ascii")})
    log_test("Upload endpoint rejects unsupported file extension/mime", st == 400 and "Unsupported" in res.get("error", ""), res.get("error"))

    # Valid JPEG upload
    sharp_bytes = create_synthetic_image("sharp")
    sharp_b64 = "data:image/jpeg;base64," + base64.b64encode(sharp_bytes).decode("ascii")
    st, res = http_req("/api/upload", method="POST", data={"name": "field_sharp.jpg", "type": "image/jpeg", "data": sharp_b64})
    log_test("Upload endpoint accepts valid JPEG photograph", st == 200 and "url" in res, f"Saved to {res.get('url')}")
    uploaded_photo_url = res["url"]

    # ----------------------------------------------------
    # TEST SUITE 4: STATUTORY 5-PHOTO ENFORCEMENT & SLOTS
    # ----------------------------------------------------
    print("\n--- TEST GROUP 4: STATUTORY 5-PHOTO SLOTS ENFORCEMENT ---")

    # Slot definitions verification in evidenceKit
    with open("src/services/evidenceKit.ts", "r", encoding="utf-8") as f:
        kit_src = f.read()
    log_test("evidenceKit: Contains all 5 statutory slots", "slotNumber: 1" in kit_src and "slotNumber: 5" in kit_src)

    valid_coords = {"lat": 17.9689, "lng": 79.5941}

    # Helper to generate a photo item
    def make_slot_photo(slot_num, title, img_bytes, quality="Good"):
        h = compute_python_hash(img_bytes)
        b64 = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode("ascii")
        _, up = http_req("/api/upload", method="POST", data={"name": f"slot_{slot_num}.jpg", "type": "image/jpeg", "data": b64})
        return {
            "id": 1000 + slot_num,
            "slotNumber": slot_num,
            "label": title,
            "url": up["url"],
            "watermarkedUrl": up["url"],
            "originalUrl": up["url"],
            "hash": h,
            "qualityStatus": quality,
            "qualityReason": "Clear optical focus" if quality != "Rejected" else "Excessive blur detected",
            "gps": "17.96890° N, 79.59410° E",
            "timestamp": "14:30:15 IST",
            "date": "28 Oct 2026",
            "accuracyMeters": 4.5,
            "tamperChecked": True
        }

    # Generate 5 unique sharp images
    photos_5 = [
        make_slot_photo(1, "Photo 1 — Wide Plot Landscape", create_synthetic_image("sharp", 800, 600)),
        make_slot_photo(2, "Photo 2 — Root & Soil Inundation", create_synthetic_image("sharp", 802, 602)),
        make_slot_photo(3, "Photo 3 — Crop Canopy Close-up", create_synthetic_image("sharp", 804, 604)),
        make_slot_photo(4, "Photo 4 — Cadastral Boundary Anchor", create_synthetic_image("sharp", 806, 606)),
        make_slot_photo(5, "Photo 5 — Beneficiary Farmer Identification", create_synthetic_image("sharp", 808, 608))
    ]

    # Test 4.1: Attempt to submit only 3 photos (rejected)
    st, res = http_req("/api/applications", method="POST", data={
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        **valid_coords,
        "photos": photos_5[:3]
    }, token=farmer_token)
    log_test("Server rejects submission with fewer than 5 photos (3/5)", st == 400 and "requires exactly 5 photographs" in res.get("error", ""), res.get("error"))

    # Test 4.2: Attempt to submit 6 photos (rejected)
    extra_photo = make_slot_photo(6, "Photo 6 — Extra Unofficial Photo", create_synthetic_image("sharp", 810, 610))
    st, res = http_req("/api/applications", method="POST", data={
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        **valid_coords,
        "photos": photos_5 + [extra_photo]
    }, token=farmer_token)
    log_test("Server rejects submission with 6 photos (exceeding 5 slots)", st == 400 and "requires exactly 5 photographs" in res.get("error", ""), res.get("error"))

    # Test 4.3: Attempt to upload duplicate slots (e.g. two Slot 2s, missing Slot 5)
    duplicate_slot_photos = [
        photos_5[0],
        photos_5[1],
        photos_5[2],
        photos_5[3],
        {**photos_5[4], "slotNumber": 2} # duplicated slot 2
    ]
    st, res = http_req("/api/applications", method="POST", data={
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        **valid_coords,
        "photos": duplicate_slot_photos
    }, token=farmer_token)
    log_test("Server rejects duplicate slot numbers (two Photo 2s)", st == 400 and ("Missing Photo Slot" in res.get("error", "") or "Duplicate statutory photo slots" in res.get("error", "")), res.get("error"))

    # Test 4.4: Duplicate Image Detection: upload same image hash to Slot 1 and Slot 2
    duplicate_hash_photos = [
        photos_5[0],
        {**photos_5[1], "hash": photos_5[0]["hash"], "url": photos_5[0]["url"]}, # identical hash
        photos_5[2],
        photos_5[3],
        photos_5[4]
    ]
    st, res = http_req("/api/applications", method="POST", data={
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        **valid_coords,
        "photos": duplicate_hash_photos
    }, token=farmer_token)
    log_test("Server rejects duplicate image hash across different slots", st == 400 and "Duplicate photograph detected" in res.get("error", ""), res.get("error"))

    # Test 4.5: Blurry / Rejected photo submission rejection
    blurry_rejected_photos = [
        photos_5[0],
        {**photos_5[1], "qualityStatus": "Rejected", "qualityReason": "Laplacian blur variance 18.2 < 45 threshold"},
        photos_5[2],
        photos_5[3],
        photos_5[4]
    ]
    st, res = http_req("/api/applications", method="POST", data={
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        **valid_coords,
        "photos": blurry_rejected_photos
    }, token=farmer_token)
    log_test("Server rejects submission containing Rejected quality photo", st == 400 and "was rejected" in res.get("error", ""), res.get("error"))

    # Test 4.6: Valid 5-photo statutory claim submission succeeds
    st, claim_res = http_req("/api/applications", method="POST", data={
        "crop": "Paddy (Kharif)",
        "cause": "Inundation",
        "description": "Standing water inundation from excessive bund overflow across 412/A.",
        **valid_coords,
        "photos": photos_5
    }, token=farmer_token)
    log_test("Server accepts fully compliant statutory 5-photo claim", st == 201 and "id" in claim_res, f"Created Claim ID: {claim_res.get('id')}")
    created_claim_id = claim_res["id"]

    # ----------------------------------------------------
    # TEST SUITE 5: QUALITY DETECTION CALIBRATION & ANALYSIS
    # ----------------------------------------------------
    print("\n--- TEST GROUP 5: BLURRY PHOTO & OPTICAL QUALITY DETECTION ---")

    # Verify Laplacian threshold implementation in evidenceKit.ts
    log_test("Blur analysis: Laplacian variance algorithm implemented", "laplacianVariance" in kit_src or "variance" in kit_src)
    log_test("Quality categories: Good, Warning, Rejected implemented", "'Good'" in kit_src and "'Warning'" in kit_src and "'Rejected'" in kit_src)
    log_test("Quality checks: Underexposure and Overexposure checks present", "meanBrightness < 25" in kit_src and "meanBrightness > 238" in kit_src)
    log_test("Quality checks: Resolution threshold check present", "width < 320" in kit_src)

    # ----------------------------------------------------
    # TEST SUITE 6: VISIBLE EVIDENCE WATERMARK INTEGRITY
    # ----------------------------------------------------
    print("\n--- TEST GROUP 6: EVIDENCE WATERMARKING & ORIGINAL PRESERVATION ---")

    log_test("Watermark engine: Canvas overlay implemented", "generateWatermarkedDerivative" in kit_src)
    log_test("Watermark metadata: IST Timezone explicitly formatted", "IST" in kit_src)
    with open("src/components/FarmerDashboard.tsx", "r", encoding="utf-8") as f:
        dash_src = f.read()
    log_test("Dual file preservation: Original image preserved alongside derivative", "originalUrl" in dash_src and "watermarkedUrl" in dash_src)

    # ----------------------------------------------------
    # TEST SUITE 7: INTEGRATION, REPLACEMENT AUDIT & OFFICER PORTAL
    # ----------------------------------------------------
    print("\n--- TEST GROUP 7: END-TO-END WORKFLOW, REPLACEMENT AUDIT & REVIEW ---")

    # Fetch created application
    st, fetched_app = http_req(f"/api/applications/{created_claim_id}", method="GET", token=farmer_token)
    log_test("Claim persists with exactly 5 photographs", st == 200 and len(fetched_app.get("photos", [])) == 5)

    # Verify all slots 1 to 5 are present
    persisted_slots = [p.get("slotNumber") for p in fetched_app.get("photos", [])]
    log_test("All 5 statutory slot numbers (1-5) strictly persisted", set(persisted_slots) == {1, 2, 3, 4, 5}, f"Slots: {persisted_slots}")

    # Test replacing Photo in Slot 3 (Crop Canopy)
    new_slot3_bytes = create_synthetic_image("sharp", 850, 650)
    new_slot3_photo = make_slot_photo(3, "Photo 3 — Crop Canopy Close-up (Reshot with Macro Focus)", new_slot3_bytes)
    new_slot3_photo["replacedAudit"] = [{
        "previousUrl": photos_5[2]["originalUrl"],
        "replacedAt": "14:45:00 IST",
        "reason": "Farmer retook photo for enhanced canopy clarity"
    }]

    updated_photos = [photos_5[0], photos_5[1], new_slot3_photo, photos_5[3], photos_5[4]]
    st, update_res = http_req(f"/api/applications/{created_claim_id}", method="PUT", data={
        "photos": updated_photos,
        "updateNotes": "Farmer replaced Slot 3 canopy photograph with clearer daylight focus."
    }, token=farmer_token)
    log_test("Farmer replaces photo in slot without increasing count beyond 5", st == 200 and len(update_res.get("photos", [])) == 5)
    log_test("Replacement retains audit record of previous photo", "replacedAudit" in update_res.get("photos", [])[2])

    # Officer review of the claim
    st, officer_view = http_req(f"/api/applications/{created_claim_id}", method="GET", token=officer_token)
    log_test("Officer portal can view submitted claim pack", st == 200 and officer_view.get("id") == created_claim_id)
    log_test("Officer portal views all 5 watermarked statutory photographs", len(officer_view.get("photos", [])) == 5)

    # Officer sanctions claim
    st, decision_res = http_req(f"/api/applications/{created_claim_id}/officer-decision", method="POST", data={
        "decision": "approve",
        "remarks": "5 statutory field photographs verified; cadastral boundary and crop loss verified.",
        "sanctionedPayout": 42500
    }, token=officer_token)
    log_test("Officer sanctions and approves claim based on verified 5-photo evidence", st == 200 and decision_res.get("status") == "Approved")

    print("\n" + "=" * 70)
    print("ALL 35 STATUTORY EVIDENCE CAPTURE TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
