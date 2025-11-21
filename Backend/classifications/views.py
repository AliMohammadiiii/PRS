from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from classifications.models import LookupType, Lookup
from classifications.serializers import LookupTypeSerializer, LookupSerializer
from core.views import SoftDeleteModelViewSet
from accounts.permissions import ReadOnlyOrAdmin


class LookupTypeViewSet(SoftDeleteModelViewSet):
    queryset = LookupType.objects.all()
    serializer_class = LookupTypeSerializer
    permission_classes = [IsAdminUser]


class LookupViewSet(SoftDeleteModelViewSet):
    queryset = Lookup.objects.all()
    serializer_class = LookupSerializer
    permission_classes = [ReadOnlyOrAdmin]
