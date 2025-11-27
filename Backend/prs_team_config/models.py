from django.db import models
from django.core.exceptions import ValidationError
from core.models import BaseModel


class TeamPurchaseConfig(BaseModel):
    """
    Configuration mapping for team + purchase type to form template + workflow template.
    
    Each team can have multiple configurations, one for each purchase type (GOODS, SERVICE, etc.).
    For a given (team, purchase_type) there must be at most one active TeamPurchaseConfig.
    
    This model determines which FormTemplate and WorkflowTemplate are used when a
    user creates a new purchase request for a specific team and purchase type combination.
    
    Templates are team-agnostic and can be shared across multiple teams.
    """
    team = models.ForeignKey(
        'teams.Team',
        on_delete=models.CASCADE,
        related_name='purchase_configs',
        help_text='Team this configuration applies to'
    )
    purchase_type = models.ForeignKey(
        'classifications.Lookup',
        on_delete=models.PROTECT,
        related_name='team_purchase_configs',
        limit_choices_to={'type__code': 'PURCHASE_TYPE'},
        help_text='Purchase type (e.g., GOODS, SERVICE) from PURCHASE_TYPE lookups'
    )
    form_template = models.ForeignKey(
        'prs_forms.FormTemplate',
        on_delete=models.PROTECT,
        related_name='team_purchase_configs',
        help_text='Form template to use for this team + purchase type combination'
    )
    workflow_template = models.ForeignKey(
        'workflows.WorkflowTemplate',
        on_delete=models.PROTECT,
        related_name='team_purchase_configs',
        help_text='Workflow template to use for this team + purchase type combination'
    )

    class Meta:
        indexes = [
            models.Index(fields=['team', 'purchase_type', 'is_active']),
            models.Index(fields=['team', 'is_active']),
        ]
        ordering = ['team', 'purchase_type']
        verbose_name = 'Team Purchase Configuration'
        verbose_name_plural = 'Team Purchase Configurations'

    def clean(self):
        """
        Validate the configuration:
        1. Team must be active
        2. Purchase type must be active and of correct type
        3. Form template must be active (templates are team-agnostic, can be shared)
        4. Workflow template must be active (templates are team-agnostic, can be shared)
        5. Only one active config per (team, purchase_type)
        """
        # Team must be active
        if self.team and not self.team.is_active:
            raise ValidationError({'team': 'Team must be active.'})
        
        # Purchase type must be active and of correct type
        if self.purchase_type:
            if not self.purchase_type.is_active:
                raise ValidationError({'purchase_type': 'Purchase type must be active.'})
            if getattr(getattr(self.purchase_type, 'type', None), 'code', None) != 'PURCHASE_TYPE':
                raise ValidationError({'purchase_type': 'Must be a PURCHASE_TYPE lookup.'})
        
        # Form template must be active (templates are team-agnostic)
        if self.form_template:
            if not self.form_template.is_active:
                raise ValidationError({'form_template': 'Form template must be active.'})
        
        # Workflow template must be active (templates are team-agnostic)
        if self.workflow_template:
            if not self.workflow_template.is_active:
                raise ValidationError({'workflow_template': 'Workflow template must be active.'})
        
        # Enforce at most one active config per (team, purchase_type)
        if self.is_active:
            existing_active = TeamPurchaseConfig.objects.filter(
                team=self.team,
                purchase_type=self.purchase_type,
                is_active=True
            ).exclude(pk=self.pk if self.pk else None)
            
            if existing_active.exists():
                raise ValidationError(
                    'Only one active configuration is allowed per team + purchase type combination. '
                    'Please deactivate the existing configuration first.'
                )

    def save(self, *args, **kwargs):
        # Ensure clean() is called to validate constraints
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        purchase_type_code = self.purchase_type.code if self.purchase_type else 'Unknown'
        return f'{self.team.name} - {purchase_type_code}'

    @classmethod
    def get_active_config(cls, team, purchase_type):
        """
        Get the active configuration for a team and purchase type.
        
        Args:
            team: Team instance or team ID
            purchase_type: Lookup instance or purchase type code string
        
        Returns:
            TeamPurchaseConfig instance or None if not found
        
        Raises:
            TeamPurchaseConfig.DoesNotExist if no active config found
        """
        from classifications.models import Lookup
        
        # Handle string purchase_type code
        if isinstance(purchase_type, str):
            purchase_type = Lookup.objects.get(
                type__code='PURCHASE_TYPE',
                code=purchase_type,
                is_active=True
            )
        
        return cls.objects.get(
            team=team,
            purchase_type=purchase_type,
            is_active=True
        )
