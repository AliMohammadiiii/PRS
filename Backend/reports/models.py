from django.db import models
from core.models import BaseModel


class ReportGroup(BaseModel):
    name = models.CharField(max_length=128)
    description = models.TextField(null=True, blank=True)

    def __str__(self) -> str:
        return self.name


class ReportBox(BaseModel):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    description = models.TextField(null=True, blank=True)
    intercompany = models.BooleanField(default=False)
    groups = models.ManyToManyField(ReportGroup, related_name='reports', blank=True)
    classifications = models.ManyToManyField('classifications.Lookup', related_name='reports', blank=True, limit_choices_to={'type__code': 'COMPANY_CLASSIFICATION'})

    def __str__(self) -> str:
        return f'{self.code} - {self.name}'


class ReportField(BaseModel):
    NUMBER = 'NUMBER'
    TEXT = 'TEXT'
    YES_NO = 'YES_NO'
    DATE = 'DATE'
    FILE = 'FILE'
    ENTITY_REF = 'ENTITY_REF'
    DATA_TYPE_CHOICES = [
        (NUMBER, 'Number'),
        (TEXT, 'Text'),
        (YES_NO, 'Yes/No'),
        (DATE, 'Date'),
        (FILE, 'File'),
        (ENTITY_REF, 'Entity Reference'),
    ]

    ORG_NODE = 'ORG_NODE'
    FINANCIAL_PERIOD = 'FINANCIAL_PERIOD'
    ENTITY_REF_CHOICES = [
        (ORG_NODE, 'Organization Node'),
        (FINANCIAL_PERIOD, 'Financial Period'),
    ]

    report = models.ForeignKey(ReportBox, on_delete=models.CASCADE, related_name='fields')
    field_id = models.CharField(max_length=64)
    name = models.CharField(max_length=128)
    help_text = models.TextField(null=True, blank=True)
    required = models.BooleanField(default=False)
    data_type = models.CharField(max_length=16, choices=DATA_TYPE_CHOICES)
    entity_ref_type = models.CharField(max_length=32, choices=ENTITY_REF_CHOICES, null=True, blank=True)

    class Meta:
        unique_together = ('report', 'field_id')
        indexes = [
            models.Index(fields=['report', 'field_id']),
        ]
        constraints = [
            # If not ENTITY_REF then entity_ref_type must be null
            models.CheckConstraint(
                name='entity_ref_type_null_when_not_ref',
                check=(models.Q(data_type='ENTITY_REF') | models.Q(entity_ref_type__isnull=True)),
            ),
            # If ENTITY_REF then entity_ref_type required
            models.CheckConstraint(
                name='entity_ref_type_set_when_ref',
                check=(~models.Q(data_type='ENTITY_REF') | models.Q(entity_ref_type__isnull=False)),
            ),
        ]

    def __str__(self) -> str:
        return f'{self.report.code}:{self.field_id}'

from django.db import models

# Create your models here.
