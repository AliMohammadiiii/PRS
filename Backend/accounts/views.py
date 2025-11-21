import logging
from rest_framework import viewsets, status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from accounts.models import User, AccessScope
from accounts.serializers import UserSerializer, AccessScopeSerializer, ChangePasswordSerializer
from core.views import SoftDeleteModelViewSet

logger = logging.getLogger(__name__)


class UserViewSet(SoftDeleteModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class AccessScopeViewSet(SoftDeleteModelViewSet):
    queryset = AccessScope.objects.all()
    serializer_class = AccessScopeSerializer
    permission_classes = [IsAdminUser]


@extend_schema(
    summary="Change user password",
    description="Change the password for the currently authenticated user. Rate limited to 5 requests per 15 minutes.",
    request=ChangePasswordSerializer,
    responses={
        200: {
            'type': 'object',
            'properties': {
                'detail': {'type': 'string', 'example': 'رمز عبور با موفقیت تغییر یافت.'}
            }
        },
        400: {
            'type': 'object',
            'properties': {
                'detail': {'type': 'string'},
                'old_password': {'type': 'array', 'items': {'type': 'string'}},
                'new_password': {'type': 'array', 'items': {'type': 'string'}},
                'confirm_password': {'type': 'array', 'items': {'type': 'string'}},
            }
        },
        500: {
            'type': 'object',
            'properties': {
                'detail': {'type': 'string'}
            }
        }
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='5/15m', method='POST', block=True)
def change_password_view(request):
    """
    Change user password with proper error handling.
    """
    try:
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password', 'updated_at'])
            return Response(
                {'detail': 'رمز عبور با موفقیت تغییر یافت.'},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Log the error but don't expose details to client
        logger.exception("Error changing password")
        return Response(
            {'detail': 'An error occurred while changing password. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
