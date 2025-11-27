from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from accounts.models import User, AccessScope


class CaseInsensitiveTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that performs case-insensitive username lookup.
    This allows users to login with any case variation of their username.
    """
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username:
            # Perform case-insensitive username lookup
            User = get_user_model()
            try:
                user = User.objects.get(username__iexact=username)
                # Update attrs with the actual username from database
                attrs['username'] = user.username
            except User.DoesNotExist:
                # If user not found, let the parent class handle the error
                pass
        
        # Call parent validation with the corrected username
        return super().validate(attrs)


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'password',
            'first_name',
            'last_name',
            'email',
            'mobile_phone',
            'national_code',
            'is_active',
            'is_staff',
            'is_superuser',
            'last_login',
            'date_joined',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'created_at', 'updated_at']

    def validate_username(self, value):
        """
        Validate that the username is unique case-insensitively.
        This prevents users from creating accounts with usernames that differ only by case.
        """
        if value:
            # Check for case-insensitive username conflicts
            User = get_user_model()
            existing_user = User.objects.filter(username__iexact=value).first()
            
            # If updating, exclude the current instance
            if self.instance:
                if existing_user and existing_user.id != self.instance.id:
                    raise serializers.ValidationError(
                        "A user with this username already exists."
                    )
            else:
                # Creating new user
                if existing_user:
                    raise serializers.ValidationError(
                        "A user with this username already exists."
                    )
        
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password', 'updated_at'])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password', 'updated_at'])
        return user


class AccessScopeSerializer(serializers.ModelSerializer):
    # Read-only helper fields for better API responses
    org_name = serializers.CharField(source='org_node.name', read_only=True, allow_null=True)
    org_code = serializers.CharField(source='org_node.code', read_only=True, allow_null=True)
    team_name = serializers.CharField(source='team.name', read_only=True, allow_null=True)
    role_code = serializers.CharField(source='role.code', read_only=True)
    role_title = serializers.CharField(source='role.title', read_only=True)

    class Meta:
        model = AccessScope
        fields = [
            'id',
            'user',
            'org_node',
            'org_name',
            'org_code',
            'team',
            'team_name',
            'role',
            'role_code',
            'role_title',
            'position_title',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserMeSerializer(serializers.ModelSerializer):
    access_scopes = AccessScopeSerializer(many=True, read_only=True)
    is_admin = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    accessible_companies = serializers.SerializerMethodField()
    company_roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'mobile_phone', 'national_code', 'access_scopes', 'is_admin', 'roles', 'accessible_companies', 'company_roles')

    def get_is_admin(self, obj):
        return bool(obj.is_superuser or obj.is_staff)

    def get_roles(self, obj):
        """
        Return a de-duplicated list of role *codes* for the current user.

        The frontend relies on stable, uppercase codes such as
        'REQUESTER', 'APPROVER', 'ADMIN' for role-based navigation
        and redirects, so we expose `role.code` here instead of the
        (possibly localised) `role.title`.
        """
        try:
            return list(
                set(
                    [
                        scope.role.code
                        for scope in obj.access_scopes.filter(is_active=True).select_related("role")
                        if scope.role and scope.role.code
                    ]
                )
            )
        except Exception:
            return []

    def get_accessible_companies(self, obj):
        try:
            from org.models import OrgNode
            from org.serializers import OrgNodeSerializer
            
            access_scopes = obj.access_scopes.filter(
                is_active=True,
                org_node__is_active=True,
                org_node__node_type=OrgNode.COMPANY
            ).select_related('org_node')
            
            company_ids = set()
            companies = []
            for scope in access_scopes:
                if scope.org_node and scope.org_node.id not in company_ids:
                    company_ids.add(scope.org_node.id)
                    companies.append(scope.org_node)
            
            return OrgNodeSerializer(companies, many=True).data
        except Exception:
            return []

    def get_company_roles(self, obj):
        """Return a map of company_id -> list of roles for that company"""
        try:
            from org.models import OrgNode
            
            company_roles = {}
            access_scopes = obj.access_scopes.filter(
                is_active=True,
                org_node__is_active=True,
                org_node__node_type=OrgNode.COMPANY
            ).select_related('org_node', 'role')
            
            for scope in access_scopes:
                if scope.org_node and scope.role:
                    company_id = str(scope.org_node.id)
                    if company_id not in company_roles:
                        company_roles[company_id] = []
                    company_roles[company_id].append({
                        'id': str(scope.role.id),
                        'title': scope.role.title,
                        'code': scope.role.code,
                        'position_title': scope.position_title,
                    })
            
            return company_roles
        except Exception:
            return {}


class UserWithTeamsSerializer(serializers.ModelSerializer):
    """Serializer for reading users with their team assignments"""
    teams = serializers.SerializerMethodField()
    access_scopes = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'mobile_phone',
            'national_code',
            'is_active',
            'is_staff',
            'is_superuser',
            'teams',
            'access_scopes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_teams(self, obj):
        """Get list of teams the user belongs to"""
        try:
            from teams.serializers import TeamSerializer
            team_ids = AccessScope.objects.filter(
                user=obj,
                team__isnull=False,
                is_active=True
            ).values_list('team_id', flat=True).distinct()
            from teams.models import Team
            teams = Team.objects.filter(id__in=team_ids, is_active=True)
            return TeamSerializer(teams, many=True).data
        except Exception:
            return []
    
    def get_access_scopes(self, obj):
        """Get active access scopes for the user"""
        try:
            active_scopes = obj.access_scopes.filter(is_active=True).select_related('team', 'org_node', 'role')
            return AccessScopeSerializer(active_scopes, many=True).data
        except Exception:
            return []


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("رمز عبور فعلی اشتباه است.")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "رمز عبور جدید و تکرار آن مطابقت ندارند."
            })
        return attrs

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value


