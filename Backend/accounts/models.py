from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import BaseModel


class User(BaseModel, AbstractUser):
    # UUID primary key inherited from BaseModel
    national_code = models.CharField(max_length=32, null=True, blank=True)
    mobile_phone = models.CharField(max_length=32, null=True, blank=True, db_index=True)

    def __str__(self) -> str:
        return self.username


class AccessScope(BaseModel):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='access_scopes')
    org_node = models.ForeignKey(
        'org.OrgNode',
        on_delete=models.CASCADE,
        related_name='user_access_scopes',
        null=True,
        blank=True,
    )
    team = models.ForeignKey(
        'teams.Team',
        on_delete=models.CASCADE,
        related_name='user_access_scopes',
        null=True,
        blank=True,
    )
    role = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='access_scopes')
    position_title = models.CharField(max_length=128, null=True, blank=True)

    class Meta:
        unique_together = [
            ('user', 'org_node', 'role'),
            ('user', 'team', 'role'),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        # At least one of org_node or team must be set
        if not self.org_node and not self.team:
            raise ValidationError('Either org_node or team must be set.')
        # Both cannot be set
        if self.org_node and self.team:
            raise ValidationError('Cannot set both org_node and team.')
        # If team is set, it must be active
        if self.team and not self.team.is_active:
            raise ValidationError('Team must be active.')

    def __str__(self) -> str:
        scope = self.team if self.team else self.org_node
        return f'{self.user} - {scope} - {self.role}'
