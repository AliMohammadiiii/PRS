from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.pagination import PageNumberPagination
from classifications.models import LookupType, Lookup
from classifications.serializers import LookupTypeSerializer, LookupSerializer
from core.views import SoftDeleteModelViewSet
from accounts.permissions import ReadOnlyOrAdmin


class NoPagination(PageNumberPagination):
    """Disable pagination for lookups"""
    page_size = None


class LookupTypeViewSet(SoftDeleteModelViewSet):
    queryset = LookupType.objects.all()
    serializer_class = LookupTypeSerializer
    permission_classes = [IsAdminUser]


class LookupViewSet(SoftDeleteModelViewSet):
    queryset = Lookup.objects.all()
    serializer_class = LookupSerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = NoPagination  # Disable pagination for lookups
