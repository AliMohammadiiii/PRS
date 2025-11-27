"""
Helper module for seeding Teams, Users, and AccessScopes for comprehensive PRS seed data.
"""

from django.contrib.auth import get_user_model
from teams.models import Team
from accounts.models import AccessScope
from classifications.models import Lookup

User = get_user_model()


def seed_teams():
    """Create all 7 teams with Persian names and descriptions."""
    teams_data = [
        {'name': 'مارکتینگ', 'description': 'کمپین‌ها، تبلیغات، رویدادها، تولید محتوا'},
        {'name': 'محصول', 'description': 'طراحی و توسعه محصول، ابزارهای Product Analytics، UX Research'},
        {'name': 'فنی', 'description': 'زیرساخت، توسعه نرم‌افزار، تجهیزات IT'},
        {'name': 'مالی', 'description': 'حسابداری، پرداخت، کنترل بودجه'},
        {'name': 'عملیات', 'description': 'عملیات خدمات، پشتیبانی مشتری، لجستیک'},
        {'name': 'منابع انسانی', 'description': 'استخدام، آموزش، رفاه پرسنل'},
        {'name': 'مدیریت و اداری', 'description': 'هیات‌مدیره، مدیریت ارشد، امور اداری و عمومی'},
    ]
    
    created_teams = {}
    for team_data in teams_data:
        team, created = Team.objects.get_or_create(
            name=team_data['name'],
            defaults={
                'description': team_data['description'],
                'is_active': True
            }
        )
        if not created:
            if not team.is_active:
                team.is_active = True
                team.description = team_data['description']
                team.save()
        created_teams[team_data['name']] = team
    
    return created_teams


def seed_users():
    """Create all 9 users with Persian names (8 role-based + 1 admin)."""
    users_data = [
        {'username': 'admin', 'first_name': 'مدیر', 'last_name': 'سیستم', 'email': 'admin@example.com', 'is_superuser': True, 'is_staff': True},
        {'username': 'req.marketing', 'first_name': 'درخواست‌کننده', 'last_name': 'مارکتینگ', 'email': 'req.marketing@example.com'},
        {'username': 'manager.marketing', 'first_name': 'مدیر', 'last_name': 'مارکتینگ', 'email': 'manager.marketing@example.com'},
        {'username': 'procurement', 'first_name': 'کارشناس', 'last_name': 'تدارکات', 'email': 'procurement@example.com'},
        {'username': 'finance.controller', 'first_name': 'کنترلر', 'last_name': 'مالی', 'email': 'finance.controller@example.com'},
        {'username': 'cfo', 'first_name': 'مدیر', 'last_name': 'مالی', 'email': 'cfo@example.com'},
        {'username': 'ceo', 'first_name': 'مدیرعامل', 'last_name': '', 'email': 'ceo@example.com'},
        {'username': 'legal', 'first_name': 'کارشناس', 'last_name': 'حقوقی', 'email': 'legal@example.com'},
        {'username': 'warehouse', 'first_name': 'انباردار', 'last_name': '', 'email': 'warehouse@example.com'},
    ]
    
    created_users = {}
    for user_data in users_data:
        defaults = {
            'email': user_data['email'],
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'is_active': True
        }
        # Add superuser/staff flags if present
        if 'is_superuser' in user_data:
            defaults['is_superuser'] = user_data['is_superuser']
        if 'is_staff' in user_data:
            defaults['is_staff'] = user_data['is_staff']
        
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults=defaults
        )
        if created:
            # Set password = username
            user.set_password(user_data['username'])
            user.save()
        else:
            # Update existing user if needed
            updated = False
            if not user.is_active:
                user.is_active = True
                updated = True
            # Update superuser/staff flags if provided
            if 'is_superuser' in user_data and user.is_superuser != user_data['is_superuser']:
                user.is_superuser = user_data['is_superuser']
                updated = True
            if 'is_staff' in user_data and user.is_staff != user_data['is_staff']:
                user.is_staff = user_data['is_staff']
                updated = True
            if updated:
                user.save()
        created_users[user_data['username']] = user
    
    return created_users


def seed_access_scopes(teams, users, lookups):
    """Create all AccessScope entries."""
    company_roles = lookups['COMPANY_ROLE']
    
    access_scopes = []
    
    # req.marketing → مارکتینگ → REQUESTER
    if 'req.marketing' in users and 'مارکتینگ' in teams:
        scope, _ = AccessScope.objects.get_or_create(
            user=users['req.marketing'],
            team=teams['مارکتینگ'],
            role=company_roles['REQUESTER'],
            defaults={'is_active': True}
        )
        access_scopes.append(scope)
    
    # manager.marketing → مارکتینگ → TEAM_MANAGER
    if 'manager.marketing' in users and 'مارکتینگ' in teams:
        scope, _ = AccessScope.objects.get_or_create(
            user=users['manager.marketing'],
            team=teams['مارکتینگ'],
            role=company_roles['TEAM_MANAGER'],
            defaults={'is_active': True}
        )
        access_scopes.append(scope)
    
    # procurement → ALL 7 teams → PROCUREMENT_OFFICER
    if 'procurement' in users:
        for team_name, team in teams.items():
            scope, _ = AccessScope.objects.get_or_create(
                user=users['procurement'],
                team=team,
                role=company_roles['PROCUREMENT_OFFICER'],
                defaults={'is_active': True}
            )
            access_scopes.append(scope)
    
    # finance.controller → ALL 7 teams → FINANCE_CONTROLLER
    if 'finance.controller' in users:
        for team_name, team in teams.items():
            scope, _ = AccessScope.objects.get_or_create(
                user=users['finance.controller'],
                team=team,
                role=company_roles['FINANCE_CONTROLLER'],
                defaults={'is_active': True}
            )
            access_scopes.append(scope)
    
    # CFO → ALL teams → CFO (primary team is مالی, but access to all for flexibility)
    if 'cfo' in users:
        for team_name, team in teams.items():
            scope, _ = AccessScope.objects.get_or_create(
                user=users['cfo'],
                team=team,
                role=company_roles['CFO'],
                defaults={'is_active': True}
            )
            access_scopes.append(scope)
    
    # CEO → ALL teams → CEO (can approve across all teams)
    if 'ceo' in users:
        for team_name, team in teams.items():
            scope, _ = AccessScope.objects.get_or_create(
                user=users['ceo'],
                team=team,
                role=company_roles['CEO'],
                defaults={'is_active': True}
            )
            access_scopes.append(scope)
    
    # legal → ALL teams → LEGAL_REVIEWER (full flexibility for legal review across teams)
    if 'legal' in users:
        for team_name, team in teams.items():
            scope, _ = AccessScope.objects.get_or_create(
                user=users['legal'],
                team=team,
                role=company_roles['LEGAL_REVIEWER'],
                defaults={'is_active': True}
            )
            access_scopes.append(scope)
    
    # warehouse → عملیات team → WAREHOUSE_OFFICER
    if 'warehouse' in users and 'عملیات' in teams:
        scope, _ = AccessScope.objects.get_or_create(
            user=users['warehouse'],
            team=teams['عملیات'],
            role=company_roles['WAREHOUSE_OFFICER'],
            defaults={'is_active': True}
        )
        access_scopes.append(scope)
    
    # admin → ALL teams → SYSTEM_ADMIN (if SYSTEM_ADMIN role exists)
    if 'admin' in users and 'SYSTEM_ADMIN' in company_roles:
        for team_name, team in teams.items():
            scope, _ = AccessScope.objects.get_or_create(
                user=users['admin'],
                team=team,
                role=company_roles['SYSTEM_ADMIN'],
                defaults={'is_active': True}
            )
            access_scopes.append(scope)
    
    return access_scopes

