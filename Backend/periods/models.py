from django.db import models
from core.models import BaseModel


class FinancialPeriod(BaseModel):
    title = models.CharField(max_length=64)
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        ordering = ['-start_date']

    def __str__(self) -> str:
        return self.title

from django.db import models

# Create your models here.
