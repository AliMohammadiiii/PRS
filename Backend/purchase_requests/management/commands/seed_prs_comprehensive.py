"""
Management command to seed comprehensive PRS data.

This command creates:
- 8 LookupTypes with Persian titles
- All Lookups (14 COMPANY_ROLE, 8 PURCHASE_TYPE, 9 REQUEST_STATUS)
- 7 Teams in Persian
- 9 Users (8 role-based + 1 admin)
- AccessScopes for all users (including CFO, CEO, legal, warehouse across teams)
- 9 FormTemplates with base fields + team-specific fields
- 9 WorkflowTemplates with proper steps and approvers
- 10 TeamPurchaseConfigs
- 42 AttachmentCategories (7 teams × 6 categories)
- Sample PurchaseRequest

Usage:
    python manage.py seed_prs_comprehensive
    python manage.py seed_prs_comprehensive --reset  # Delete existing seed data first
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from classifications.models import LookupType, Lookup
from teams.models import Team
from accounts.models import AccessScope
from prs_forms.models import FormTemplate, FormField
from workflows.models import WorkflowTemplate, WorkflowTemplateStep, WorkflowTemplateStepApprover
from prs_team_config.models import TeamPurchaseConfig
from attachments.models import AttachmentCategory
from purchase_requests.models import PurchaseRequest

# Import helper modules
from .seed_prs_comprehensive_lookups import (
    seed_lookup_types,
    seed_all_lookups
)
from .seed_prs_comprehensive_teams_users import (
    seed_teams,
    seed_users,
    seed_access_scopes
)
from .seed_prs_comprehensive_forms import (
    create_base_form_fields,
    create_form_template_marketing_goods,
    create_form_template_marketing_service,
    create_form_template_tech_asset,
    create_form_template_tech_project,
    create_form_template_product_consulting,
    create_form_template_finance_service,
    create_form_template_operations_goods,
    create_form_template_hr_service,
    create_form_template_emergency
)
from .seed_prs_comprehensive_workflows import (
    create_workflow_template_standard,
    create_workflow_template_asset,
    create_workflow_template_consulting,
    create_workflow_template_emergency
)
from .seed_prs_comprehensive_configs import (
    seed_team_purchase_configs,
    seed_attachment_categories,
    seed_sample_purchase_request
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed comprehensive PRS data (lookups, teams, users, forms, workflows, configs)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing seed data before seeding',
        )

    def handle(self, *args, **options):
        reset = options['reset']

        with transaction.atomic():
            if reset:
                self.stdout.write(self.style.WARNING('Deleting existing seed data...'))
                self._delete_seed_data()

            self.stdout.write(self.style.SUCCESS('Seeding comprehensive PRS data...'))
            self.stdout.write('')

            # Step 1: Seed LookupTypes
            self.stdout.write(self.style.SUCCESS('1. Seeding LookupTypes...'))
            lookup_types = seed_lookup_types()
            self.stdout.write(f'   ✓ Created {len(lookup_types)} LookupTypes')

            # Step 2: Seed Lookups
            self.stdout.write(self.style.SUCCESS('2. Seeding Lookups...'))
            all_lookups = seed_all_lookups(lookup_types)
            company_roles = all_lookups['COMPANY_ROLE']
            purchase_types = all_lookups['PURCHASE_TYPE']
            request_statuses = all_lookups['REQUEST_STATUS']
            self.stdout.write(f'   ✓ Created {len(company_roles)} COMPANY_ROLE lookups')
            self.stdout.write(f'   ✓ Created {len(purchase_types)} PURCHASE_TYPE lookups')
            self.stdout.write(f'   ✓ Created {len(request_statuses)} REQUEST_STATUS lookups')

            # Step 3: Seed Teams
            self.stdout.write(self.style.SUCCESS('3. Seeding Teams...'))
            teams = seed_teams()
            self.stdout.write(f'   ✓ Created {len(teams)} Teams')

            # Step 4: Seed Users
            self.stdout.write(self.style.SUCCESS('4. Seeding Users...'))
            users = seed_users()
            self.stdout.write(f'   ✓ Created {len(users)} Users')

            # Step 5: Seed AccessScopes
            self.stdout.write(self.style.SUCCESS('5. Seeding AccessScopes...'))
            access_scopes = seed_access_scopes(teams, users, all_lookups)
            self.stdout.write(f'   ✓ Created {len(access_scopes)} AccessScope entries')

            # Step 6: Seed FormTemplates (reusable across teams and purchase types)
            self.stdout.write(self.style.SUCCESS('6. Seeding FormTemplates and FormFields...'))
            created_by = users.get('req.marketing') or users.get('procurement') or list(users.values())[0]
            
            form_templates = {}
            
            # Create reusable form templates (shared across multiple teams/purchase types)
            # Template 1: Standard Goods Form (reused by Marketing and Operations for GOODS_STANDARD)
            form_templates['standard_goods'] = create_form_template_marketing_goods(
                teams['مارکتینگ'], created_by
            )
            
            # Template 2: Operational Service Form (reused by Marketing, Finance, HR for SERVICE_OPERATIONAL)
            form_templates['operational_service'] = create_form_template_marketing_service(
                teams['مارکتینگ'], created_by
            )
            
            # Template 3: Asset Purchase Form (used by Tech for GOODS_ASSET)
            form_templates['asset'] = create_form_template_tech_asset(
                teams['فنی'], created_by, teams
            )
            
            # Template 4: Project Service Form (used by Tech for SERVICE_PROJECT)
            form_templates['project_service'] = create_form_template_tech_project(
                teams['فنی'], created_by
            )
            
            # Template 5: Consulting Service Form (used by Product for SERVICE_CONSULTING)
            form_templates['consulting'] = create_form_template_product_consulting(
                teams['محصول'], created_by
            )
            
            # Template 6: Emergency Form (reused by Management for both GOODS_EMERGENCY and SERVICE_EMERGENCY)
            form_templates['emergency'] = create_form_template_emergency(
                teams['مدیریت و اداری'], created_by
            )
            
            # Map templates to their usage (for TeamPurchaseConfig)
            form_templates['marketing_goods'] = form_templates['standard_goods']
            form_templates['marketing_service'] = form_templates['operational_service']
            form_templates['tech_asset'] = form_templates['asset']
            form_templates['tech_project'] = form_templates['project_service']
            form_templates['product_consulting'] = form_templates['consulting']
            form_templates['finance_service'] = form_templates['operational_service']
            form_templates['operations_goods'] = form_templates['standard_goods']
            form_templates['hr_service'] = form_templates['operational_service']
            
            unique_templates = len(set(form_templates.values()))
            self.stdout.write(f'   ✓ Created {unique_templates} reusable FormTemplates (shared across {len(form_templates)} team+purchase_type combinations)')

            # Step 7: Seed WorkflowTemplates (reusable across teams and purchase types)
            self.stdout.write(self.style.SUCCESS('7. Seeding WorkflowTemplates, Steps, and Approvers...'))
            workflow_templates = {}
            
            # Create reusable workflow templates (shared across multiple teams/purchase types)
            # Workflow 1: Standard workflow (reused by 5 team+purchase_type combinations)
            workflow_templates['standard'] = create_workflow_template_standard(
                teams['مارکتینگ'],
                None,  # name parameter no longer used
                'GOODS_STANDARD',
                company_roles
            )
            
            # Workflow 2: Asset workflow (reused by 2 team+purchase_type combinations)
            workflow_templates['asset'] = create_workflow_template_asset(
                teams['فنی'],
                None,  # name parameter no longer used
                'GOODS_ASSET',
                company_roles
            )
            
            # Workflow 3: Consulting workflow (used by 1 team+purchase_type combination)
            workflow_templates['consulting'] = create_workflow_template_consulting(
                teams['محصول'],
                None,  # name parameter no longer used
                'SERVICE_CONSULTING',
                company_roles
            )
            
            # Workflow 4: Emergency workflow (reused by 2 purchase types)
            workflow_templates['emergency'] = create_workflow_template_emergency(
                teams['مدیریت و اداری'],
                company_roles
            )
            
            # Map workflows to their usage (for TeamPurchaseConfig)
            workflow_templates['marketing_goods'] = workflow_templates['standard']
            workflow_templates['marketing_service'] = workflow_templates['standard']
            workflow_templates['tech_asset'] = workflow_templates['asset']
            workflow_templates['tech_project'] = workflow_templates['asset']
            workflow_templates['product_consulting'] = workflow_templates['consulting']
            workflow_templates['finance_service'] = workflow_templates['standard']
            workflow_templates['operations_goods'] = workflow_templates['standard']
            workflow_templates['hr_service'] = workflow_templates['standard']
            
            unique_workflows = len(set(workflow_templates.values()))
            self.stdout.write(f'   ✓ Created {unique_workflows} reusable WorkflowTemplates (shared across {len(workflow_templates)} team+purchase_type combinations)')

            # Step 8: Seed TeamPurchaseConfigs
            self.stdout.write(self.style.SUCCESS('8. Seeding TeamPurchaseConfigs...'))
            configs = seed_team_purchase_configs(teams, purchase_types, form_templates, workflow_templates)
            self.stdout.write(f'   ✓ Created {len(configs)} TeamPurchaseConfig entries')

            # Step 9: Seed AttachmentCategories
            self.stdout.write(self.style.SUCCESS('9. Seeding AttachmentCategories...'))
            categories = seed_attachment_categories(teams)
            self.stdout.write(f'   ✓ Created {len(categories)} AttachmentCategory entries (7 teams × 6 categories)')

            # Step 10: Seed Sample PurchaseRequest
            self.stdout.write(self.style.SUCCESS('10. Seeding Sample PurchaseRequest...'))
            sample_request = seed_sample_purchase_request(
                users, teams, purchase_types, request_statuses, form_templates, workflow_templates
            )
            if sample_request:
                self.stdout.write(f'   ✓ Created sample PurchaseRequest: {sample_request.subject}')
            else:
                self.stdout.write(self.style.WARNING('   - Skipped sample PurchaseRequest (user not found)'))

            # Summary
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('✅ Successfully seeded comprehensive PRS data!'))
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('Summary:'))
            self.stdout.write(f'  - {len(lookup_types)} LookupTypes')
            self.stdout.write(f'  - {len(company_roles)} COMPANY_ROLE lookups')
            self.stdout.write(f'  - {len(purchase_types)} PURCHASE_TYPE lookups')
            self.stdout.write(f'  - {len(request_statuses)} REQUEST_STATUS lookups')
            self.stdout.write(f'  - {len(teams)} Teams')
            self.stdout.write(f'  - {len(users)} Users')
            self.stdout.write(f'  - {len(access_scopes)} AccessScope entries')
            unique_form_templates = len(set(form_templates.values()))
            unique_workflow_templates = len(set(workflow_templates.values()))
            self.stdout.write(f'  - {unique_form_templates} FormTemplates (reused across {len(form_templates)} combinations)')
            self.stdout.write(f'  - {unique_workflow_templates} WorkflowTemplates (reused across {len(workflow_templates)} combinations)')
            self.stdout.write(f'  - {len(configs)} TeamPurchaseConfigs')
            self.stdout.write(f'  - {len(categories)} AttachmentCategories')
            if sample_request:
                self.stdout.write(f'  - 1 Sample PurchaseRequest')
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('User passwords are set to their usernames.'))
            self.stdout.write(self.style.SUCCESS('Admin user: username=admin, password=admin'))

    def _delete_seed_data(self):
        """Delete all seed data in correct dependency order."""
        # Delete PurchaseRequest
        PurchaseRequest.objects.filter(
            requestor__username__in=['admin', 'req.marketing', 'manager.marketing', 'procurement', 
                                     'finance.controller', 'cfo', 'ceo', 'legal', 'warehouse']
        ).delete()
        
        # Delete TeamPurchaseConfigs
        TeamPurchaseConfig.objects.filter(
            team__name__in=['مارکتینگ', 'محصول', 'فنی', 'مالی', 'عملیات', 'منابع انسانی', 'مدیریت و اداری']
        ).delete()
        
        # Delete WorkflowTemplateStepApprovers
        WorkflowTemplateStepApprover.objects.all().delete()
        
        # Delete WorkflowTemplateSteps
        WorkflowTemplateStep.objects.all().delete()
        
        # Delete WorkflowTemplates
        WorkflowTemplate.objects.all().delete()
        
        # Delete FormFields
        FormField.objects.all().delete()
        
        # Delete FormTemplates
        FormTemplate.objects.all().delete()
        
        # Delete AttachmentCategories
        AttachmentCategory.objects.filter(
            team__name__in=['مارکتینگ', 'محصول', 'فنی', 'مالی', 'عملیات', 'منابع انسانی', 'مدیریت و اداری']
        ).delete()
        
        # Delete AccessScopes
        AccessScope.objects.filter(
            user__username__in=['admin', 'req.marketing', 'manager.marketing', 'procurement', 
                                'finance.controller', 'cfo', 'ceo', 'legal', 'warehouse']
        ).delete()
        
        # Delete Users
        User.objects.filter(
            username__in=['admin', 'req.marketing', 'manager.marketing', 'procurement', 
                          'finance.controller', 'cfo', 'ceo', 'legal', 'warehouse']
        ).delete()
        
        # Delete Teams
        Team.objects.filter(
            name__in=['مارکتینگ', 'محصول', 'فنی', 'مالی', 'عملیات', 'منابع انسانی', 'مدیریت و اداری']
        ).delete()
        
        # Note: We don't delete LookupTypes and Lookups as they may be used by other parts of the system
        # If you need to delete them, uncomment the following:
        # Lookup.objects.filter(
        #     type__code__in=['COMPANY_ROLE', 'PURCHASE_TYPE', 'REQUEST_STATUS']
        # ).delete()
        # LookupType.objects.filter(
        #     code__in=['COMPANY_ROLE', 'PURCHASE_TYPE', 'REQUEST_STATUS', 'ORG_TYPE', 
        #               'LEGAL_ENTITY_TYPE', 'INDUSTRY_TYPE', 'SUB_INDUSTRY_TYPE', 'COMPANY_CLASSIFICATION']
        # ).delete()

