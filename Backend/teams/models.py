from django.db import models
from core.models import BaseModel


class Team(BaseModel):
    """
    Team definition for Purchase Request System.
    
    Each team has its own form template and workflow (one-to-one relationships).
    Teams cannot be deleted, only deactivated (soft-delete via is_active).
    Examples: Marketing, Tech, Product, Finance.
    """
    name = models.CharField(max_length=128, unique=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'name']),
        ]
        ordering = ['name']

    def __str__(self) -> str:
        return self.name

