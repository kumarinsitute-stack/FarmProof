import urllib.request
import json

base_url = 'http://127.0.0.1:3000'

def post_json(path, data, token=None):
    req = urllib.request.Request(base_url + path, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def get_json(path, token=None):
    req = urllib.request.Request(base_url + path)
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print('=== 1. Test Farmer Login ===')
status, data = post_json('/api/auth/login', {'identifier': '9848023145', 'password': 'Farmer@2026', 'portalType': 'farmer'})
assert status == 200, f'Farmer login failed: {status} {data}'
farmer_token = data['token']
print('Farmer logged in:', data['user']['name'], 'Role:', data['user']['role'])

print('=== 2. Test Farmer trying Staff portal (Must be rejected) ===')
status, data = post_json('/api/auth/login', {'identifier': '9848023145', 'password': 'Farmer@2026', 'portalType': 'staff'})
assert status == 403, f'Expected 403 for farmer accessing staff portal, got {status}'
print('Farmer rejected from staff portal as expected:', data['error'])

print('=== 3. Test Officer Login ===')
status, data = post_json('/api/auth/login', {'identifier': 'officer@farmproof.gov.in', 'password': 'Officer@2026', 'portalType': 'staff'})
assert status == 200, f'Officer login failed: {status}'
officer_token = data['token']
print('Officer logged in:', data['user']['name'], 'Role:', data['user']['role'])

print('=== 4. Test Surveyor Login ===')
status, data = post_json('/api/auth/login', {'identifier': 'surveyor@farmproof.gov.in', 'password': 'Surveyor@2026', 'portalType': 'staff'})
assert status == 200, f'Surveyor login failed: {status}'
surveyor_token = data['token']
print('Surveyor logged in:', data['user']['name'], 'Role:', data['user']['role'])

print('=== 5. Test Role-Based Applications Isolation ===')
# Farmer view
s1, apps_farmer = get_json('/api/applications', farmer_token)
print(f'Farmer sees {len(apps_farmer)} claims (all owned by farmer)')
for a in apps_farmer:
    assert a['farmerId'] == 'usr-farmer-1' or a['phone'] == '9848023145', 'Unauthorized claim leaked to farmer!'

# Surveyor view
s2, apps_surveyor = get_json('/api/applications', surveyor_token)
print(f'Surveyor sees {len(apps_surveyor)} claims (assigned to surveyor)')
for a in apps_surveyor:
    assert a.get('assignedSurveyorId') == 'usr-surveyor-1', 'Unassigned claim leaked to surveyor!'

# Officer view
s3, apps_officer = get_json('/api/applications', officer_token)
print(f'Officer sees {len(apps_officer)} claims (full administrative queue)')

print('=== 6. Test File Upload Endpoint ===')
upload_data = {
    'name': 'crop_damage_quadrat.jpg',
    'type': 'image/jpeg',
    'data': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
}
status, up_res = post_json('/api/upload', upload_data, farmer_token)
assert status == 200 and up_res['success'], f'Upload failed: {up_res}'
print('Uploaded file URL:', up_res['url'], 'Size:', up_res['size'])

print('=== 7. Test Application Creation ===')
app_payload = {
    'crop': 'Cotton',
    'cause': 'Flood',
    'plotSize': '1.5 ha',
    'village': 'Nallabelly',
    'surveyNumber': '412/A',
    'description': 'Heavy inundation caused 80% submerged bolls.',
    'photos': [{'id': 1, 'label': 'Flood Evidence', 'url': up_res['url'], 'gps': '17.9689 N, 79.5941 E'}]
}
status, new_claim = post_json('/api/applications', app_payload, farmer_token)
assert status == 201, f'Creation failed: {status}'
claim_id = new_claim['id']
print('Created Claim:', claim_id, 'Status:', new_claim['status'])

print('=== 8. Test Officer Assigning Surveyor ===')
assign_payload = {
    'surveyorId': 'usr-surveyor-1',
    'deadline': 'Within 48h',
    'instructions': 'Verify flood water level on cotton stalks.'
}
status, assigned_claim = post_json(f'/api/applications/{claim_id}/assign-surveyor', assign_payload, officer_token)
assert status == 200, f'Assign failed: {status}'
assert assigned_claim['status'] == 'Survey Assigned', 'Status should be Survey Assigned'
print('Assigned to surveyor:', assigned_claim['assignedSurveyorName'], 'Status:', assigned_claim['status'])

print('=== 9. Test Surveyor Submitting Findings ===')
findings_payload = {
    'visitGps': '17.9689 N, 79.5941 E',
    'boundaryIntegrityVerified': True,
    'cropSpeciesVerified': True,
    'observedLossPercentage': 75,
    'lodgingObserved': True,
    'waterloggingObserved': True,
    'pestSymptomObserved': False,
    'surveyorRecommendation': 'Recommend Approval',
    'remarks': 'Field inspection verified 75% cotton loss due to canal overflow. Cadastral landmarks intact.',
    'actionType': 'verify'
}
status, surveyed_claim = post_json(f'/api/applications/{claim_id}/submit-survey', findings_payload, surveyor_token)
assert status == 200, f'Survey submit failed: {status}'
assert surveyed_claim['status'] == 'Survey Completed', 'Status should be Survey Completed'
print('Survey findings recorded! Status:', surveyed_claim['status'])

print('=== 10. Test Officer Approving Claim with Sanctioned Payout ===')
decision_payload = {
    'decision': 'approve',
    'remarks': 'Sanctioned compensation based on verified surveyor findings.',
    'sanctionedPayout': 48000
}
status, approved_claim = post_json(f'/api/applications/{claim_id}/officer-decision', decision_payload, officer_token)
assert status == 200, f'Decision failed: {status}'
assert approved_claim['status'] == 'Approved', 'Status should be Approved'
assert approved_claim['payoutStatus'] == 'Disbursed to Bank', 'Payout should be disbursed'
print('Claim Approved! Sanctioned Amount: INR', approved_claim['sanctionedPayoutInr'], 'Payout Status:', approved_claim['payoutStatus'])

print('=== 11. Test Farmer Registration ===')
reg_payload = {
    'name': 'Gopal Rao',
    'phone': '9848123999',
    'password': 'Farmer@2026',
    'aadhaar': 'XXXX-XXXX-7711',
    'village': 'Nallabelly',
    'surveyNumber': '104/A'
}
status, reg_res = post_json('/api/auth/register-farmer', reg_payload)
assert status == 200, f'Farmer registration failed: {status}'
print('Registered new farmer:', reg_res['user']['name'], 'ID:', reg_res['user']['id'])

print('\n>>> ALL 11 END-TO-END WORKFLOW TESTS PASSED CLEANLY! <<<')
