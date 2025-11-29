# Seed Script Enhancements

## Changes Made

### 1. Added Admin User ✅

Added a superuser admin account:
- **Username:** `admin`
- **Password:** `admin`
- **Name:** مدیر سیستم
- **Email:** admin@example.com
- **Flags:** `is_superuser=True`, `is_staff=True`
- **AccessScopes:** SYSTEM_ADMIN role on all 7 teams (if SYSTEM_ADMIN role exists)

### 2. Added AccessScopes for CFO, CEO, Legal, and Warehouse ✅

#### CFO AccessScopes
- **User:** `cfo`
- **Role:** CFO
- **Teams:** ALL 7 teams (full flexibility for financial approvals)
- **Count:** 7 AccessScopes

#### CEO AccessScopes
- **User:** `ceo`
- **Role:** CEO
- **Teams:** ALL 7 teams (can approve across all teams)
- **Count:** 7 AccessScopes

#### Legal Reviewer AccessScopes
- **User:** `legal`
- **Role:** LEGAL_REVIEWER
- **Teams:** ALL 7 teams (full flexibility for legal review)
- **Count:** 7 AccessScopes

#### Warehouse Officer AccessScopes
- **User:** `warehouse`
- **Role:** WAREHOUSE_OFFICER
- **Teams:** عملیات (Operations team)
- **Count:** 1 AccessScope

#### Admin AccessScopes
- **User:** `admin`
- **Role:** SYSTEM_ADMIN
- **Teams:** ALL 7 teams (if SYSTEM_ADMIN role exists)
- **Count:** 7 AccessScopes

## Summary of AccessScopes

### Before Enhancement:
- req.marketing: 1 scope
- manager.marketing: 1 scope
- procurement: 7 scopes
- finance.controller: 7 scopes
- **Total: 16 AccessScopes**

### After Enhancement:
- req.marketing: 1 scope
- manager.marketing: 1 scope
- procurement: 7 scopes
- finance.controller: 7 scopes
- **cfo: 7 scopes** ⭐ NEW
- **ceo: 7 scopes** ⭐ NEW
- **legal: 7 scopes** ⭐ NEW
- **warehouse: 1 scope** ⭐ NEW
- **admin: 7 scopes** ⭐ NEW (if SYSTEM_ADMIN role exists)
- **Total: 45 AccessScopes** (or 38 if SYSTEM_ADMIN role doesn't exist)

## User Count

- **Before:** 8 users
- **After:** 9 users (8 role-based + 1 admin)

## Files Modified

1. `seed_prs_comprehensive_teams_users.py`
   - Updated `seed_users()` to add admin user
   - Updated `seed_access_scopes()` to add AccessScopes for CFO, CEO, legal, warehouse, and admin

2. `seed_prs_comprehensive.py`
   - Updated documentation to reflect 9 users
   - Updated reset function to include admin user
   - Added admin user info to summary output

## Testing

To test the enhancements:

```bash
python manage.py seed_prs_comprehensive --reset
python manage.py seed_prs_comprehensive
```

Expected output:
- 9 users created
- 45 AccessScope entries created (if SYSTEM_ADMIN role exists)
- Admin user can log in with username: `admin`, password: `admin`

## Verification

You can verify the AccessScopes were created correctly:

```python
from accounts.models import AccessScope
from accounts.models import User

# Check CFO AccessScopes
cfo = User.objects.get(username='cfo')
cfo_scopes = AccessScope.objects.filter(user=cfo, is_active=True)
print(f"CFO has {cfo_scopes.count()} AccessScopes across teams")

# Check CEO AccessScopes
ceo = User.objects.get(username='ceo')
ceo_scopes = AccessScope.objects.filter(user=ceo, is_active=True)
print(f"CEO has {ceo_scopes.count()} AccessScopes across teams")

# Check Legal AccessScopes
legal = User.objects.get(username='legal')
legal_scopes = AccessScope.objects.filter(user=legal, is_active=True)
print(f"Legal has {legal_scopes.count()} AccessScopes across teams")

# Check Warehouse AccessScope
warehouse = User.objects.get(username='warehouse')
warehouse_scopes = AccessScope.objects.filter(user=warehouse, is_active=True)
print(f"Warehouse has {warehouse_scopes.count()} AccessScope(s)")

# Check Admin AccessScopes
admin = User.objects.get(username='admin')
admin_scopes = AccessScope.objects.filter(user=admin, is_active=True)
print(f"Admin has {admin_scopes.count()} AccessScopes")
```





