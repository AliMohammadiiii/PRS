# Comparison: New Spec vs Existing seed_prs_comprehensive

This document compares the new simplified specification against the existing comprehensive seed script.

## Overview

**New Spec:** Simplified/minimal seed data specification (10 LookupTypes, simpler structure)  
**Existing Seed:** Comprehensive PRS seed (8 LookupTypes, detailed structure)

---

## 1. LookupType Comparison

### New Spec (10 types):
1. REQUEST_STATUS ✓
2. PURCHASE_TYPE ✓
3. COMPANY_ROLE ✓
4. **REPORT_STATUS** ⚠️ (CFO Wise - not PRS)
5. **REPORTING_PERIOD** ⚠️ (CFO Wise - not PRS)
6. ORG_TYPE ✓
7. LEGAL_ENTITY_TYPE ✓
8. INDUSTRY_TYPE ✓
9. SUB_INDUSTRY_TYPE ✓
10. COMPANY_CLASSIFICATION ✓

### Existing Seed (8 types):
1. COMPANY_ROLE ✓
2. REQUEST_STATUS ✓
3. PURCHASE_TYPE ✓
4. ORG_TYPE ✓
5. LEGAL_ENTITY_TYPE ✓
6. INDUSTRY_TYPE ✓
7. SUB_INDUSTRY_TYPE ✓
8. COMPANY_CLASSIFICATION ✓

**Difference:**
- New spec includes REPORT_STATUS and REPORTING_PERIOD (CFO Wise specific, not needed for PRS)
- Existing seed doesn't include CFO Wise lookup types (correct for PRS)

**Status:** ✅ Existing seed is correct for PRS. REPORT_STATUS and REPORTING_PERIOD are legacy CFO Wise types.

---

## 2. REQUEST_STATUS Comparison

### New Spec (9 statuses):
1. DRAFT - "پیش‌نویس" ✓
2. PENDING_APPROVAL - "در انتظار تأیید" ⚠️ (different from existing)
3. IN_REVIEW - "در حال بررسی" ✓
4. REJECTED - "رد شده" ✓
5. RESUBMITTED - "ارسال مجدد" ✓
6. FULLY_APPROVED - "تأیید کامل" ✓
7. FINANCE_REVIEW - "بررسی مالی" ✓
8. COMPLETED - "تکمیل‌شده" ✓
9. ARCHIVED - "آرشیو شده" ✓

### Existing Seed (9 statuses):
1. DRAFT - "پیش‌نویس" ✓
2. PENDING_APPROVAL - "در انتظار ارسال به تأیید" ⚠️ (more descriptive)
3. IN_REVIEW - "در حال تأیید" ✓
4. REJECTED - "رد شده" ✓
5. RESUBMITTED - "ارسال مجدد شده" ✓
6. FULLY_APPROVED - "تأیید شده (قبل از مالی)" ✓
7. FINANCE_REVIEW - "در حال بررسی مالی" ✓
8. COMPLETED - "تکمیل شده / آمادهٔ پرداخت" ✓
9. ARCHIVED - "بایگانی شده" ✓

**Difference:**
- New spec: "در انتظار تأیید" (pending approval)
- Existing: "در انتظار ارسال به تأیید" (pending submission for approval)
- New spec: "در حال بررسی" (in review)
- Existing: "در حال تأیید" (in approval)
- Existing titles are more descriptive

**Status:** ✅ Existing seed is more accurate. Minor title differences, but existing ones are clearer.

---

## 3. PURCHASE_TYPE Comparison

### New Spec (2 types - SIMPLIFIED):
1. GOODS - "خرید کالا"
2. SERVICE - "خرید خدمت"

### Existing Seed (8 types - DETAILED):
1. GOODS_STANDARD - "خرید کالای عادی"
2. GOODS_ASSET - "خرید کالای سرمایه‌ای"
3. GOODS_EMERGENCY - "خرید کالای اضطراری"
4. GOODS_PETTY_CASH - "خرید تنخواه (کالا)"
5. SERVICE_OPERATIONAL - "خرید خدمت عملیاتی"
6. SERVICE_PROJECT - "خرید خدمت پروژه‌ای"
7. SERVICE_CONSULTING - "خرید خدمت مشاوره"
8. SERVICE_EMERGENCY - "خرید خدمت اضطراری"

**Difference:**
- New spec is **highly simplified** (only 2 types)
- Existing seed is **comprehensive** (8 detailed types matching Mid-Size spec)

**Status:** ⚠️ **MAJOR DIFFERENCE**
- Existing seed matches the detailed Mid-Size specification
- New spec is too simplified for production use
- **Recommendation:** Keep existing 8 types

---

## 4. COMPANY_ROLE Comparison

### New Spec (6 roles - SIMPLIFIED):
1. REQUESTER - "درخواست‌دهنده"
2. MANAGER - "مدیر واحد"
3. PROCUREMENT_OFFICER - "کارشناس تدارکات"
4. FINANCE_CONTROLLER - "کنترلر مالی"
5. CFO - "مدیر مالی"
6. CEO - "مدیرعامل"

### Existing Seed (14 roles - COMPREHENSIVE):
1. REQUESTER - "درخواست‌کننده" ✓
2. TEAM_MANAGER - "مدیر تیم" ⚠️ (vs MANAGER)
3. DEPARTMENT_HEAD - "مدیر واحد / سرپرست دپارتمان" ⚠️ (vs MANAGER)
4. PROCUREMENT_OFFICER - "کارشناس تدارکات" ✓
5. PROCUREMENT_MANAGER - "مدیر تدارکات" ❌ (missing in new spec)
6. FINANCE_CONTROLLER - "کنترلر مالی" ✓
7. CFO - "مدیر مالی (CFO)" ✓
8. CEO - "مدیرعامل" ✓
9. LEGAL_REVIEWER - "کارشناس حقوقی" ❌ (missing in new spec)
10. VENDOR_MANAGER - "مسئول مدیریت تأمین‌کننده" ❌ (missing in new spec)
11. WAREHOUSE_OFFICER - "انباردار" ❌ (missing in new spec)
12. SERVICE_OWNER - "مالک خدمت" ❌ (missing in new spec)
13. FINANCE_AP_CLERK - "کارشناس پرداخت" ❌ (missing in new spec)
14. SYSTEM_ADMIN - "ادمین سیستم" ❌ (missing in new spec)

**Difference:**
- New spec: Generic "MANAGER" role
- Existing: Separate TEAM_MANAGER and DEPARTMENT_HEAD (more granular)
- Existing has 8 additional specialized roles

**Status:** ⚠️ **MAJOR DIFFERENCE**
- Existing seed is much more comprehensive
- Missing roles in new spec: LEGAL_REVIEWER, WAREHOUSE_OFFICER, PROCUREMENT_MANAGER, etc.
- **Recommendation:** Keep existing 14 roles

---

## 5. Teams Comparison

### New Spec (6 teams):
1. مارکتینگ - "واحد بازاریابی"
2. فناوری اطلاعات - "واحد IT" ⚠️ (different name)
3. محصول - "تیم Product"
4. مالی - "واحد Finance"
5. عملیات - "واحد عملیات"
6. منابع انسانی - "واحد منابع انسانی"

### Existing Seed (7 teams):
1. مارکتینگ - "کمپین‌ها، تبلیغات، رویدادها، تولید محتوا" ✓
2. فنی - "زیرساخت، توسعه نرم‌افزار، تجهیزات IT" ⚠️ (different name: "فنی" vs "فناوری اطلاعات")
3. محصول - "طراحی و توسعه محصول، ابزارهای Product Analytics، UX Research" ✓
4. مالی - "حسابداری، پرداخت، کنترل بودجه" ✓
5. عملیات - "عملیات خدمات، پشتیبانی مشتری، لجستیک" ✓
6. منابع انسانی - "استخدام، آموزش، رفاه پرسنل" ✓
7. مدیریت و اداری - "هیات‌مدیره، مدیریت ارشد، امور اداری و عمومی" ❌ (missing in new spec)

**Difference:**
- New spec: "فناوری اطلاعات" vs Existing: "فنی"
- New spec: Missing "مدیریت و اداری" team
- Existing descriptions are more detailed

**Status:** ⚠️ **MINOR DIFFERENCE**
- Team name variation acceptable
- Missing team might be intentional (simplified)
- **Recommendation:** Keep existing 7 teams

---

## 6. Users Comparison

### New Spec (5 users):
1. admin - "مدیر سیستم" (superuser)
2. ali - "علی محمدی"
3. zahra - "زهرا کاظمی"
4. reza - "رضا مرادی"
5. fatemeh - "فاطمه یوسفی"

### Existing Seed (8 users):
1. req.marketing - "درخواست‌کننده مارکتینگ"
2. manager.marketing - "مدیر مارکتینگ"
3. procurement - "کارشناس تدارکات"
4. finance.controller - "کنترلر مالی"
5. cfo - "مدیر مالی"
6. ceo - "مدیرعامل"
7. legal - "کارشناس حقوقی"
8. warehouse - "انباردار"

**Difference:**
- New spec: Generic Persian names (ali, zahra, etc.)
- Existing: Role-based usernames (req.marketing, procurement, etc.)
- New spec includes admin user
- Completely different user sets

**Status:** ⚠️ **DIFFERENT APPROACH**
- New spec: Realistic Persian names
- Existing: Functional role-based names
- **Recommendation:** Both approaches are valid. Role-based is better for testing.

---

## 7. AccessScope Comparison

### New Spec (5 scopes):
1. ali → مارکتینگ → REQUESTER
2. zahra → محصول → REQUESTER
3. reza → فناوری اطلاعات → MANAGER
4. fatemeh → مالی → FINANCE_CONTROLLER
5. admin → مالی → CFO

### Existing Seed (9+ scopes):
1. req.marketing → مارکتینگ → REQUESTER
2. manager.marketing → مارکتینگ → TEAM_MANAGER
3. procurement → ALL 7 teams → PROCUREMENT_OFFICER
4. finance.controller → ALL 7 teams → FINANCE_CONTROLLER

**Difference:**
- New spec: Simple one-to-one mappings
- Existing: Cross-team roles (procurement, finance across all teams)

**Status:** ✅ Existing seed is more realistic for production scenarios.

---

## 8. FormTemplate Structure Comparison

### New Spec:
- Simple structure
- No base fields mentioned
- Example: 5 fields for marketing service
- Field structure: vendor_name, service_type, budget_code, description, contract_file

### Existing Seed:
- **9 base fields** in ALL templates (spec requirement)
- Team-specific fields in addition
- Comprehensive field validation
- Example: Marketing service has 9 base + 4 specific = 13 fields

**Status:** ⚠️ **MAJOR DIFFERENCE**
- New spec missing base fields requirement
- Existing seed follows spec requirement for common base fields
- **Recommendation:** Keep existing comprehensive structure

---

## 9. WorkflowTemplate Comparison

### New Spec:
- 3-step workflow: MANAGER → PROCUREMENT_OFFICER → FINANCE_CONTROLLER
- Uses generic "MANAGER" role

### Existing Seed:
- Multiple workflow patterns:
  - Standard: TEAM_MANAGER → PROCUREMENT_OFFICER → FINANCE_CONTROLLER
  - Asset: TEAM_MANAGER → DEPARTMENT_HEAD → LEGAL_REVIEWER → FINANCE_CONTROLLER
  - Consulting: TEAM_MANAGER → DEPARTMENT_HEAD → FINANCE_CONTROLLER
  - Emergency: TEAM_MANAGER → CEO → FINANCE_CONTROLLER

**Status:** ⚠️ **MAJOR DIFFERENCE**
- New spec is too simplified
- Existing seed has specialized workflows for different purchase types
- **Recommendation:** Keep existing comprehensive workflows

---

## 10. TeamPurchaseConfig Comparison

### New Spec:
- Simple examples
- Only 2 configs shown

### Existing Seed:
- 10 comprehensive configs
- All major team × purchase_type combinations

**Status:** ✅ Existing seed is complete.

---

## Summary & Recommendations

### ✅ What's Better in Existing Seed:
1. **8 detailed PURCHASE_TYPE** (vs 2 simplified)
2. **14 comprehensive COMPANY_ROLE** (vs 6 simplified)
3. **9 base fields** in all form templates
4. **Specialized workflows** for different purchase types
5. **7 teams** (includes management team)
6. **Role-based user names** (better for testing)
7. **10 TeamPurchaseConfig entries**

### ⚠️ What Could Be Added from New Spec:
1. **REPORT_STATUS and REPORTING_PERIOD** lookup types - ❌ **NOT NEEDED** (CFO Wise only)
2. **Admin user** - ✅ Could add for convenience
3. **More realistic Persian names** - Optional enhancement

### 📋 Final Recommendation:

**DO NOT replace existing seed with new spec.**

The existing `seed_prs_comprehensive` is:
- ✅ More comprehensive
- ✅ Matches Mid-Size specification
- ✅ Production-ready
- ✅ Follows all requirements from original Persian spec

The new spec appears to be a **simplified/minimal version** that:
- ❌ Loses important granularity (8 → 2 purchase types, 14 → 6 roles)
- ❌ Missing base fields requirement
- ❌ Too simplified for production use

**Suggested Action:**
1. Keep existing comprehensive seed as primary
2. Optionally create a separate minimal seed script for quick testing
3. Optionally add admin user to existing seed




