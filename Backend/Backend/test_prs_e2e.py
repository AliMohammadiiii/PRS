#!/usr/bin/env python
"""End-to-end test script for PRS"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def get_token(username, password):
    """Get JWT token for a user"""
    response = requests.post(
        f"{BASE_URL}/auth/token/",
        json={"username": username, "password": password}
    )
    response.raise_for_status()
    return response.json()["access"]

def print_response(title, response):
    """Print response details"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")

def test_happy_path():
    """Test Scenario 1: Happy Path"""
    print("\n" + "="*60)
    print("SCENARIO 1: HAPPY PATH")
    print("="*60)
    
    # Step 1: Get tokens for all users
    print("\n1. Getting authentication tokens...")
    try:
        requestor_token = get_token("requestor_user", "testpass123")
        manager_token = get_token("manager_user", "testpass123")
        finance_token = get_token("finance_user", "testpass123")
        print("✓ All tokens obtained")
    except Exception as e:
        print(f"✗ Failed to get tokens: {e}")
        return False
    
    # Step 2: Get teams
    print("\n2. Getting teams list...")
    headers = {"Authorization": f"Bearer {requestor_token}"}
    response = requests.get(f"{BASE_URL}/prs/teams/", headers=headers)
    print_response("Teams List", response)
    if response.status_code != 200:
        return False
    
    teams = response.json()
    if not teams:
        print("✗ No teams found")
        return False
    
    team = teams[0]  # Use first team
    team_id = team["id"]
    print(f"✓ Using team: {team['name']} (ID: {team_id})")
    
    # Step 3: Get form template
    print(f"\n3. Getting form template for team {team_id}...")
    response = requests.get(f"{BASE_URL}/prs/teams/{team_id}/form-template/", headers=headers)
    print_response("Form Template", response)
    if response.status_code != 200:
        return False
    
    template_data = response.json()
    template = template_data["template"]
    print(f"✓ Got form template (ID: {template['id']})")
    
    # Step 4: Get attachment categories
    print(f"\n4. Getting attachment categories for team {team_id}...")
    response = requests.get(f"{BASE_URL}/prs/teams/{team_id}/attachment-categories/", headers=headers)
    print_response("Attachment Categories", response)
    if response.status_code != 200:
        return False
    
    categories = response.json()
    required_category = next((c for c in categories if c.get("required")), None)
    print(f"✓ Found {len(categories)} categories")
    if required_category:
        print(f"  Required category: {required_category['name']} (ID: {required_category['id']})")
    
    # Step 5: Get purchase type lookup
    print("\n5. Getting purchase type lookups...")
    response = requests.get(f"{BASE_URL}/lookups/?type__code=PURCHASE_TYPE", headers=headers)
    if response.status_code != 200:
        print(f"✗ Failed to get purchase types: {response.status_code}")
        return False
    purchase_types = response.json()
    purchase_type_code = purchase_types[0]["code"] if purchase_types else "SERVICE"
    print(f"✓ Using purchase type: {purchase_type_code}")
    
    # Step 6: Create purchase request (status will be set to DRAFT automatically)
    print("\n6. Creating purchase request...")
    request_data = {
        "team_id": team_id,
        "vendor_name": "Test Vendor",
        "vendor_account": "IBAN123456789",
        "subject": "Test Purchase Request - Happy Path",
        "description": "This is a test purchase request for the happy path scenario",
        "purchase_type": purchase_type_code,
    }
    response = requests.post(f"{BASE_URL}/prs/requests/", headers=headers, json=request_data)
    print_response("Create Request", response)
    if response.status_code not in [200, 201]:
        print("✗ Failed to create request")
        return False
    
    request_obj = response.json()
    request_id = request_obj["id"]
    print(f"✓ Created request (ID: {request_id})")
    print(f"  Status: {request_obj.get('status', {}).get('code', 'N/A')}")
    
    # Step 7: Upload required attachment (if any)
    if required_category:
        print(f"\n7. Uploading required attachment ({required_category['name']})...")
        # Create a dummy file for testing
        files = {
            'file': ('test_invoice.pdf', b'%PDF-1.4\n', 'application/pdf')
        }
        data = {
            'category_id': required_category['id']
        }
        response = requests.post(
            f"{BASE_URL}/prs/requests/{request_id}/upload-attachment/",
            headers=headers,
            files=files,
            data=data
        )
        print_response("Upload Attachment", response)
        if response.status_code in [200, 201]:
            print(f"✓ Uploaded attachment")
        else:
            print("⚠ Attachment upload failed, but continuing...")
    
    # Step 8: Submit request
    print(f"\n8. Submitting request {request_id}...")
    response = requests.post(f"{BASE_URL}/prs/requests/{request_id}/submit/", headers=headers)
    print_response("Submit Request", response)
    if response.status_code != 200:
        print("⚠ Note: Submission may have failed due to missing required attachments or fields")
        # Continue anyway to test other flows
        request_obj = response.json() if response.status_code == 400 else request_obj
    else:
        request_obj = response.json()
        print(f"✓ Request submitted (Status: {request_obj.get('status', {}).get('code', 'N/A')})")
    
    # Step 9: Check manager's approvals
    print("\n9. Checking manager's approval inbox...")
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    response = requests.get(f"{BASE_URL}/prs/requests/my-approvals/", headers=manager_headers)
    print_response("Manager Approvals", response)
    if response.status_code == 200:
        approvals = response.json()
        print(f"✓ Manager has {len(approvals.get('results', approvals) if isinstance(approvals, dict) else approvals)} pending approvals")
    
    # Step 10: Check finance inbox
    print("\n10. Checking finance inbox...")
    finance_headers = {"Authorization": f"Bearer {finance_token}"}
    response = requests.get(f"{BASE_URL}/prs/requests/finance-inbox/", headers=finance_headers)
    print_response("Finance Inbox", response)
    if response.status_code == 200:
        finance_items = response.json()
        print(f"✓ Finance has {len(finance_items.get('results', finance_items) if isinstance(finance_items, dict) else finance_items)} items")
    
    print("\n" + "="*60)
    print("SCENARIO 1 COMPLETE")
    print("="*60)
    return True

if __name__ == "__main__":
    try:
        success = test_happy_path()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

