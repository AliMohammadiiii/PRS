from django.contrib import admin
from accounts.models import User, AccessScope


class AccessScopeInline(admin.TabularInline):
    model = AccessScope
    extra = 0


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'mobile_phone')
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [AccessScopeInline]


@admin.register(AccessScope)
class AccessScopeAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'org_node', 'role', 'position_title', 'is_active')
    list_filter = ('role', 'is_active', 'team')
    search_fields = ('user__username', 'team__name', 'org_node__name', 'position_title')
    readonly_fields = ('created_at', 'updated_at')

from django.contrib import admin

# Register your models here.
