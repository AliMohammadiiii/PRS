import uuid
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
    org_node = models.ForeignKey('org.OrgNode', on_delete=models.CASCADE, related_name='user_access_scopes', null=True, blank=True)
    role = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='access_scopes')
    position_title = models.CharField(max_length=128, null=True, blank=True)

    class Meta:
        unique_together = ('user', 'org_node', 'role')

    def __str__(self) -> str:
        return f'{self.user} - {self.role}'

from django.db import models

# Create your models here.
