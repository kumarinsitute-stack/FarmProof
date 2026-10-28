import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:3000"

def get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, {"error": str(e)}

def post(path, body, headers=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode('utf-8')
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, {"error": str(e)}

print("=== FarmProof Cadastre & Policy Verification Tests ===")

# Test 1: Verify Policy 89401 (Ramulu Kurapati) - has Polygon
status, data = get("/api/policies/verify?policyNumber=89401")
assert status == 200, f"Expected 200 for 89401, got {status}: {data}"
assert data["found"] == True
assert "89401" in data["policyNumber"], f"Expected 89401 in policyNumber, got {data['policyNumber']}"
assert data["farmer"]["name"] == "Ramulu Kurapati"
assert data["land"]["surveyNumber"] == "412/A"
assert data["land"]["crop"] == "Paddy (Kharif)"
assert data["land"]["lat"] == 17.9689
assert data["land"]["lng"] == 79.5941
assert data["land"]["hasBoundaryPolygon"] == True, "Expected boundary polygon for 89401"
assert len(data["land"]["boundaryCoordinates"]) >= 3
print("[PASS] Test 1: Valid policy 89401 returned Ramulu Kurapati with verified cadastral polygon.")

# Test 2: Verify Policy 89402 (Lakshmi Bai) - Point GPS only, no boundary polygon
status, data = get("/api/policies/verify?policyNumber=89402")
assert status == 200, f"Expected 200 for 89402, got {status}: {data}"
assert data["found"] == True
assert "89402" in data["policyNumber"], f"Expected 89402 in policyNumber, got {data['policyNumber']}"
assert data["farmer"]["name"] == "Lakshmi Bai"
assert data["land"]["surveyNumber"] == "528/B"
assert data["land"]["crop"] == "Cotton (Kharif Season)"
assert data["land"]["lat"] == 17.9214
assert data["land"]["lng"] == 79.6412
assert data["land"]["hasBoundaryPolygon"] == False, "89402 should NOT have a boundary polygon"
assert data["land"]["boundaryCoordinates"] is None, "boundaryCoordinates must be None for 89402"
print("[PASS] Test 2: Valid policy 89402 returned Lakshmi Bai with Point GPS only (no invented polygon).")

# Test 3: Verify Policy 99001 (Mallesh Kompally) - Unsurveyed, no GPS coordinates
status, data = get("/api/policies/verify?policyNumber=99001")
assert status == 200, f"Expected 200 for 99001, got {status}: {data}"
assert data["found"] == True
assert data["farmer"]["name"] == "Mallesh Kompally"
assert data["land"]["lat"] is None, "Lat must be None when coordinates are missing"
assert data["land"]["lng"] is None, "Lng must be None when coordinates are missing"
assert data["land"]["hasGpsLocation"] == False, "hasGpsLocation must be False"
assert data["farmer"]["aadhaarVerified"] == False
assert data["farmer"]["aadhaarVerificationStatus"] == "Pending Verification"
print("[PASS] Test 3: Policy 99001 correctly flagged as missing cadastral coordinates without fake map pins.")

# Test 4: Full Policy Number Exact Search (PMFBY/TS/WR/2026/89401)
status, data = get("/api/policies/verify?policyNumber=" + urllib.parse.quote("PMFBY/TS/WR/2026/89401"))
assert status == 200
assert data["policyNumber"] == "PMFBY/TS/WR/2026/89401"
assert data["farmer"]["name"] == "Ramulu Kurapati"
print("[PASS] Test 4: Full PMFBY policy string exact lookup matched properly.")

# Test 5: Non-existent policy number (e.g. 99999 or INVALID_POLICY)
status, data = get("/api/policies/verify?policyNumber=INVALID_POLICY_99999")
assert status == 404, f"Expected 404 for invalid policy, got {status}: {data}"
assert data["found"] == False
assert "Policy Not Found" in data["error"]
print("[PASS] Test 5: Non-existent policy returned 404 Policy Not Found properly.")

# Test 6: Empty policy search rejected with 400
status, data = get("/api/policies/verify?policyNumber=")
assert status == 400
assert "Please enter a PMFBY policy number" in data["error"]
print("[PASS] Test 6: Empty query rejected with 400 validation error.")

# Test 7: Policy Import / Upload Workflow
new_policy_payload = {
    "policies": [
        {
            "policyNumber": "PMFBY/TS/WR/2026/77881",
            "farmerName": "Venkatesh Rao",
            "phone": "9848012345",
            "village": "Wardhannapet",
            "district": "Warangal Rural",
            "state": "Telangana",
            "surveyNumber": "612/D",
            "crop": "Chilli",
            "season": "Kharif 2026",
            "plotSize": "1.8 ha",
            "sumInsured": 75600,
            "lat": 17.8821,
            "lng": 79.5412,
            "boundaryCoordinates": [
                [17.8825, 79.5408],
                [17.8824, 79.5422],
                [17.8812, 79.5421],
                [17.8811, 79.5409]
            ],
            "aadhaarVerified": True,
            "isDemoRecord": True
        }
    ],
    "sourceName": "Evaluation Cadastre Dataset"
}

status, data = post("/api/policies/import", new_policy_payload)
assert status == 200
assert data["success"] == True
assert (data.get("imported", 0) + data.get("updated", 0)) >= 1
print("[PASS] Test 7: Policy import workflow indexed new policy 77881 successfully.")

# Test 8: Verify newly imported policy 77881
status, data = get("/api/policies/verify?policyNumber=77881")
assert status == 200
assert data["found"] == True
assert data["farmer"]["name"] == "Venkatesh Rao"
assert data["land"]["crop"] == "Chilli"
assert data["land"]["surveyNumber"] == "612/D"
assert data["land"]["hasBoundaryPolygon"] == True
print("[PASS] Test 8: Newly imported policy 77881 is immediately searchable and verified.")

# Test 9: Access Control Security (Farmer cannot view another farmer's sensitive claim dossier)
# Farmer 1 login:
status, f1 = post("/api/auth/login", {"identifier": "9848023145", "password": "Farmer@2026", "portalType": "farmer"})
assert status == 200
f1_token = f1["token"]

# Farmer 1 attempts to access FP-2038 (Lakshmi Bai's claim)
url = f"{BASE_URL}/api/applications/FP-2038"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {f1_token}"})
try:
    with urllib.request.urlopen(req) as resp:
        assert False, "Farmer should NOT be able to access another farmer's claim!"
except urllib.error.HTTPError as e:
    assert e.code == 403, f"Expected 403 Forbidden, got {e.code}"
    print("[PASS] Test 9: Backend prevented unauthorized farmer access to another farmer's claim (HTTP 403).")

print("\nALL 9 FUNCTIONAL VERIFICATION SCENARIOS PASSED WITH CODE 0!")
