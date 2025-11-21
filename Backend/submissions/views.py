from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.core.exceptions import ObjectDoesNotExist
from submissions.models import Submission, ReportSubmissionGroup
from submissions.serializers import SubmissionWriteSerializer, SubmissionReadSerializer, ReportSubmissionGroupSerializer
from django.db import transaction
from django.utils import timezone
from accounts.permissions import HasCompanyAccess
from accounts.models import AccessScope
from reports.services import get_reports_for_company
from org.models import OrgNode
from periods.models import FinancialPeriod
from classifications.models import Lookup
from reports.serializers import ReportBoxSerializer


class UserWorkflowViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SubmissionWriteSerializer
    queryset = Submission.objects.all()

    def get_queryset(self):
        """
        Filter queryset to only show submissions for companies the user has access to.
        """
        queryset = super().get_queryset().select_related(
            'company',
            'financial_period',
            'reporting_period',
            'reporting_period__type',  # Needed for LookupSerializer
            'status',
            'status__type',  # Needed for LookupSerializer
            'report',
            'group',
            'group__company',
            'group__financial_period',
            'group__reporting_period',
            'group__reporting_period__type',  # Needed for LookupSerializer in group
            'group__status',
            'group__status__type',  # Needed for LookupSerializer in group
        ).prefetch_related(
            'values',
            'values__field',
        )
        user = self.request.user
        
        if user.is_superuser or user.is_staff:
            return queryset
        
        # Get companies the user has access to
        accessible_company_ids = list(AccessScope.objects.filter(
            user=user,
            is_active=True,
            org_node__node_type=OrgNode.COMPANY
        ).values_list('org_node_id', flat=True))
        
        if not accessible_company_ids:
            return queryset.none()
        
        return queryset.filter(company_id__in=accessible_company_ids)

    def check_object_permissions(self, request, obj):
        """
        Check permissions on the submission's company instead of the submission object.
        """
        # Check permissions on the company, not the submission
        company = obj.company
        
        # Allow superusers and staff
        if request.user.is_superuser or request.user.is_staff:
            return
        
        # Check if user has access to this company
        has_access = AccessScope.objects.filter(
            user=request.user,
            org_node=company,
            is_active=True
        ).exists()
        
        if not has_access:
            self.permission_denied(
                request, message='You do not have permission to perform this action.'
            )

    @extend_schema(
        summary="Get dashboard of required reports with optional filters",
        description="Returns a list of all reports that companies must complete, with optional filtering by company, financial period, and/or reporting period. Shows current submission status when periods are provided.",
        parameters=[
            OpenApiParameter(
                name='company_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description='UUID of the company (OrgNode with node_type=COMPANY). If not provided, returns reports for all companies the user has access to.',
            ),
            OpenApiParameter(
                name='period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description='UUID of the FinancialPeriod. If provided along with reporting_period_id, shows submission status for that specific period.',
            ),
            OpenApiParameter(
                name='reporting_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description='UUID of the Reporting Period (Lookup with type=REPORTING_PERIOD). If provided along with period_id, shows submission status for that specific reporting period.',
            ),
        ],
        responses={
            200: {
                'description': 'List of reports with their status',
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'report': {'type': 'object'},
                        'company': {'type': 'object', 'nullable': True},
                        'status': {'type': 'string', 'enum': ['NOT_STARTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'], 'nullable': True},
                        'submission_id': {'type': 'string', 'format': 'uuid', 'nullable': True},
                        'financial_period_id': {'type': 'string', 'format': 'uuid', 'nullable': True},
                        'reporting_period_id': {'type': 'string', 'format': 'uuid', 'nullable': True},
                    },
                },
            },
            400: {'description': 'Invalid query parameters'},
            404: {'description': 'Resource not found'},
        },
    )
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        company_id = request.query_params.get('company_id')
        period_id = request.query_params.get('period_id')
        reporting_period_id = request.query_params.get('reporting_period_id')
        
        # Get companies the user has access to
        user = request.user
        if user.is_superuser or user.is_staff:
            # Admins can see all companies
            accessible_companies = OrgNode.objects.filter(node_type=OrgNode.COMPANY)
        else:
            # Regular users can only see companies they have access to
            accessible_company_ids = AccessScope.objects.filter(
                user=user,
                is_active=True,
                org_node__node_type=OrgNode.COMPANY
            ).values_list('org_node_id', flat=True)
            accessible_companies = OrgNode.objects.filter(id__in=accessible_company_ids)
        
        # If company_id is provided, filter to that company (after permission check)
        companies = accessible_companies
        if company_id:
            try:
                company = accessible_companies.get(id=company_id)
                companies = OrgNode.objects.filter(id=company_id)
            except ObjectDoesNotExist:
                return Response({
                    'detail': f'Company with id {company_id} not found or you do not have access to it'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Get period objects if provided
        period = None
        if period_id:
            try:
                period = FinancialPeriod.objects.get(id=period_id)
            except ObjectDoesNotExist:
                return Response({
                    'detail': f'FinancialPeriod with id {period_id} not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        reporting_period = None
        if reporting_period_id:
            try:
                reporting_period = Lookup.objects.get(id=reporting_period_id)
                # Validate that the reporting_period is of the correct type
                if reporting_period.type.code != 'REPORTING_PERIOD':
                    return Response({
                        'detail': f'Lookup with id {reporting_period_id} is not a REPORTING_PERIOD (found type: {reporting_period.type.code})'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ObjectDoesNotExist:
                return Response({
                    'detail': f'ReportingPeriod (Lookup) with id {reporting_period_id} not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate: if one period is provided, the other should be too for meaningful status
        if (period_id and not reporting_period_id) or (reporting_period_id and not period_id):
            return Response({
                'detail': 'Both period_id and reporting_period_id must be provided together to show submission status. Omit both to see all reports without status.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Collect all unique reports for all accessible companies
        all_reports = set()
        company_reports_map = {}
        for company in companies:
            reports = list(get_reports_for_company(company))
            all_reports.update(reports)
            company_reports_map[company.id] = reports
        
        # Build response payload
        payload = []
        for report in all_reports:
            # Determine which companies have this report
            report_companies = [c for c, reports in company_reports_map.items() if report in reports]
            
            if period and reporting_period:
                # Show status for specific period combination
                for company_obj in companies.filter(id__in=report_companies):
                    sub = Submission.objects.filter(
                        report=report,
                        company=company_obj,
                        financial_period=period,
                        reporting_period=reporting_period,
                    ).order_by('-created_at').first()
                    
                    status_lookup = getattr(sub, 'status', None)
                    payload.append({
                        'report': ReportBoxSerializer(report).data,
                        'company': {
                            'id': str(company_obj.id),
                            'name': company_obj.name,
                            'code': company_obj.code,
                        },
                        'status': status_lookup.code if status_lookup else 'NOT_STARTED',
                        'submission_id': str(sub.id) if sub else None,
                        'financial_period_id': str(period.id),
                        'reporting_period_id': str(reporting_period.id),
                    })
            else:
                # Show report without status (all reports user needs to fill)
                # If single company filtered, show once. Otherwise show once per company.
                if company_id and len(report_companies) > 0:
                    company_obj = companies.first()
                    payload.append({
                        'report': ReportBoxSerializer(report).data,
                        'company': {
                            'id': str(company_obj.id),
                            'name': company_obj.name,
                            'code': company_obj.code,
                        },
                        'status': None,
                        'submission_id': None,
                        'financial_period_id': None,
                        'reporting_period_id': None,
                    })
                else:
                    # Show for all companies that have this report
                    for company_obj in companies.filter(id__in=report_companies):
                        payload.append({
                            'report': ReportBoxSerializer(report).data,
                            'company': {
                                'id': str(company_obj.id),
                                'name': company_obj.name,
                                'code': company_obj.code,
                            },
                            'status': None,
                            'submission_id': None,
                            'financial_period_id': None,
                            'reporting_period_id': None,
                        })
        
        return Response(payload)

    @extend_schema(
        summary="Create a new submission",
        description="Submit a new report with field values. Status will be set to UNDER_REVIEW.",
        request=SubmissionWriteSerializer,
        responses={
            201: SubmissionReadSerializer,
            400: {'description': 'Validation error'},
        },
    )
    def create(self, request):
        # Default to DRAFT for new submissions (auto-saves)
        # Only set to UNDER_REVIEW when explicitly submitting
        # Note: New submissions will ALWAYS start as DRAFT regardless of this value
        # This status is only used when updating existing DRAFT submissions to UNDER_REVIEW
        submission_status = request.data.get('status', 'DRAFT')
        if submission_status not in ['DRAFT', 'UNDER_REVIEW']:
            submission_status = 'DRAFT'
        
        # Let the serializer handle existing submissions using get_or_create
        # The serializer's create() method will check if submission exists and update it if so
        serializer = SubmissionWriteSerializer(data=request.data, context={'request': request, 'status': submission_status})
        try:
            serializer.is_valid(raise_exception=True)
            submission = serializer.save()
        except ValidationError as e:
            # Check if this is a unique_together constraint error
            # If so, the submission already exists - let the serializer's create() handle it
            error_detail = str(e.detail) if hasattr(e, 'detail') else str(e)
            if 'unique' in error_detail.lower() or 'non_field_errors' in str(e.detail):
                # Try to get existing submission and update it
                report_id = request.data.get('report')
                company_id = request.data.get('company')
                financial_period_id = request.data.get('financial_period')
                reporting_period_id = request.data.get('reporting_period')
                
                if all([report_id, company_id, financial_period_id, reporting_period_id]):
                    existing_submission = Submission.objects.filter(
                        report_id=report_id,
                        company_id=company_id,
                        financial_period_id=financial_period_id,
                        reporting_period_id=reporting_period_id
                    ).first()
                    
                    if existing_submission:
                        # Update existing submission
                        serializer = SubmissionWriteSerializer(
                            instance=existing_submission,
                            data=request.data,
                            context={'request': request, 'status': submission_status}
                        )
                        serializer.is_valid(raise_exception=True)
                        submission = serializer.save()
                        return Response(SubmissionReadSerializer(submission).data, status=status.HTTP_200_OK)
            
            # Re-raise if not handled
            raise
        
        # Check if submission was newly created or already existed
        # For simplicity, we'll always return 201 (created) since get_or_create handles both cases
        return Response(SubmissionReadSerializer(submission).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Get a submission by ID",
        description="Retrieve a submission with its field values.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='UUID of the submission to retrieve',
            ),
        ],
        responses={
            200: SubmissionReadSerializer,
            404: {'description': 'Submission not found'},
        },
    )
    def retrieve(self, request, pk=None):
        """
        Retrieve a submission. Permissions are checked in check_object_permissions.
        """
        submission = self.get_object()
        return Response(SubmissionReadSerializer(submission).data)

    @extend_schema(
        summary="Update an existing submission",
        description="Update a submission. Only allowed if status is not APPROVED. Status will be reset to UNDER_REVIEW.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='UUID of the submission to update',
            ),
        ],
        request=SubmissionWriteSerializer,
        responses={
            200: SubmissionReadSerializer,
            400: {'description': 'Validation error'},
            403: {'description': 'Cannot edit an approved submission'},
            404: {'description': 'Submission not found'},
        },
    )
    def update(self, request, pk=None):
        """
        Update a submission. Permissions are checked in check_object_permissions.
        """
        submission = self.get_object()
        
        if submission.status.code == 'APPROVED':
            return Response({'detail': 'Cannot edit an approved submission.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = SubmissionWriteSerializer(instance=submission, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        return Response(SubmissionReadSerializer(submission).data)

    def partial_update(self, request, pk=None):
        """
        Partially update a submission. Permissions are checked in check_object_permissions.
        """
        submission = self.get_object()
        
        if submission.status.code == 'APPROVED':
            return Response({'detail': 'Cannot edit an approved submission.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = SubmissionWriteSerializer(instance=submission, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        return Response(SubmissionReadSerializer(submission).data)

    @extend_schema(
        summary="Submit all draft submissions",
        description="Changes status of all DRAFT submissions for a company, financial_period, and reporting_period to UNDER_REVIEW.",
        parameters=[
            OpenApiParameter(
                name='company_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the company',
            ),
            OpenApiParameter(
                name='financial_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the FinancialPeriod',
            ),
            OpenApiParameter(
                name='reporting_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the Reporting Period',
            ),
        ],
        responses={
            200: {'description': 'Submissions submitted', 'type': 'object', 'properties': {'detail': {'type': 'string'}, 'count': {'type': 'integer'}}},
        },
    )
    @action(detail=False, methods=['post'])
    def submit_all(self, request):
        company_id = request.query_params.get('company_id')
        financial_period_id = request.query_params.get('financial_period_id')
        reporting_period_id = request.query_params.get('reporting_period_id')
        group_id = request.query_params.get('group_id')  # Optional: specific group to update
        
        if not all([company_id, financial_period_id, reporting_period_id]):
            return Response(
                {'detail': 'company_id, financial_period_id, and reporting_period_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = OrgNode.objects.get(id=company_id, node_type=OrgNode.COMPANY)
        except ObjectDoesNotExist:
            return Response(
                {'detail': f'Company with id {company_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get status lookups
        try:
            draft_status = Lookup.objects.get(type__code='REPORT_STATUS', code='DRAFT')
            rejected_status = Lookup.objects.get(type__code='REPORT_STATUS', code='REJECTED')
            under_review_status = Lookup.objects.get(type__code='REPORT_STATUS', code='UNDER_REVIEW')
        except Lookup.DoesNotExist:
            return Response(
                {'detail': 'Required status lookups (DRAFT, REJECTED, or UNDER_REVIEW) not found'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        with transaction.atomic():
            # If a specific group_id is provided, update all submissions in that group
            if group_id:
                try:
                    # Validate that the group exists and matches the company/period combination
                    group = ReportSubmissionGroup.objects.get(
                        id=group_id,
                        company=company,
                        financial_period_id=financial_period_id,
                        reporting_period_id=reporting_period_id
                    )
                    
                    # Get all DRAFT and REJECTED submissions in this specific group
                    # DRAFT → UNDER_REVIEW (when submitted)
                    # REJECTED → UNDER_REVIEW (when resubmitted)
                    submissions = Submission.objects.filter(
                        group_id=group_id,
                        status__in=[draft_status, rejected_status]
                    )
                    
                    count = submissions.count()
                    
                    # Update submission statuses to UNDER_REVIEW
                    submissions.update(status=under_review_status)
                    
                    # Update the group status to UNDER_REVIEW
                    group.status = under_review_status
                    group.submitted_by = request.user
                    group.save(update_fields=['status', 'submitted_by', 'updated_at'])
                    
                except ReportSubmissionGroup.DoesNotExist:
                    return Response(
                        {'detail': f'Group with id {group_id} not found or does not match the provided parameters'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Get all DRAFT and REJECTED submissions for this combination
                # DRAFT → UNDER_REVIEW (when submitted)
                # REJECTED → UNDER_REVIEW (when resubmitted)
                submissions = Submission.objects.filter(
                    company=company,
                    financial_period_id=financial_period_id,
                    reporting_period_id=reporting_period_id,
                    status__in=[draft_status, rejected_status],  # Include both DRAFT and REJECTED
                ).select_related('group')
                
                count = submissions.count()
                
                # Update submission statuses to UNDER_REVIEW
                submissions.update(status=under_review_status)
                
                # Update group statuses to UNDER_REVIEW for all affected groups
                # Get unique group IDs from the submissions
                group_ids = list(submissions.values_list('group_id', flat=True).distinct())
                # Filter out None values (submissions without groups)
                group_ids = [gid for gid in group_ids if gid is not None]
                
                # Update all affected groups to UNDER_REVIEW
                if group_ids:
                    ReportSubmissionGroup.objects.filter(id__in=group_ids).update(
                        status=under_review_status,
                        submitted_by=request.user,
                        updated_at=timezone.now()
                    )
        
        return Response({
            'detail': f'Successfully submitted {count} submission(s)',
            'count': count,
        })


class ReportSubmissionGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportSubmissionGroupSerializer
    queryset = ReportSubmissionGroup.objects.all()

    def get_queryset(self):
        """
        Filter queryset to only show report submission groups for companies the user has access to.
        """
        queryset = super().get_queryset().select_related('company')
        user = self.request.user
        
        if user.is_superuser or user.is_staff:
            return queryset
        
        # Get companies the user has access to - convert to list to ensure proper evaluation
        accessible_company_ids = list(AccessScope.objects.filter(
            user=user,
            is_active=True,
            org_node__node_type=OrgNode.COMPANY
        ).values_list('org_node_id', flat=True))
        
        # If user has no accessible companies, return empty queryset
        if not accessible_company_ids:
            return queryset.none()
        
        return queryset.filter(company_id__in=accessible_company_ids)

    def check_object_permissions(self, request, obj):
        """
        Override to check permissions on the company instead of the group object.
        Since get_queryset() already filters by accessible companies, this is a double-check.
        We override this because HasCompanyAccess.has_object_permission expects an OrgNode,
        but we're passing a ReportSubmissionGroup, so we need to check the company instead.
        """
        # Check permissions on the company, not the group
        company = obj.company
        
        # Allow superusers and staff
        if request.user.is_superuser or request.user.is_staff:
            return
        
        # Check if user has access to this company
        # We know company is a COMPANY node from the model, so we don't need to check node_type again
        has_access = AccessScope.objects.filter(
            user=request.user,
            org_node=company,
            is_active=True
        ).exists()
        
        if not has_access:
            # Use PermissionDenied exception directly instead of permission_denied method
            # to avoid calling permission classes' has_object_permission with the wrong object
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to perform this action.')

    def update(self, request, *args, **kwargs):
        """
        Update a report submission group. Permissions are checked in check_object_permissions.
        """
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a report submission group. Permissions are checked in check_object_permissions.
        """
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Get or create report submission group",
        description="Gets existing group or creates a new one for the given company, financial_period, and reporting_period.",
        parameters=[
            OpenApiParameter(
                name='company_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
            OpenApiParameter(
                name='financial_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
            OpenApiParameter(
                name='reporting_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
        ],
        responses={
            200: ReportSubmissionGroupSerializer,
            201: ReportSubmissionGroupSerializer,
        },
    )
    @action(detail=False, methods=['get', 'post'])
    def get_or_create(self, request):
        company_id = request.query_params.get('company_id') or request.data.get('company_id')
        financial_period_id = request.query_params.get('financial_period_id') or request.data.get('financial_period_id')
        reporting_period_id = request.query_params.get('reporting_period_id') or request.data.get('reporting_period_id')
        
        if not all([company_id, financial_period_id, reporting_period_id]):
            return Response(
                {'detail': 'company_id, financial_period_id, and reporting_period_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the most recent group if multiple exist (since unique constraint was removed)
        groups = ReportSubmissionGroup.objects.filter(
            company_id=company_id,
            financial_period_id=financial_period_id,
            reporting_period_id=reporting_period_id,
        ).order_by('-created_at')
        
        if groups.exists():
            # Return the most recent group
            group = groups.first()
            return Response(ReportSubmissionGroupSerializer(group).data)
        else:
            if request.method == 'POST':
                # Get title from request, or generate a default one
                title = request.data.get('title', '').strip()
                if not title:
                    # Generate a default title using company, financial period, and reporting period
                    try:
                        company = OrgNode.objects.get(id=company_id)
                        financial_period = FinancialPeriod.objects.get(id=financial_period_id)
                        reporting_period = Lookup.objects.get(id=reporting_period_id)
                        title = f'{company.name} - {financial_period.title} - {reporting_period.title}'
                    except (OrgNode.DoesNotExist, FinancialPeriod.DoesNotExist, Lookup.DoesNotExist):
                        # Fallback if any object doesn't exist
                        title = 'گزارش جدید'
                
                serializer = ReportSubmissionGroupSerializer(data={
                    'title': title,
                    'description': request.data.get('description', ''),
                    'company': company_id,
                    'financial_period': financial_period_id,
                    'reporting_period': reporting_period_id,
                })
                serializer.is_valid(raise_exception=True)
                group = serializer.save()
                return Response(ReportSubmissionGroupSerializer(group).data, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'detail': 'Group not found. Use POST to create.'},
                    status=status.HTTP_404_NOT_FOUND
                )


class SubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCompanyAccess]
    serializer_class = SubmissionReadSerializer
    queryset = Submission.objects.all()

    @extend_schema(
        summary="List submissions",
        description="Returns a list of submissions filtered by company and financial_period. Optional filtering by reporting_period and status.",
        parameters=[
            OpenApiParameter(
                name='company_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description='UUID of the company (OrgNode with node_type=COMPANY). Required for non-admin users. Optional for admins (if not provided, returns all submissions).',
            ),
            OpenApiParameter(
                name='financial_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
                description='UUID of the FinancialPeriod',
            ),
            OpenApiParameter(
                name='reporting_period_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description='UUID of the Reporting Period (Lookup with type=REPORTING_PERIOD). If provided, filters by reporting_period.',
            ),
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Status code to filter by (e.g., DRAFT, UNDER_REVIEW, APPROVED)',
            ),
        ],
        responses={
            200: SubmissionReadSerializer(many=True),
            400: {'description': 'Invalid query parameters'},
        },
    )
    def list(self, request):
        company_id = request.query_params.get('company_id')
        financial_period_id = request.query_params.get('financial_period_id')
        reporting_period_id = request.query_params.get('reporting_period_id')
        status_code = request.query_params.get('status')
        
        user = request.user
        is_admin = user.is_superuser or user.is_staff
        
        # For non-admins, company_id and financial_period_id are required
        if not is_admin:
            if not company_id or not financial_period_id:
                return Response(
                    {'detail': 'company_id and financial_period_id are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        # For admins, financial_period_id is required but company_id is optional
        else:
            if not financial_period_id:
                return Response(
                    {'detail': 'financial_period_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Build queryset with proper select_related and prefetch_related to avoid N+1 queries
        # and prevent recursion issues during query compilation
        queryset = Submission.objects.select_related(
            'company',
            'financial_period',
            'reporting_period',
            'reporting_period__type',  # Needed for LookupSerializer
            'status',
            'status__type',  # Needed for LookupSerializer
            'report',
            'group',
            'group__company',
            'group__financial_period',
            'group__reporting_period',
            'group__reporting_period__type',  # Needed for LookupSerializer in group
            'group__status',
            'group__status__type',  # Needed for LookupSerializer in group
        ).prefetch_related(
            'values',
            'values__field',
        )
        
        # Apply filters based on user role
        if is_admin:
            # Admins can see all submissions for the financial period
            queryset = queryset.filter(financial_period_id=financial_period_id)
            # Filter by company if provided
            if company_id:
                queryset = queryset.filter(company_id=company_id)
        else:
            # Non-admins: check company access
            # Get companies the user has access to
            # Convert to list to avoid lazy evaluation issues that can cause recursion
            accessible_company_ids = list(AccessScope.objects.filter(
                user=user,
                is_active=True,
                org_node__node_type=OrgNode.COMPANY
            ).values_list('org_node_id', flat=True))
            accessible_companies = OrgNode.objects.filter(id__in=accessible_company_ids)
            
            # Check if user has access to the requested company
            try:
                company = accessible_companies.get(id=company_id)
            except ObjectDoesNotExist:
                return Response(
                    {'detail': f'Company with id {company_id} not found or you do not have access to it'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            queryset = queryset.filter(
                company=company,
                financial_period_id=financial_period_id,
            )
        
        if reporting_period_id:
            queryset = queryset.filter(reporting_period_id=reporting_period_id)
        
        if status_code:
            # Use direct filter on status_id if we have the lookup ID, or filter by code
            queryset = queryset.filter(status__code=status_code)
        
        # Order by created_at descending
        queryset = queryset.order_by('-created_at')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class AdminReviewViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = SubmissionReadSerializer
    queryset = Submission.objects.all()

    @extend_schema(
        summary="List submissions under review",
        description="Returns all submissions that are currently in UNDER_REVIEW status, ready for admin review.",
        responses={
            200: SubmissionReadSerializer(many=True),
        },
    )
    def list(self, request):
        qs = self.queryset.filter(status__code='UNDER_REVIEW').select_related(
            'company',
            'financial_period',
            'reporting_period',
            'reporting_period__type',  # Needed for LookupSerializer
            'status',
            'status__type',  # Needed for LookupSerializer
            'report',
            'group',
            'group__company',
            'group__financial_period',
            'group__reporting_period',
            'group__reporting_period__type',  # Needed for LookupSerializer in group
            'group__status',
            'group__status__type',  # Needed for LookupSerializer in group
        ).prefetch_related(
            'values',
            'values__field',
        )
        data = SubmissionReadSerializer(qs, many=True).data
        return Response(data)

    @extend_schema(
        summary="Approve a submission",
        description="Approve a submission that is under review. This will lock the submission and prevent further edits.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='UUID of the submission to approve',
            ),
        ],
        responses={
            200: {'description': 'Submission approved', 'type': 'object', 'properties': {'detail': {'type': 'string'}}},
            404: {'description': 'Submission not found'},
        },
    )
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        submission = self.get_queryset().get(pk=pk)
        approved = Lookup.objects.get(type__code='REPORT_STATUS', code='APPROVED')
        submission.status = approved
        submission.save(update_fields=['status', 'updated_at'])
        return Response({'detail': 'Approved'})

    @extend_schema(
        summary="Reject a submission",
        description="Reject a submission that is under review. Requires a comment explaining the rejection. The submission will be unlocked for resubmission.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='UUID of the submission to reject',
            ),
        ],
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'comment': {
                        'type': 'string',
                        'description': 'Mandatory comment explaining the reason for rejection',
                    },
                },
                'required': ['comment'],
            },
        },
        responses={
            200: {'description': 'Submission rejected', 'type': 'object', 'properties': {'detail': {'type': 'string'}}},
            400: {'description': 'Comment is required'},
            404: {'description': 'Submission not found'},
        },
    )
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        comment = request.data.get('comment')
        if not comment:
            return Response({'detail': 'comment is required'}, status=status.HTTP_400_BAD_REQUEST)
        submission = self.get_queryset().get(pk=pk)
        rejected = Lookup.objects.get(type__code='REPORT_STATUS', code='REJECTED')
        submission.status = rejected
        submission.rejection_comment = comment
        submission.save(update_fields=['status', 'rejection_comment', 'updated_at'])
        return Response({'detail': 'Rejected'})

    @extend_schema(
        summary="List submission groups under review",
        description="Returns all submission groups that are currently in UNDER_REVIEW status, ready for admin review.",
        responses={
            200: ReportSubmissionGroupSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'], url_path='groups')
    def list_groups(self, request):
        """
        List all submission groups with UNDER_REVIEW status.
        Admins can see all groups regardless of company access.
        """
        groups = ReportSubmissionGroup.objects.filter(
            status__code='UNDER_REVIEW'
        ).select_related(
            'company',
            'financial_period',
            'reporting_period',
            'reporting_period__type',  # Needed for LookupSerializer
            'status',
            'status__type',  # Needed for LookupSerializer
            'submitted_by'
        ).prefetch_related(
            'submissions__report',
            'submissions__company',
            'submissions__financial_period',
            'submissions__reporting_period',
            'submissions__reporting_period__type',  # Needed for LookupSerializer
            'submissions__status',
            'submissions__status__type',  # Needed for LookupSerializer
            'submissions__values__field',
        ).order_by('-created_at')
        
        serializer = ReportSubmissionGroupSerializer(groups, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Approve a submission group",
        description="Approve a submission group that is under review. This will set the group status to APPROVED and update all submissions in the group to APPROVED status.",
        parameters=[
            OpenApiParameter(
                name='group_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='UUID of the submission group to approve',
            ),
        ],
        responses={
            200: {'description': 'Group approved', 'type': 'object', 'properties': {'detail': {'type': 'string'}}},
            404: {'description': 'Group not found'},
            400: {'description': 'Group is not under review'},
        },
    )
    @action(detail=False, methods=['post'], url_path='groups/(?P<group_id>[^/.]+)/approve')
    def approve_group(self, request, group_id=None):
        """
        Approve a submission group. Updates group status and all submissions in the group.
        """
        try:
            group = ReportSubmissionGroup.objects.get(id=group_id)
        except ReportSubmissionGroup.DoesNotExist:
            return Response(
                {'detail': 'Submission group not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify group is under review
        if group.status and group.status.code != 'UNDER_REVIEW':
            return Response(
                {'detail': f'Group is not under review. Current status: {group.status.code if group.status else "None"}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approved_status = Lookup.objects.get(type__code='REPORT_STATUS', code='APPROVED')
        
        with transaction.atomic():
            # Update group status
            group.status = approved_status
            group.save(update_fields=['status'])
            
            # Update all submissions in the group
            # Note: auto_now doesn't work with bulk update(), so we set updated_at explicitly
            Submission.objects.filter(group=group).update(
                status=approved_status,
                updated_at=timezone.now()
            )
        
        return Response({'detail': 'Group approved'})

    @extend_schema(
        summary="Reject a submission group",
        description="Reject a submission group that is under review. Requires a comment explaining the rejection. The group and all submissions will be set to REJECTED status.",
        parameters=[
            OpenApiParameter(
                name='group_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='UUID of the submission group to reject',
            ),
        ],
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'comment': {
                        'type': 'string',
                        'description': 'Mandatory comment explaining the reason for rejection',
                    },
                },
                'required': ['comment'],
            },
        },
        responses={
            200: {'description': 'Group rejected', 'type': 'object', 'properties': {'detail': {'type': 'string'}}},
            400: {'description': 'Comment is required or group is not under review'},
            404: {'description': 'Group not found'},
        },
    )
    @action(detail=False, methods=['post'], url_path='groups/(?P<group_id>[^/.]+)/reject')
    def reject_group(self, request, group_id=None):
        """
        Reject a submission group. Updates group status and all submissions in the group.
        Requires a comment explaining the rejection.
        """
        comment = request.data.get('comment')
        if not comment:
            return Response(
                {'detail': 'comment is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            group = ReportSubmissionGroup.objects.get(id=group_id)
        except ReportSubmissionGroup.DoesNotExist:
            return Response(
                {'detail': 'Submission group not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify group is under review
        if group.status and group.status.code != 'UNDER_REVIEW':
            return Response(
                {'detail': f'Group is not under review. Current status: {group.status.code if group.status else "None"}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejected_status = Lookup.objects.get(type__code='REPORT_STATUS', code='REJECTED')
        
        with transaction.atomic():
            # Update group status
            group.status = rejected_status
            group.save(update_fields=['status'])
            
            # Update all submissions in the group with rejection comment
            # Note: auto_now doesn't work with bulk update(), so we set updated_at explicitly
            Submission.objects.filter(group=group).update(
                status=rejected_status,
                rejection_comment=comment,
                updated_at=timezone.now()
            )
        
        return Response({'detail': 'Group rejected'})
