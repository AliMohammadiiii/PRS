"""
Helper module for seeding TeamPurchaseConfigs, AttachmentCategories, and PurchaseRequest for comprehensive PRS seed data.
"""

from prs_team_config.models import TeamPurchaseConfig
from attachments.models import AttachmentCategory
from purchase_requests.models import PurchaseRequest


def seed_team_purchase_configs(teams, purchase_types, form_templates, workflow_templates):
    """Create all 10 TeamPurchaseConfig entries."""
    configs = []
    
    # 1. مارکتینگ + GOODS_STANDARD
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['مارکتینگ'],
        purchase_type=purchase_types['GOODS_STANDARD'],
        defaults={
            'form_template': form_templates['marketing_goods'],
            'workflow_template': workflow_templates['marketing_goods'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 2. مارکتینگ + SERVICE_OPERATIONAL
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['مارکتینگ'],
        purchase_type=purchase_types['SERVICE_OPERATIONAL'],
        defaults={
            'form_template': form_templates['marketing_service'],
            'workflow_template': workflow_templates['marketing_service'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 3. فنی + GOODS_ASSET
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['فنی'],
        purchase_type=purchase_types['GOODS_ASSET'],
        defaults={
            'form_template': form_templates['tech_asset'],
            'workflow_template': workflow_templates['tech_asset'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 4. فنی + SERVICE_PROJECT
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['فنی'],
        purchase_type=purchase_types['SERVICE_PROJECT'],
        defaults={
            'form_template': form_templates['tech_project'],
            'workflow_template': workflow_templates['tech_project'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 5. محصول + SERVICE_CONSULTING
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['محصول'],
        purchase_type=purchase_types['SERVICE_CONSULTING'],
        defaults={
            'form_template': form_templates['product_consulting'],
            'workflow_template': workflow_templates['product_consulting'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 6. مالی + SERVICE_OPERATIONAL
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['مالی'],
        purchase_type=purchase_types['SERVICE_OPERATIONAL'],
        defaults={
            'form_template': form_templates['finance_service'],
            'workflow_template': workflow_templates['finance_service'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 7. عملیات + GOODS_STANDARD
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['عملیات'],
        purchase_type=purchase_types['GOODS_STANDARD'],
        defaults={
            'form_template': form_templates['operations_goods'],
            'workflow_template': workflow_templates['operations_goods'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 8. منابع انسانی + SERVICE_OPERATIONAL
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['منابع انسانی'],
        purchase_type=purchase_types['SERVICE_OPERATIONAL'],
        defaults={
            'form_template': form_templates['hr_service'],
            'workflow_template': workflow_templates['hr_service'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 9. مدیریت و اداری + GOODS_EMERGENCY
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['مدیریت و اداری'],
        purchase_type=purchase_types['GOODS_EMERGENCY'],
        defaults={
            'form_template': form_templates['emergency'],
            'workflow_template': workflow_templates['emergency'],
            'is_active': True
        }
    )
    configs.append(config)
    
    # 10. مدیریت و اداری + SERVICE_EMERGENCY
    config, _ = TeamPurchaseConfig.objects.get_or_create(
        team=teams['مدیریت و اداری'],
        purchase_type=purchase_types['SERVICE_EMERGENCY'],
        defaults={
            'form_template': form_templates['emergency'],
            'workflow_template': workflow_templates['emergency'],
            'is_active': True
        }
    )
    configs.append(config)
    
    return configs


def seed_attachment_categories(teams):
    """Create 42 AttachmentCategories (7 teams × 6 categories)."""
    categories_data = [
        {'name': 'پیش‌فاکتور / Quotation', 'required': True},
        {'name': 'قرارداد / Agreement', 'required': False},
        {'name': 'شرح فنی / Specification', 'required': False},
        {'name': 'مستند تأیید بودجه', 'required': False},
        {'name': 'رسید تحویل کالا', 'required': False},
        {'name': 'گزارش تحویل خدمت', 'required': False},
    ]
    
    created_categories = []
    for team_name, team in teams.items():
        for cat_data in categories_data:
            category, _ = AttachmentCategory.objects.get_or_create(
                team=team,
                name=cat_data['name'],
                defaults={
                    'required': cat_data['required'],
                    'is_active': True
                }
            )
            created_categories.append(category)
    
    return created_categories


def seed_sample_purchase_request(users, teams, purchase_types, request_statuses, form_templates, workflow_templates):
    """Create a sample PurchaseRequest."""
    if 'req.marketing' not in users:
        return None
    
    requestor = users['req.marketing']
    team = teams['مارکتینگ']
    purchase_type = purchase_types['SERVICE_OPERATIONAL']
    status = request_statuses['PENDING_APPROVAL']
    form_template = form_templates['marketing_service']
    workflow_template = workflow_templates['marketing_service']
    
    request, _ = PurchaseRequest.objects.get_or_create(
        requestor=requestor,
        team=team,
        form_template=form_template,
        workflow_template=workflow_template,
        defaults={
            'status': status,
            'purchase_type': purchase_type,
            'vendor_name': 'آژانس خلاقیت نوین',
            'vendor_account': 'IR120700234567890',
            'subject': 'خدمات طراحی کمپین',
            'description': 'طراحی کامل کمپین شبکه‌های اجتماعی',
            'is_active': True
        }
    )
    
    return request




