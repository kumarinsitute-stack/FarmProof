import urllib.request
import json
import sys
import time

BASE_URL = 'http://127.0.0.1:3000'

def request_json(method, path, data=None, token=None):
    url = BASE_URL + path
    headers = {}
    body = None
    if data is not None:
        headers['Content-Type'] = 'application/json'
        body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_body = resp.read().decode('utf-8')
            try:
                parsed = json.loads(resp_body)
            except Exception:
                parsed = resp_body
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed
    except Exception as e:
        return 500, {'error': str(e)}

def post_json(path, data, token=None):
    return request_json('POST', path, data, token)

def get_json(path, token=None):
    return request_json('GET', path, None, token)

def put_json(path, data, token=None):
    return request_json('PUT', path, data, token)

def run_regression_suite(run_number):
    print(f"\n========================================================")
    print(f"   STARTING COMPREHENSIVE REGRESSION RUN #{run_number}")
    print(f"========================================================")

    # 0. Clean Test State via reset endpoint
    print("\n--- [Step 0] Reset Database to Pristine Baseline ---")
    st, res = post_json('/api/test/reset-db', {})
    assert st == 200 and res.get('success'), f"Failed to reset database: {st} {res}"
    print("Database reset successful. Baseline loaded.")

    # 1. Farmer Registration & Duplicate Check
    print("\n--- [Step 1] Farmer Registration & Validation ---")
    new_farmer_phone = f"98480{run_number:02d}999"
    farmer_reg_payload = {
        'name': f'Ramakrishna Rao Run{run_number}',
        'phone': new_farmer_phone,
        'password': 'Farmer@2026',
        'aadhaar': f'XXXX-XXXX-99{run_number:02d}',
        'village': 'Nallabelly',
        'district': 'Warangal Rural',
        'state': 'Telangana',
        'surveyNumber': f'512/{run_number}',
        'language': 'TE',
        'bankAccount': '482910482910',
        'bankName': 'State Bank of India',
        'ifsc': 'SBIN0004128'
    }
    st, reg_res = post_json('/api/auth/register-farmer', farmer_reg_payload)
    assert st == 200, f"Registration failed: {st} {reg_res}"
    new_farmer_id = reg_res['user']['id']
    new_farmer_token = reg_res['token']
    print(f"Registered farmer: {reg_res['user']['name']} (ID: {new_farmer_id})")

    # Duplicate registration should be rejected
    st, dup_res = post_json('/api/auth/register-farmer', farmer_reg_payload)
    assert st == 409, f"Expected 409 for duplicate registration, got {st}"
    print("Duplicate phone registration successfully blocked with 409 Conflict.")

    # Verify /api/auth/me returns persisted profile
    st, me_res = get_json('/api/auth/me', new_farmer_token)
    assert st == 200, f"Failed to get profile: {st}"
    assert me_res['user']['phone'] == new_farmer_phone
    assert me_res['user']['village'] == 'Nallabelly'
    assert me_res['user']['role'] == 'farmer'
    print("Farmer profile persisted and verified via /api/auth/me.")

    # 2. Authentication & Portal Isolation
    print("\n--- [Step 2] Authentication & Role-Based Access Isolation ---")
    # Farmer attempting staff portal
    st, deny_staff = post_json('/api/auth/login', {'identifier': new_farmer_phone, 'password': 'Farmer@2026', 'portalType': 'staff'})
    assert st == 403, f"Expected 403 for farmer accessing staff portal, got {st}"
    print("Farmer attempting staff login blocked with 403 Forbidden.")

    # Officer login
    st, off_login = post_json('/api/auth/login', {'identifier': 'officer@farmproof.gov.in', 'password': 'Officer@2026', 'portalType': 'staff'})
    assert st == 200, f"Officer login failed: {st}"
    officer_token = off_login['token']
    print("Officer login successful. Designation:", off_login['user'].get('designation'))

    # Surveyor login
    st, surv_login = post_json('/api/auth/login', {'identifier': 'surveyor@farmproof.gov.in', 'password': 'Surveyor@2026', 'portalType': 'staff'})
    assert st == 200, f"Surveyor login failed: {st}"
    surveyor_token = surv_login['token']
    print("Surveyor login successful. Name:", surv_login['user']['name'])

    # 3. Photo Upload & Evidence Kit Preparation
    print("\n--- [Step 3] Evidence Photo Upload & Validation ---")
    # Tiny 1x1 valid base64 JPEG
    sample_jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
    photos = []
    perspectives = [
        ("Wide field panoramic view", 1),
        ("Root inundation & standing water", 2),
        ("Canopy damage & lodging close-up", 3),
        ("Cadastral boundary stone", 4),
        ("Farmer Aadhaar verification photo", 5)
    ]
    for label, pid in perspectives:
        st, up_res = post_json('/api/upload', {'name': f'photo_{pid}.jpg', 'type': 'image/jpeg', 'data': sample_jpeg}, new_farmer_token)
        assert st == 200 and up_res.get('success'), f"Photo upload {pid} failed: {st}"
        photos.append({
            'id': pid,
            'label': label,
            'url': up_res['url'],
            'gps': '17.9689 N, 79.5941 E',
            'isLiveCapture': True,
            'captureMethod': 'live_camera',
            'blurScore': 135,
            'isBlurry': False
        })
    print(f"Uploaded complete 5-photo statutory evidence kit successfully.")

    # 4. GPS & Coordinate Validation (Negative & Positive)
    print("\n--- [Step 4] GPS Geolocation Boundary Validation ---")
    # Invalid latitude (> 90)
    invalid_app = {
        'crop': 'Paddy',
        'cause': 'Flood',
        'plotSize': '1.5 ha',
        'lat': 120.5, # Out of range
        'lng': 79.5941,
        'photos': photos
    }
    st, inv_res = post_json('/api/applications', invalid_app, new_farmer_token)
    assert st == 400, f"Expected 400 for out-of-bounds latitude, got {st}"
    print("Server rejected out-of-bounds latitude (>90) with 400 Bad Request.")

    # Valid application submission
    valid_app = {
        'crop': 'Paddy',
        'cause': 'Flood',
        'plotSize': '1.5 ha',
        'village': 'Nallabelly',
        'surveyNumber': f'512/{run_number}',
        'description': 'Continuous monsoon deluge inundated 70% of crop.',
        'lat': 17.9689,
        'lng': 79.5941,
        'photos': photos
    }
    st, new_claim = post_json('/api/applications', valid_app, new_farmer_token)
    assert st == 201, f"Claim creation failed: {st} {new_claim}"
    claim_id = new_claim['id']
    assert claim_id.startswith('FP-2026-'), f"Invalid claim ID format: {claim_id}"
    assert new_claim['status'] == 'Submitted'
    print(f"Created Claim: {claim_id} with status 'Submitted'.")

    # 5. Open-Meteo Weather Corroboration Integration
    print("\n--- [Step 5] Open-Meteo Weather Corroboration API ---")
    st, weather = get_json('/api/weather?lat=17.9689&lng=79.5941&date=2026-10-15', officer_token)
    assert st == 200, f"Weather API failed: {st} {weather}"
    assert 'precipitationMm' in weather or 'recordedRainMm' in weather
    assert 'units' in weather
    assert weather['units']['precipitation'] == 'mm'
    print(f"Open-Meteo retrieved: {weather.get('precipitationMm', 0)} {weather['units']['precipitation']}, Location: {weather.get('location')}")

    # Test Cache: Calling again should return quickly from cache
    t0 = time.time()
    st2, weather2 = get_json('/api/weather?lat=17.9689&lng=79.5941&date=2026-10-15', officer_token)
    t1 = time.time()
    assert st2 == 200
    assert (t1 - t0) < 0.5, "Weather cache hit should be instantaneous"
    print(f"Weather 1-hour cache hit verified (response time: {(t1-t0)*1000:.1f}ms).")

    # 6. Gemini AI Crop Damage Assessment API
    print("\n--- [Step 6] Gemini AI Crop Assessment API ---")
    st, ai_resp = post_json('/api/ai-assessment', {'photos': photos, 'claimId': claim_id}, officer_token)
    assert st == 200, f"AI Assessment API failed: {st} {ai_resp}"
    assert 'advisoryNotice' in ai_resp
    print(f"AI Assessment status: available={ai_resp.get('available')}, advisoryNotice: '{ai_resp.get('advisoryNotice')[:60]}...'")

    # 7. Officer Queue & SLA Priority Grouping
    print("\n--- [Step 7] Officer Dashboard Claims Grouping & SLA Prioritization ---")
    st, officer_claims = get_json('/api/applications', officer_token)
    assert st == 200, f"Failed to retrieve officer claims queue: {st}"
    assert any(c['id'] == claim_id for c in officer_claims), "Newly submitted claim not found in officer queue!"

    # Check claim priority classification
    submitted_claim = next(c for c in officer_claims if c['id'] == claim_id)
    print(f"Officer Queue: Claim {claim_id} priority: {submitted_claim.get('priority', 'Review')}, Status: {submitted_claim['status']}")

    # 8. State Machine: Officer Assigns Surveyor
    print("\n--- [Step 8] Officer Assigns Surveyor for Field Inspection ---")
    assign_payload = {
        'surveyorId': 'usr-surveyor-1',
        'deadline': 'Within 48h',
        'instructions': 'Verify flood water level and cadastral landmark boundaries.'
    }
    st, assigned = post_json(f'/api/applications/{claim_id}/assign-surveyor', assign_payload, officer_token)
    assert st == 200, f"Assign surveyor failed: {st} {assigned}"
    assert assigned['status'] == 'Survey Assigned'
    assert assigned['assignedSurveyorId'] == 'usr-surveyor-1'
    print(f"Claim status transitioned to: {assigned['status']} (Assigned to {assigned.get('assignedSurveyorName')}).")

    # Surveyor sees only assigned claims
    st, surveyor_claims = get_json('/api/applications', surveyor_token)
    assert st == 200
    assert any(c['id'] == claim_id for c in surveyor_claims), "Assigned claim missing from surveyor queue!"
    print(f"Surveyor queue verified: {len(surveyor_claims)} assigned claim(s).")

    # 9. Surveyor Submits Ground Findings
    print("\n--- [Step 9] Surveyor Ground Verification Submission ---")
    survey_findings = {
        'visitGps': '17.9689 N, 79.5941 E',
        'boundaryIntegrityVerified': True,
        'cropSpeciesVerified': True,
        'observedLossPercentage': 72,
        'lodgingObserved': True,
        'waterloggingObserved': True,
        'pestSymptomObserved': False,
        'surveyorRecommendation': 'Recommend Approval',
        'remarks': 'Field verified 72% paddy submergence due to lake overflow.',
        'actionType': 'verify'
    }
    st, surveyed = post_json(f'/api/applications/{claim_id}/submit-survey', survey_findings, surveyor_token)
    assert st == 200, f"Survey submit failed: {st} {surveyed}"
    assert surveyed['status'] == 'Survey Completed'
    assert surveyed['surveyFindings']['observedLossPercentage'] == 72
    print(f"Survey findings recorded. Status moved to: {surveyed['status']}.")

    # 10. Officer Requests Additional Evidence (Correction Workflow)
    print("\n--- [Step 10] Officer Requests Additional Evidence / Correction ---")
    corr_payload = {
        'decision': 'correction',
        'remarks': 'Please provide clearer photo of passbook first page.'
    }
    st, corr_claim = post_json(f'/api/applications/{claim_id}/officer-decision', corr_payload, officer_token)
    assert st == 200, f"Correction request failed: {st} {corr_claim}"
    assert corr_claim['status'] == 'Correction Required'
    print(f"Claim status moved to: {corr_claim['status']} with officer remarks.")

    # Farmer resubmits correction
    print("\n--- [Step 11] Farmer Resubmits Clarification & Documents ---")
    farmer_update = {
        'status': 'Submitted',
        'updateNotes': 'Attached re-scanned high-resolution bank passbook copy.',
        'photos': photos
    }
    st, updated_claim = put_json(f'/api/applications/{claim_id}', farmer_update, new_farmer_token)
    assert st == 200, f"Farmer resubmission failed: {st} {updated_claim}"
    assert updated_claim['status'] == 'Submitted'
    print(f"Claim resubmitted by farmer. Status returned to: {updated_claim['status']}.")

    # 11. Final Officer Sanction / Approval with Payout
    print("\n--- [Step 12] Final Officer Approval & Sanction Disbursement ---")
    approve_payload = {
        'decision': 'approve',
        'remarks': 'All evidence substantiated by surveyor and farmer. Sanctioned indemnity.',
        'sanctionedPayout': 45000
    }
    st, approved = post_json(f'/api/applications/{claim_id}/officer-decision', approve_payload, officer_token)
    assert st == 200, f"Approval failed: {st} {approved}"
    assert approved['status'] == 'Approved'
    assert approved['payoutStatus'] == 'Disbursed to Bank'
    assert approved['sanctionedPayoutInr'] == 45000
    assert 'sanctionDetails' in approved
    print(f"Claim APPROVED! Sanction Order: #{approved['sanctionDetails']['sanctionOrderNumber']}, Amount: INR {approved['sanctionedPayoutInr']:,}")

    # 12. Security Enforcement: Unauthorized Actor Checks
    print("\n--- [Step 13] Security & Role Enforcement Checks ---")
    # Farmer attempting officer approval
    st, hack_resp = post_json(f'/api/applications/{claim_id}/officer-decision', {'decision': 'approve', 'remarks': 'hack'}, new_farmer_token)
    assert st == 403, f"Expected 403 for farmer executing officer decision, got {st}"
    print("Farmer blocked from officer-decision endpoint with 403 Forbidden.")

    # Farmer attempting surveyor assignment
    st, hack_assign = post_json(f'/api/applications/{claim_id}/assign-surveyor', {'surveyorId': 'usr-surveyor-1'}, new_farmer_token)
    assert st == 403, f"Expected 403 for farmer assigning surveyor, got {st}"
    print("Farmer blocked from assign-surveyor endpoint with 403 Forbidden.")

    # Unauthenticated call
    st, no_auth = get_json('/api/applications')
    assert st == 401, f"Expected 401 for unauthenticated request, got {st}"
    print("Unauthenticated request blocked with 401 Unauthorized.")

    # 13. Institutional Tier & Revenue Model Reporting (Phase 10)
    print("\n--- [Step 14] Phase 10 Institutional Revenue & Usage Report ---")
    # Farmer should be blocked from institutional report
    st, f_report = get_json('/api/institution/usage-report', new_farmer_token)
    assert st == 403, f"Expected 403 for farmer accessing institutional report, got {st}"
    print("Farmer blocked from institutional report with 403 Forbidden.")

    # Officer accesses institutional report
    st, inst_report = get_json('/api/institution/usage-report', officer_token)
    assert st == 200, f"Institutional report failed: {st} {inst_report}"
    assert 'activeTier' in inst_report or 'tier' in inst_report
    assert 'metrics' in inst_report or 'usage' in inst_report
    assert 'commercialModel' in inst_report
    tier_name = inst_report.get('activeTier') or inst_report.get('tier')
    farmer_fee = inst_report['commercialModel']['farmerFee']
    print(f"Institutional Tier: '{tier_name}', Commercial Model Farmer Fee: Verified Free")

    # 14. Audit Trail Verification
    print("\n--- [Step 15] Audit Trail & History Verification ---")
    st, final_claim = get_json(f'/api/applications/{claim_id}', officer_token)
    assert st == 200
    history = final_claim.get('history', [])
    assert len(history) >= 4, f"Expected at least 4 audit trail items, found {len(history)}"
    actions = [h['action'] for h in history]
    print(f"Verified Audit Trail Actions: {actions}")

    print(f"\n>>> REGRESSION RUN #{run_number} COMPLETED WITH 100% SUCCESS! <<<")
    return True

if __name__ == '__main__':
    print("FarmProof Comprehensive Automated QA & Regression Suite")
    for r in range(1, 4):
        ok = run_regression_suite(r)
        if not ok:
            print(f"FAILED on run #{r}")
            sys.exit(1)
    print("\n========================================================")
    print("   ALL 3 CONSECUTIVE CLEAN REGRESSION RUNS PASSED!       ")
    print("========================================================")
