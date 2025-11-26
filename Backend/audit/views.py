from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from audit.models import AuditEvent, FieldChange
from audit.serializers import AuditEventSerializer, FieldChangeSerializer


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit events (read-only).
    Provides audit trail for all submission and purchase request activities.
    """
    queryset = AuditEvent.objects.all().select_related('actor', 'submission', 'request').prefetch_related(
        'field_changes__field',
        'field_changes__form_field'
    )
    serializer_class = AuditEventSerializer
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary="Get audit events for a specific submission",
        description="Returns all audit events (submissions, status changes, field updates) for a given submission.",
        parameters=[
            OpenApiParameter(
                name='submission_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the submission to get audit events for',
            ),
        ],
        responses={
            200: AuditEventSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'])
    def by_submission(self, request):
        """Get all audit events for a specific submission"""
        submission_id = request.query_params.get('submission_id')
        if not submission_id:
            return Response({'detail': 'submission_id query parameter is required'}, status=400)
        
        events = self.queryset.filter(submission_id=submission_id).order_by('created_at')
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Get audit events by event type",
        description="Returns audit events filtered by event type (SUBMIT, STATUS_CHANGE, FIELD_UPDATE).",
        parameters=[
            OpenApiParameter(
                name='event_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Event type: SUBMIT, STATUS_CHANGE, or FIELD_UPDATE',
                enum=['SUBMIT', 'STATUS_CHANGE', 'FIELD_UPDATE'],
            ),
        ],
        responses={
            200: AuditEventSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get audit events filtered by event type"""
        event_type = request.query_params.get('event_type')
        if not event_type:
            return Response({'detail': 'event_type query parameter is required'}, status=400)
        
        if event_type not in [AuditEvent.SUBMIT, AuditEvent.STATUS_CHANGE, AuditEvent.FIELD_UPDATE]:
            return Response({'detail': f'Invalid event_type. Must be one of: SUBMIT, STATUS_CHANGE, FIELD_UPDATE'}, status=400)
        
        events = self.queryset.filter(event_type=event_type).order_by('-created_at')
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get audit trail for a purchase request",
        description="Returns complete audit trail for a purchase request including all events and field changes.",
        parameters=[
            OpenApiParameter(
                name='request_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the purchase request to get audit trail for',
            ),
        ],
        responses={
            200: AuditEventSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'], url_path='by-request')
    def by_request(self, request):
        """Get all audit events for a specific purchase request"""
        request_id = request.query_params.get('request_id')
        if not request_id:
            return Response({'detail': 'request_id query parameter is required'}, status=400)
        
        events = self.queryset.filter(request_id=request_id).order_by('created_at')
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)


class FieldChangeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing field changes (read-only).
    Provides detailed field-level audit trail.
    """
    queryset = FieldChange.objects.all().select_related('audit_event', 'field')
    serializer_class = FieldChangeSerializer
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary="Get field changes for a specific audit event",
        description="Returns all field changes associated with a specific audit event.",
        parameters=[
            OpenApiParameter(
                name='audit_event_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the audit event to get field changes for',
            ),
        ],
        responses={
            200: FieldChangeSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'])
    def by_event(self, request):
        """Get all field changes for a specific audit event"""
        audit_event_id = request.query_params.get('audit_event_id')
        if not audit_event_id:
            return Response({'detail': 'audit_event_id query parameter is required'}, status=400)
        
        changes = self.queryset.filter(audit_event_id=audit_event_id).order_by('created_at')
        serializer = self.get_serializer(changes, many=True)
        return Response(serializer.data)

