from django.contrib import admin
from periods.models import FinancialPeriod


@admin.register(FinancialPeriod)
class FinancialPeriodAdmin(admin.ModelAdmin):
    list_display = ('title', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title',)

from django.contrib import admin

# Register your models here.
