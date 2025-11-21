from rest_framework import serializers
from accounts.models import User, AccessScope


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
    org_name = serializers.CharField(source='org_node.name', read_only=True)
    org_code = serializers.CharField(source='org_node.code', read_only=True)
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
        try:
            return list(set([scope.role.title for scope in obj.access_scopes.filter(is_active=True).select_related('role')]))
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


