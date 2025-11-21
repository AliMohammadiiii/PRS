from django.contrib import admin
from classifications.models import LookupType, Lookup


@admin.register(LookupType)
class LookupTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'is_active')
    search_fields = ('code', 'title')
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Lookup)
class LookupAdmin(admin.ModelAdmin):
    list_display = ('type', 'code', 'title', 'is_active')
    search_fields = ('code', 'title', 'type__code')
    list_filter = ('type', 'is_active')
    readonly_fields = ('created_at', 'updated_at')

from django.contrib import admin

# Register your models here.
