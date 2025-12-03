from django.contrib import admin
from accounts.models import User, AccessScope


class AccessScopeInline(admin.TabularInline):
    model = AccessScope
    extra = 0


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'mobile_phone')
    list_filter = ('is_active', 'is_staff', 'is_superuser')
    readonly_fields = ('created_at', 'updated_at', 'last_login', 'date_joined')
    inlines = [AccessScopeInline]
    fieldsets = (
        (None, {
            'fields': ('username', 'password')
        }),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'email', 'national_code', 'mobile_phone')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(AccessScope)
class AccessScopeAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'org_node', 'role', 'position_title', 'is_active')
    list_filter = ('role', 'is_active', 'team')
    search_fields = ('user__username', 'team__name', 'org_node__name', 'position_title')
    readonly_fields = ('created_at', 'updated_at')
