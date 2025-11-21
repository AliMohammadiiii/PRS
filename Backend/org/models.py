from django.core.exceptions import ValidationError
from django.db import models
from core.models import BaseModel


class OrgNode(BaseModel):
    HOLDING = 'HOLDING'
    COMPANY = 'COMPANY'
    NODE_TYPE_CHOICES = [
        (HOLDING, 'Holding'),
        (COMPANY, 'Company'),
    ]

    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    node_type = models.CharField(max_length=16, choices=NODE_TYPE_CHOICES)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64, unique=True)

    # Company profile fields
    registration_number = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    national_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    economic_code = models.CharField(max_length=64, unique=True, null=True, blank=True)
    incorporation_date = models.DateField(null=True, blank=True)
    website_url = models.URLField(null=True, blank=True)

    # Lookups
    org_type = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, null=True, blank=True, related_name='org_type_nodes', limit_choices_to={'type__code': 'ORG_TYPE'})
    legal_entity_type = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, null=True, blank=True, related_name='legal_entity_nodes', limit_choices_to={'type__code': 'LEGAL_ENTITY_TYPE'})
    industry = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, null=True, blank=True, related_name='industry_nodes', limit_choices_to={'type__code': 'INDUSTRY_TYPE'})
    sub_industry = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, null=True, blank=True, related_name='sub_industry_nodes', limit_choices_to={'type__code': 'SUB_INDUSTRY_TYPE'})
    # Group linkage for UI grouping of reports
    report_groups = models.ManyToManyField('reports.ReportGroup', related_name='companies', blank=True)

    def clean(self):
        if self.node_type == self.COMPANY:
            if self.parent is None:
                raise ValidationError('Company must have a holding parent.')
            if self.parent and self.parent.node_type != self.HOLDING:
                raise ValidationError('Company parent must be a holding node.')
            if not self.economic_code:
                raise ValidationError('Company economic_code is required.')
        if self.parent and self.parent_id == self.id:
            raise ValidationError('Parent cannot be self.')
        # Lookup type guards
        if self.org_type and getattr(getattr(self.org_type, 'type', None), 'code', None) != 'ORG_TYPE':
            raise ValidationError('org_type must reference ORG_TYPE lookups.')
        if self.legal_entity_type and getattr(getattr(self.legal_entity_type, 'type', None), 'code', None) != 'LEGAL_ENTITY_TYPE':
            raise ValidationError('legal_entity_type must reference LEGAL_ENTITY_TYPE lookups.')
        if self.industry and getattr(getattr(self.industry, 'type', None), 'code', None) != 'INDUSTRY_TYPE':
            raise ValidationError('industry must reference INDUSTRY_TYPE lookups.')
        if self.sub_industry and getattr(getattr(self.sub_industry, 'type', None), 'code', None) != 'SUB_INDUSTRY_TYPE':
            raise ValidationError('sub_industry must reference SUB_INDUSTRY_TYPE lookups.')

    class Meta:
        indexes = [
            models.Index(fields=['node_type', 'is_active']),
        ]

    def __str__(self) -> str:
        return f'{self.name} ({self.node_type})'


class CompanyClassification(BaseModel):
    company = models.ForeignKey('org.OrgNode', on_delete=models.CASCADE, related_name='company_classifications')
    classification = models.ForeignKey('classifications.Lookup', on_delete=models.CASCADE, related_name='company_members')

    class Meta:
        unique_together = ('company', 'classification')

    def __str__(self) -> str:
        return f'{self.company} -> {self.classification}'
