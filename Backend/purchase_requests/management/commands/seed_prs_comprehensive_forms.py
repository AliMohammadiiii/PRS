"""
Helper module for seeding FormTemplates and FormFields for comprehensive PRS seed data.
"""

from django.db.models import Max
from prs_forms.models import FormTemplate, FormField


def _get_or_create_form_template(template_name, created_by):
    """Helper to get or create FormTemplate with proper version number handling."""
    # Check if template with this name exists
    template = FormTemplate.objects.filter(name=template_name, is_active=True).first()
    if not template:
        # Get max version number for this template name
        max_version = FormTemplate.objects.filter(name=template_name).aggregate(
            max_version=Max('version_number')
        )['max_version'] or 0
        template = FormTemplate.objects.create(
            name=template_name,
            version_number=max_version + 1,
            created_by=created_by,
            is_active=True
        )
    return template


def create_base_form_fields(template, order_start=1):
    """Create the 9 base fields that must be in ALL FormTemplates."""
    base_fields = [
        {
            'field_id': 'request_title',
            'name': 'request_title',
            'label': 'عنوان درخواست',
            'field_type': FormField.TEXT,
            'required': True,
            'order': order_start
        },
        {
            'field_id': 'business_reason',
            'name': 'business_reason',
            'label': 'دلیل کسب‌وکاری / توجیه خرید',
            'field_type': FormField.TEXT,
            'required': True,
            'order': order_start + 1
        },
        {
            'field_id': 'total_estimated_amount',
            'name': 'total_estimated_amount',
            'label': 'مبلغ کل تخمینی (ریال)',
            'field_type': FormField.NUMBER,
            'required': True,
            'validation_rules': {'min': 0},
            'order': order_start + 2
        },
        {
            'field_id': 'cost_center',
            'name': 'cost_center',
            'label': 'مرکز هزینه',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['مارکتینگ دیجیتال', 'محصول', 'فنی - زیرساخت', 'HR - آموزش', 'مالی', 'عملیات'],
            'order': order_start + 3
        },
        {
            'field_id': 'budget_line',
            'name': 'budget_line',
            'label': 'کد / ردیف بودجه',
            'field_type': FormField.TEXT,
            'required': False,
            'order': order_start + 4
        },
        {
            'field_id': 'need_by_date',
            'name': 'need_by_date',
            'label': 'تاریخ نیاز / تحویل',
            'field_type': FormField.DATE,
            'required': True,
            'order': order_start + 5
        },
        {
            'field_id': 'vendor_name_detail',
            'name': 'vendor_name_detail',
            'label': 'نام تأمین‌کننده پیشنهادی (در صورت وجود)',
            'field_type': FormField.TEXT,
            'required': False,
            'order': order_start + 6
        },
        {
            'field_id': 'is_emergency',
            'name': 'is_emergency',
            'label': 'آیا خرید اضطراری است؟',
            'field_type': FormField.BOOLEAN,
            'required': False,
            'order': order_start + 7
        },
        {
            'field_id': 'notes_internal',
            'name': 'notes_internal',
            'label': 'یادداشت داخلی برای تیم تدارکات / مالی',
            'field_type': FormField.TEXT,
            'required': False,
            'order': order_start + 8
        },
    ]
    
    created_fields = []
    for field_data in base_fields:
        field, _ = FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'validation_rules': field_data.get('validation_rules', {}),
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
        created_fields.append(field)
    
    return created_fields


def create_form_template_marketing_goods(team, created_by):
    """Create reusable FormTemplate for Standard Goods (GOODS_STANDARD) - shared across teams."""
    template = _get_or_create_form_template(
        'فرم خرید کالای استاندارد', created_by
    )
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create team-specific fields (order 10-14)
    team_fields = [
        {
            'field_id': 'campaign_name',
            'name': 'campaign_name',
            'label': 'نام کمپین / فعالیت',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 10
        },
        {
            'field_id': 'channel_type',
            'name': 'channel_type',
            'label': 'نوع کانال تبلیغاتی',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['دیجیتال (آنلاین)', 'آفلاین (محیطی / بیلبورد)', 'رویداد', 'اسپانسرشیپ'],
            'order': 11
        },
        {
            'field_id': 'target_audience',
            'name': 'target_audience',
            'label': 'گروه هدف',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 12
        },
        {
            'field_id': 'expected_kpi',
            'name': 'expected_kpi',
            'label': 'KPI مورد انتظار (نرخ تبدیل، لید، …)',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 13
        },
        {
            'field_id': 'item_list_file',
            'name': 'item_list_file',
            'label': 'لیست اقلام / فایل جزئیات خرید (Excel)',
            'field_type': FormField.FILE_UPLOAD,
            'required': False,
            'order': 14
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
    
    return template


def create_form_template_marketing_service(team, created_by):
    """Create reusable FormTemplate for Operational Service (SERVICE_OPERATIONAL) - shared across teams."""
    template = _get_or_create_form_template(
        'فرم خرید خدمت عملیاتی', created_by
    )
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create team-specific fields (order 10-13)
    team_fields = [
        {
            'field_id': 'service_type_marketing',
            'name': 'service_type_marketing',
            'label': 'نوع خدمت',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['تبلیغات کلیکی', 'تولید محتوا', 'مدیریت شبکه‌های اجتماعی', 'روابط عمومی'],
            'order': 10
        },
        {
            'field_id': 'service_period',
            'name': 'service_period',
            'label': 'دوره خدمت (مثلاً ۳ ماهه)',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 11
        },
        {
            'field_id': 'deliverables_description',
            'name': 'deliverables_description',
            'label': 'تحویل‌دادنی‌ها (Deliverables)',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 12
        },
        {
            'field_id': 'performance_metrics',
            'name': 'performance_metrics',
            'label': 'شاخص‌های عملکردی (KPI)',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 13
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
    
    return template


def create_form_template_tech_asset(team, created_by, all_teams):
    """Create reusable FormTemplate for Asset Purchase (GOODS_ASSET) - shared across teams."""
    template = _get_or_create_form_template(
        'فرم خرید کالای سرمایه‌ای', created_by
    )
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Get team names for dropdown
    team_names = list(all_teams.keys())
    
    # Create team-specific fields (order 10-14)
    team_fields = [
        {
            'field_id': 'asset_category',
            'name': 'asset_category',
            'label': 'نوع دارایی',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['سرور', 'ذخیره‌سازی', 'شبکه', 'لپ‌تاپ', 'مانیتور', 'سایر تجهیزات سخت‌افزاری'],
            'order': 10
        },
        {
            'field_id': 'quantity',
            'name': 'quantity',
            'label': 'تعداد',
            'field_type': FormField.NUMBER,
            'required': True,
            'validation_rules': {'min': 1},
            'order': 11
        },
        {
            'field_id': 'technical_specs',
            'name': 'technical_specs',
            'label': 'مشخصات فنی موردنیاز',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 12
        },
        {
            'field_id': 'justification_it',
            'name': 'justification_it',
            'label': 'توجیه فنی (ظرفیت، کارایی، جایگزینی)',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 13
        },
        {
            'field_id': 'asset_owner_team',
            'name': 'asset_owner_team',
            'label': 'مالک دارایی',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': team_names,
            'order': 14
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'validation_rules': field_data.get('validation_rules', {}),
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
    
    return template


def create_form_template_tech_project(team, created_by):
    """Create reusable FormTemplate for Project Service (SERVICE_PROJECT) - shared across teams."""
    template = _get_or_create_form_template(
        'فرم خرید خدمت پروژه‌ای', created_by
    )
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create team-specific fields (order 10-14)
    team_fields = [
        {
            'field_id': 'project_name',
            'name': 'project_name',
            'label': 'نام پروژه',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 10
        },
        {
            'field_id': 'scope_of_work',
            'name': 'scope_of_work',
            'label': 'شرح محدوده کار (Scope of Work)',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 11
        },
        {
            'field_id': 'project_duration',
            'name': 'project_duration',
            'label': 'مدت اجرای پروژه',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 12
        },
        {
            'field_id': 'milestones',
            'name': 'milestones',
            'label': 'مهم‌ترین مایلستون‌ها',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 13
        },
        {
            'field_id': 'requires_legal_review',
            'name': 'requires_legal_review',
            'label': 'نیاز به بررسی حقوقی دارد',
            'field_type': FormField.BOOLEAN,
            'required': False,
            'order': 14
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'is_active': True
            }
        )
    
    return template


def create_form_template_product_consulting(team, created_by):
    """Create reusable FormTemplate for Consulting Service (SERVICE_CONSULTING) - shared across teams."""
    template = _get_or_create_form_template(
        'فرم خرید خدمت مشاوره', created_by
    )
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create team-specific fields (order 10-13)
    team_fields = [
        {
            'field_id': 'consulting_area',
            'name': 'consulting_area',
            'label': 'حوزه مشاوره',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['تحقیق کاربر', 'UX / UI', 'تحلیل داده محصول', 'استراتژی محصول'],
            'order': 10
        },
        {
            'field_id': 'consultant_profile',
            'name': 'consultant_profile',
            'label': 'ویژگی‌های مشاور / شرکت مشاوره',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 11
        },
        {
            'field_id': 'expected_outcomes',
            'name': 'expected_outcomes',
            'label': 'خروجی‌های مورد انتظار (Outcome)',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 12
        },
        {
            'field_id': 'engagement_model',
            'name': 'engagement_model',
            'label': 'نوع همکاری',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['ساعتی', 'پروژه‌ای', 'Retainer'],
            'order': 13
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
    
    return template


def create_form_template_finance_service(team, created_by):
    """Create reusable FormTemplate for Operational Service (SERVICE_OPERATIONAL) - shared across teams."""
    # This function now just returns the same template as marketing_service
    # Kept for backward compatibility
    return create_form_template_marketing_service(team, created_by)
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create team-specific fields (order 10-12)
    team_fields = [
        {
            'field_id': 'service_category_finance',
            'name': 'service_category_finance',
            'label': 'نوع خدمت مالی / پشتیبان',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['حسابرسی', 'مشاوره مالیاتی', 'نرم‌افزار مالی', 'خدمات بانکی'],
            'order': 10
        },
        {
            'field_id': 'is_recurring',
            'name': 'is_recurring',
            'label': 'آیا خدمت تکرارشونده است؟',
            'field_type': FormField.BOOLEAN,
            'required': True,
            'order': 11
        },
        {
            'field_id': 'recurrence_period',
            'name': 'recurrence_period',
            'label': 'تناوب تکرار (مثلاً ماهانه)',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 12
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
    
    return template


def create_form_template_operations_goods(team, created_by):
    """Create reusable FormTemplate for Standard Goods (GOODS_STANDARD) - shared across teams."""
    # This function now just returns the same template as marketing_goods
    # Kept for backward compatibility
    return create_form_template_marketing_goods(team, created_by)
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create team-specific fields (order 10-13)
    team_fields = [
        {
            'field_id': 'usage_location',
            'name': 'usage_location',
            'label': 'محل استفاده / شعبه',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 10
        },
        {
            'field_id': 'items_description',
            'name': 'items_description',
            'label': 'شرح اقلام موردنیاز',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 11
        },
        {
            'field_id': 'need_type',
            'name': 'need_type',
            'label': 'نوع نیاز',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['مصرفی روزمره', 'تجهیزات دفتر', 'تجهیزات فروشگاهی'],
            'order': 12
        },
        {
            'field_id': 'delivery_constraints',
            'name': 'delivery_constraints',
            'label': 'محدودیت‌های تحویل (شیفت، ساعت، دسترسی)',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 13
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
    
    return template


def create_form_template_hr_service(team, created_by):
    """Create reusable FormTemplate for Operational Service (SERVICE_OPERATIONAL) - shared across teams."""
    # This function now just returns the same template as marketing_service
    # Kept for backward compatibility
    return create_form_template_marketing_service(team, created_by)
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create team-specific fields (order 10-12)
    team_fields = [
        {
            'field_id': 'service_hr_type',
            'name': 'service_hr_type',
            'label': 'نوع خدمت HR',
            'field_type': FormField.DROPDOWN,
            'required': True,
            'dropdown_options': ['آموزش', 'رویداد داخلی', 'کوچینگ', 'سرویس رفاهی'],
            'order': 10
        },
        {
            'field_id': 'participants_count',
            'name': 'participants_count',
            'label': 'تعداد نفرات هدف',
            'field_type': FormField.NUMBER,
            'required': False,
            'validation_rules': {'min': 0},
            'order': 11
        },
        {
            'field_id': 'session_dates',
            'name': 'session_dates',
            'label': 'تاریخ‌های پیشنهادی برگزاری',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 12
        },
    ]
    
    for field_data in team_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'validation_rules': field_data.get('validation_rules', {}),
                'dropdown_options': field_data.get('dropdown_options', None),
                'is_active': True
            }
        )
    
    return template


def create_form_template_emergency(team, created_by):
    """Create FormTemplate for Emergency Purchases."""
    template = _get_or_create_form_template(
        'فرم خرید اضطراری', created_by
    )
    
    # Create base fields (order 1-9)
    create_base_form_fields(template, order_start=1)
    
    # Create emergency-specific fields (order 10-13)
    emergency_fields = [
        {
            'field_id': 'emergency_reason',
            'name': 'emergency_reason',
            'label': 'توضیح شرایط اضطراری و پیامد تأخیر',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 10
        },
        {
            'field_id': 'risk_if_delayed',
            'name': 'risk_if_delayed',
            'label': 'ریسک در صورت عدم انجام خرید',
            'field_type': FormField.TEXT,
            'required': True,
            'order': 11
        },
        {
            'field_id': 'management_pre_approval',
            'name': 'management_pre_approval',
            'label': 'تأیید اولیه مدیر ارشد گرفته شده است؟',
            'field_type': FormField.BOOLEAN,
            'required': True,
            'order': 12
        },
        {
            'field_id': 'management_pre_approval_note',
            'name': 'management_pre_approval_note',
            'label': 'توضیح / نام مدیر تأییدکننده',
            'field_type': FormField.TEXT,
            'required': False,
            'order': 13
        },
    ]
    
    for field_data in emergency_fields:
        FormField.objects.get_or_create(
            template=template,
            field_id=field_data['field_id'],
            defaults={
                'name': field_data['name'],
                'label': field_data['label'],
                'field_type': field_data['field_type'],
                'required': field_data['required'],
                'order': field_data['order'],
                'is_active': True
            }
        )
    
    return template

