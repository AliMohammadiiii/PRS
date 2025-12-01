"""
Helper module for seeding LookupTypes and Lookups for comprehensive PRS seed data.
"""

from classifications.models import LookupType, Lookup


def seed_lookup_types():
    """Create all 8 LookupTypes with Persian titles and descriptions."""
    lookup_types = [
        {
            'code': 'COMPANY_ROLE',
            'title': 'نقش‌های سازمانی',
            'description': 'نقش کاربران در تیم‌ها و واحدها'
        },
        {
            'code': 'REQUEST_STATUS',
            'title': 'وضعیت درخواست خرید',
            'description': 'وضعیت‌های چرخهٔ حیات درخواست خرید'
        },
        {
            'code': 'PURCHASE_TYPE',
            'title': 'نوع خرید',
            'description': 'انواع خرید کالا و خدمت'
        },
        {
            'code': 'ORG_TYPE',
            'title': 'نوع واحد سازمانی',
            'description': 'هلدینگ / شرکت'
        },
        {
            'code': 'LEGAL_ENTITY_TYPE',
            'title': 'نوع شخصیت حقوقی',
            'description': 'سهامی خاص، سهامی عام، …'
        },
        {
            'code': 'INDUSTRY_TYPE',
            'title': 'صنعت',
            'description': 'صنعت فعالیت شرکت‌ها'
        },
        {
            'code': 'SUB_INDUSTRY_TYPE',
            'title': 'زیرصنعت',
            'description': 'زیرشاخهٔ صنعت'
        },
        {
            'code': 'COMPANY_CLASSIFICATION',
            'title': 'طبقه‌بندی شرکت',
            'description': 'مثلاً خدماتی، تولیدی'
        },
    ]
    
    created_types = {}
    for lt_data in lookup_types:
        lookup_type, created = LookupType.objects.get_or_create(
            code=lt_data['code'],
            defaults={
                'title': lt_data['title'],
                'description': lt_data['description'],
                'is_active': True
            }
        )
        if not created:
            # Update if exists but inactive
            if not lookup_type.is_active:
                lookup_type.is_active = True
                lookup_type.title = lt_data['title']
                lookup_type.description = lt_data['description']
                lookup_type.save()
        created_types[lt_data['code']] = lookup_type
    
    return created_types


def seed_company_roles(lookup_type):
    """Create all 14 COMPANY_ROLE lookups."""
    roles = [
        {'code': 'REQUESTER', 'title': 'درخواست‌کننده', 'description': 'کاربری که فرم خرید را پر می‌کند'},
        {'code': 'TEAM_MANAGER', 'title': 'مدیر تیم', 'description': 'مدیر مستقیم درخواست‌کننده'},
        {'code': 'DEPARTMENT_HEAD', 'title': 'مدیر واحد / سرپرست دپارتمان', 'description': 'برای تأیید سطح بالاتر واحد'},
        {'code': 'PROCUREMENT_OFFICER', 'title': 'کارشناس تدارکات', 'description': 'مسئول بررسی تأمین‌کننده و RFQ'},
        {'code': 'PROCUREMENT_MANAGER', 'title': 'مدیر تدارکات', 'description': 'تأیید نهایی تدارکات و انتخاب تأمین‌کننده'},
        {'code': 'FINANCE_CONTROLLER', 'title': 'کنترلر مالی', 'description': 'بررسی بودجه، سرفصل و انطباق مالی'},
        {'code': 'CFO', 'title': 'مدیر مالی (CFO)', 'description': 'تأیید خریدهای با مبلغ بالا یا خاص'},
        {'code': 'CEO', 'title': 'مدیرعامل', 'description': 'تأیید خریدهای بسیار بزرگ یا استراتژیک'},
        {'code': 'LEGAL_REVIEWER', 'title': 'کارشناس حقوقی', 'description': 'بررسی قرارداد و شرایط حقوقی'},
        {'code': 'VENDOR_MANAGER', 'title': 'مسئول مدیریت تأمین‌کننده', 'description': 'بررسی وضعیت تأمین‌کننده جدید'},
        {'code': 'WAREHOUSE_OFFICER', 'title': 'انباردار / مسئول تحویل کالا', 'description': 'ثبت رسید کالا'},
        {'code': 'SERVICE_OWNER', 'title': 'مالک خدمت / مالک سرویس', 'description': 'تأیید تحویل خدمت'},
        {'code': 'FINANCE_AP_CLERK', 'title': 'کارشناس پرداخت / AP', 'description': 'ثبت فاکتور و آماده‌سازی پرداخت'},
        {'code': 'SYSTEM_ADMIN', 'title': 'ادمین سیستم', 'description': 'تنظیم فرم‌ها، فلوها و دسترسی‌ها'},
    ]
    
    created_roles = {}
    for role_data in roles:
        lookup, created = Lookup.objects.get_or_create(
            type=lookup_type,
            code=role_data['code'],
            defaults={
                'title': role_data['title'],
                'description': role_data['description'],
                'is_active': True
            }
        )
        if not created:
            if not lookup.is_active:
                lookup.is_active = True
                lookup.title = role_data['title']
                lookup.description = role_data['description']
                lookup.save()
        created_roles[role_data['code']] = lookup
    
    return created_roles


def seed_purchase_types(lookup_type):
    """Create all 8 PURCHASE_TYPE lookups."""
    purchase_types = [
        {'code': 'GOODS_STANDARD', 'title': 'خرید کالای عادی', 'description': 'خریدهای معمول کالا (لوازم عمومی، تجهیزات غیرسرمایه‌ای)'},
        {'code': 'GOODS_ASSET', 'title': 'خرید کالای سرمایه‌ای', 'description': 'خرید دارایی ثابت (سرور، لپ‌تاپ، ماشین‌آلات)'},
        {'code': 'GOODS_EMERGENCY', 'title': 'خرید کالای اضطراری', 'description': 'خریدهای فوری خارج از روال عادی'},
        {'code': 'GOODS_PETTY_CASH', 'title': 'خرید تنخواه (کالا)', 'description': 'خریدهای خرد که از تنخواه پرداخت می‌شود'},
        {'code': 'SERVICE_OPERATIONAL', 'title': 'خرید خدمت عملیاتی', 'description': 'خدمات جاری مثل پشتیبانی، سرویس نگهداری، تبلیغات مستمر'},
        {'code': 'SERVICE_PROJECT', 'title': 'خرید خدمت پروژه‌ای', 'description': 'قراردادهای پروژه‌ای با خروجی مشخص'},
        {'code': 'SERVICE_CONSULTING', 'title': 'خرید خدمت مشاوره', 'description': 'مشاوره تخصصی، آموزش، کوچینگ'},
        {'code': 'SERVICE_EMERGENCY', 'title': 'خرید خدمت اضطراری', 'description': 'خدمات فوری مثل رفع حادثه، پشتیبانی اضطراری'},
    ]
    
    created_types = {}
    for pt_data in purchase_types:
        lookup, created = Lookup.objects.get_or_create(
            type=lookup_type,
            code=pt_data['code'],
            defaults={
                'title': pt_data['title'],
                'description': pt_data['description'],
                'is_active': True
            }
        )
        if not created:
            if not lookup.is_active:
                lookup.is_active = True
                lookup.title = pt_data['title']
                lookup.description = pt_data['description']
                lookup.save()
        created_types[pt_data['code']] = lookup
    
    return created_types


def seed_request_statuses(lookup_type):
    """Create all 9 REQUEST_STATUS lookups."""
    statuses = [
        {'code': 'DRAFT', 'title': 'پیش‌نویس'},
        {'code': 'PENDING_APPROVAL', 'title': 'در انتظار ارسال به تأیید'},
        {'code': 'IN_REVIEW', 'title': 'در حال تأیید'},
        {'code': 'REJECTED', 'title': 'رد شده'},
        {'code': 'RESUBMITTED', 'title': 'ارسال مجدد شده'},
        {'code': 'FULLY_APPROVED', 'title': 'تأیید شده (قبل از مالی)'},
        {'code': 'FINANCE_REVIEW', 'title': 'در حال بررسی مالی'},
        {'code': 'COMPLETED', 'title': 'تکمیل شده / آمادهٔ پرداخت'},
        {'code': 'ARCHIVED', 'title': 'بایگانی شده'},
    ]
    
    created_statuses = {}
    for status_data in statuses:
        lookup, created = Lookup.objects.get_or_create(
            type=lookup_type,
            code=status_data['code'],
            defaults={
                'title': status_data['title'],
                'description': status_data.get('description', ''),
                'is_active': True
            }
        )
        if not created:
            if not lookup.is_active:
                lookup.is_active = True
                lookup.title = status_data['title']
                if 'description' in status_data:
                    lookup.description = status_data['description']
                lookup.save()
        created_statuses[status_data['code']] = lookup
    
    return created_statuses


def seed_all_lookups(lookup_types):
    """Seed all lookups and return a dictionary of all created lookups."""
    all_lookups = {}
    
    # Seed COMPANY_ROLE
    company_role_type = lookup_types['COMPANY_ROLE']
    all_lookups['COMPANY_ROLE'] = seed_company_roles(company_role_type)
    
    # Seed PURCHASE_TYPE
    purchase_type_type = lookup_types['PURCHASE_TYPE']
    all_lookups['PURCHASE_TYPE'] = seed_purchase_types(purchase_type_type)
    
    # Seed REQUEST_STATUS
    request_status_type = lookup_types['REQUEST_STATUS']
    all_lookups['REQUEST_STATUS'] = seed_request_statuses(request_status_type)
    
    # Seed minimal values for other lookup types (for system completeness)
    other_types = ['ORG_TYPE', 'LEGAL_ENTITY_TYPE', 'INDUSTRY_TYPE', 'SUB_INDUSTRY_TYPE', 'COMPANY_CLASSIFICATION']
    for type_code in other_types:
        if type_code in lookup_types:
            # Create minimal seed values
            lookup_type = lookup_types[type_code]
            all_lookups[type_code] = {}
            # Add a default value for each type
            default_lookup, _ = Lookup.objects.get_or_create(
                type=lookup_type,
                code='DEFAULT',
                defaults={
                    'title': 'پیش‌فرض',
                    'description': '',
                    'is_active': True
                }
            )
            all_lookups[type_code]['DEFAULT'] = default_lookup
    
    return all_lookups









