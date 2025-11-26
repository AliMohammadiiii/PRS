from django.contrib import admin
from teams.models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fields = ('id', 'name', 'description', 'is_active', 'created_at', 'updated_at')


