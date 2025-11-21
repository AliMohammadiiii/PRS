from django.db import models
from core.models import BaseModel


class LookupType(BaseModel):
    code = models.CharField(max_length=64, unique=True)
    title = models.CharField(max_length=128)
    description = models.TextField(null=True, blank=True)

    def __str__(self) -> str:
        return self.title


class Lookup(BaseModel):
    type = models.ForeignKey('classifications.LookupType', on_delete=models.CASCADE, related_name='values')
    code = models.CharField(max_length=64)
    title = models.CharField(max_length=128)
    description = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = ('type', 'code')
        indexes = [
            models.Index(fields=['type', 'code']),
        ]

    def __str__(self) -> str:
        return f'{self.type.code}:{self.title}'

from django.db import models

# Create your models here.
