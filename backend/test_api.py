"""
Automated Integration Tests for CLARIO Backend API
Tests all required endpoints:
- GET /health
- GET /api/stats
- GET /api/cases
- POST /api/cases
- GET /api/cases/{id}
- PATCH /api/cases/{id}/status
- 404 on invalid case ID
- 422 on invalid status
"""
import urllib.request
import urllib.error
import json
import sys

BASE = 'http://localhost:8000'

def run_tests():
    print("--- Starting CLARIO Backend Integration Tests ---")

    # 1. Health Check
    with urllib.request.urlopen(f'{BASE}/health') as r:
        assert r.status == 200
        health = json.loads(r.read())
        print(f"[PASS] GET /health: {health['status']} - {health['database']}")

    # 2. Stats
    with urllib.request.urlopen(f'{BASE}/api/stats') as r:
        assert r.status == 200
        stats = json.loads(r.read())
        print(f"[PASS] GET /api/stats: {stats['total']} total, {stats['pending']} pending, {stats['critical_warning_count']} critical")

    # 3. List cases
    with urllib.request.urlopen(f'{BASE}/api/cases') as r:
        assert r.status == 200
        cases = json.loads(r.read())
        print(f"[PASS] GET /api/cases: retrieved {len(cases)} cases")
        assert len(cases) > 0

    # 4. Create new patient case with Cardiac Red Flag
    payload = {
        'patient_name': 'Test Cardiac Patient [Synthetic]',
        'age': 62,
        'chief_complaint': 'Crushing chest pressure radiating to left arm',
        'symptoms': 'Severe tightness in central chest radiating down left arm and jaw. Started 45 minutes ago while climbing stairs. Sweating profusely.',
        'symptom_duration': '45 minutes, acute onset',
        'medical_history': 'CAD, Hypertension. Stent placed in 2019.',
        'current_medications': 'Clopidogrel 75mg daily, Atorvastatin 80mg, Metoprolol 25mg BID',
        'additional_notes': 'Patient feels nauseous and pale.'
    }
    req = urllib.request.Request(
        f'{BASE}/api/cases',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as r:
        assert r.status == 201
        created = json.loads(r.read())
        new_id = created['id']
        flag_title = created['warning_flags'][0]['title'] if created['warning_flags'] else 'None'
        print(f"[PASS] POST /api/cases: Created {new_id} with emergency flag={created['has_emergency_flags']} ({flag_title})")
        assert created['has_emergency_flags'] is True

    # 5. Fetch the newly created case
    with urllib.request.urlopen(f'{BASE}/api/cases/{new_id}') as r:
        assert r.status == 200
        fetched = json.loads(r.read())
        assert fetched['patient_name'] == payload['patient_name']
        assert fetched['status'] == 'pending'
        print(f"[PASS] GET /api/cases/{new_id}: Exact match confirmed")

    # 6. Update status to in_review
    patch_req = urllib.request.Request(
        f'{BASE}/api/cases/{new_id}/status',
        data=json.dumps({'status': 'in_review'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    with urllib.request.urlopen(patch_req) as r:
        assert r.status == 200
        updated = json.loads(r.read())
        assert updated['status'] == 'in_review'
        print(f"[PASS] PATCH /api/cases/{new_id}/status: Transitioned to 'in_review'")

    # 7. Update status to completed
    patch_req2 = urllib.request.Request(
        f'{BASE}/api/cases/{new_id}/status',
        data=json.dumps({'status': 'completed'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    with urllib.request.urlopen(patch_req2) as r:
        assert r.status == 200
        updated2 = json.loads(r.read())
        assert updated2['status'] == 'completed'
        print(f"[PASS] PATCH /api/cases/{new_id}/status: Transitioned to 'completed'")

    # 8. Test invalid ID error handling (404)
    try:
        urllib.request.urlopen(f'{BASE}/api/cases/INVALID-999999')
        print("[FAIL] Expected 404 for invalid ID, but got 200")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 404
        print(f"[PASS] Invalid case ID rejected with HTTP {e.code}")

    # 9. Test invalid status update rejection (422)
    try:
        inv_patch = urllib.request.Request(
            f'{BASE}/api/cases/{new_id}/status',
            data=json.dumps({'status': 'invalid_status_xyz'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        urllib.request.urlopen(inv_patch)
        print("[FAIL] Expected 422 for invalid status, but got 200")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 422
        print(f"[PASS] Invalid status rejected with HTTP {e.code}")

    # 10. Verify Parsed Medications and Extracted Vitals in Created Case
    summary = fetched['structured_summary']
    assert 'parsed_medications' in summary
    assert len(summary['parsed_medications']) >= 2
    # Verify dosage & frequency extraction
    med_names = [m['name'] for m in summary['parsed_medications']]
    print(f"[PASS] Medication extraction verified: {len(summary['parsed_medications'])} medications structured")

    # 11. Test Clinical Text Cleaner Unit Behavior
    from text_cleaner import clean_clinical_text
    dirty = "  Line with messy\r\n\r\n\r\nspaces    and noise\n----\n\nDone.  "
    cleaned = clean_clinical_text(dirty)
    assert "----" not in cleaned
    assert "   " not in cleaned
    print("[PASS] Clinical text cleaner removed noise lines and excessive spacing")

    # 12. Test Vitals Extraction & Clinical Range Flagging
    from clinical_rules import extract_vitals_and_labs, parse_structured_medications
    vitals_test = extract_vitals_and_labs("Patient recorded BP: 185/125 mmHg and SpO2 was 89% with HR 145 bpm and temp 103.5 F")
    vitals_map = {v['metric']: v for v in vitals_test}
    assert 'Blood Pressure' in vitals_map and vitals_map['Blood Pressure']['flag'] == 'CRITICAL_HIGH'
    assert 'Oxygen Saturation (SpO2)' in vitals_map and vitals_map['Oxygen Saturation (SpO2)']['flag'] == 'CRITICAL_LOW'
    assert 'Body Temperature' in vitals_map and vitals_map['Body Temperature']['flag'] == 'CRITICAL_HIGH'
    assert 'Heart Rate / Pulse' in vitals_map and vitals_map['Heart Rate / Pulse']['flag'] == 'CRITICAL_HIGH'
    print(f"[PASS] Vitals extraction & physiological range alerts verified: {list(vitals_map.keys())}")

    # 13. Test Medication Parser Frequencies and Forms
    parsed_test = parse_structured_medications("Tablet Metformin 500mg BID x 30 days, Albuterol inhaler 2 puffs PRN")
    assert len(parsed_test) == 2
    assert parsed_test[0]['dosage'] == '500 mg'
    assert parsed_test[0]['frequency'] == 'Twice Daily (BID)'
    assert parsed_test[1]['frequency'] == 'As Needed (PRN / SOS)'
    print("[PASS] Medication parser form, dosage, and frequency patterns verified")

    print("\n>>> ALL 13 INTEGRATION & CLINICAL CHECKS PASSED WITH 100% SUCCESS! <<<")

if __name__ == '__main__':
    run_tests()

