from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from periods.models import FinancialPeriod
from periods.serializers import FinancialPeriodSerializer
from core.views import SoftDeleteModelViewSet
from accounts.permissions import ReadOnlyOrAdmin


class FinancialPeriodViewSet(SoftDeleteModelViewSet):
    queryset = FinancialPeriod.objects.all()
    serializer_class = FinancialPeriodSerializer
    permission_classes = [ReadOnlyOrAdmin]
