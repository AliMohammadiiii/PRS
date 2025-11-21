from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.core.exceptions import ObjectDoesNotExist
from reports.models import ReportGroup, ReportBox, ReportField
from reports.serializers import ReportGroupSerializer, ReportBoxSerializer, ReportFieldSerializer
from reports.services import get_reports_for_company
from core.views import SoftDeleteModelViewSet
from accounts.permissions import ReadOnlyOrAdmin
from org.models import OrgNode
from submissions.models import Submission


class ReportGroupViewSet(SoftDeleteModelViewSet):
    queryset = ReportGroup.objects.all()
    serializer_class = ReportGroupSerializer
    permission_classes = [ReadOnlyOrAdmin]


class ReportBoxViewSet(SoftDeleteModelViewSet):
    queryset = ReportBox.objects.all()
    serializer_class = ReportBoxSerializer
    permission_classes = [ReadOnlyOrAdmin]

    @extend_schema(
        summary="Get report boxes grouped by classification",
        description="Returns report boxes for a company, grouped by their classifications. Includes indicator if submission exists.",
        parameters=[
            OpenApiParameter(
                name='company_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the company (OrgNode with node_type=COMPANY)',
            ),
            OpenApiParameter(
                name='financial_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description='UUID of the FinancialPeriod. If provided, checks for existing submissions.',
            ),
            OpenApiParameter(
                name='reporting_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description='UUID of the Reporting Period. If provided along with financial_period_id, checks for existing submissions.',
            ),
        ],
        responses={
            200: {
                'description': 'List of classifications with their report boxes',
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'classification': {'type': 'object'},
                        'report_boxes': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'report_box': {'type': 'object'},
                                    'has_submission': {'type': 'boolean'},
                                    'submission_status': {'type': 'string', 'nullable': True},
                                },
                            },
                        },
                    },
                },
            },
            404: {'description': 'Company not found'},
        },
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def by_classification(self, request):
        company_id = request.query_params.get('company_id')
        financial_period_id = request.query_params.get('financial_period_id')
        reporting_period_id = request.query_params.get('reporting_period_id')
        
        if not company_id:
            return Response(
                {'detail': 'company_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = OrgNode.objects.get(id=company_id, node_type=OrgNode.COMPANY)
        except ObjectDoesNotExist:
            return Response(
                {'detail': f'Company with id {company_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all report boxes for this company (already prefetched)
        report_boxes = list(get_reports_for_company(company))
        
        # Group by classification
        classification_map = {}
        unclassified_boxes = []
        
        for report_box in report_boxes:
            # Use prefetched classifications to avoid N+1 queries
            classifications = report_box.classifications.all()
            if classifications.exists():
                for classification in classifications:
                    if classification.id not in classification_map:
                        classification_map[classification.id] = {
                            'classification': {
                                'id': str(classification.id),
                                'code': classification.code,
                                'title': classification.title,
                                'description': classification.description,
                            },
                            'report_boxes': [],
                        }
                    
                    # Check if submission exists (optimize with select_related)
                    has_submission = False
                    submission_status = None
                    if financial_period_id and reporting_period_id:
                        submission = Submission.objects.filter(
                            report=report_box,
                            company=company,
                            financial_period_id=financial_period_id,
                            reporting_period_id=reporting_period_id,
                        ).select_related('status').first()
                        if submission:
                            has_submission = True
                            submission_status = submission.status.code if submission.status else None
                    
                    classification_map[classification.id]['report_boxes'].append({
                        'report_box': ReportBoxSerializer(report_box).data,
                        'has_submission': has_submission,
                        'submission_status': submission_status,
                    })
            else:
                unclassified_boxes.append(report_box)
        
        # Build response
        result = list(classification_map.values())
        
        # Add unclassified boxes to a special "Other" classification if any
        if unclassified_boxes:
            other_boxes = []
            for report_box in unclassified_boxes:
                has_submission = False
                submission_status = None
                if financial_period_id and reporting_period_id:
                    submission = Submission.objects.filter(
                        report=report_box,
                        company=company,
                        financial_period_id=financial_period_id,
                        reporting_period_id=reporting_period_id,
                    ).select_related('status').first()
                    if submission:
                        has_submission = True
                        submission_status = submission.status.code if submission.status else None
                
                other_boxes.append({
                    'report_box': ReportBoxSerializer(report_box).data,
                    'has_submission': has_submission,
                    'submission_status': submission_status,
                })
            
            result.append({
                'classification': {
                    'id': 'other',
                    'code': 'OTHER',
                    'title': 'سایر',
                    'description': None,
                },
                'report_boxes': other_boxes,
            })
        
        return Response(result)


class ReportFieldViewSet(SoftDeleteModelViewSet):
    queryset = ReportField.objects.all()
    serializer_class = ReportFieldSerializer
    permission_classes = [ReadOnlyOrAdmin]
