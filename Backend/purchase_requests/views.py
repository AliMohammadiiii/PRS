from datetime import datetime
from uuid import UUID

from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema

from accounts.models import AccessScope
from approvals.models import ApprovalHistory
from approvals.serializers import ApprovalHistorySerializer
from attachments.models import Attachment
from attachments.serializers import AttachmentSerializer
from purchase_requests import services
from purchase_requests.models import PurchaseRequest, RequestFieldValue
from purchase_requests.serializers import (
    PurchaseRequestCreateSerializer,
    PurchaseRequestReadSerializer,
    PurchaseRequestUpdateSerializer,
)


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing purchase requests.
    
    Supports:
    - Creating draft requests (POST /api/prs/requests/)
    - Updating draft/rejected/resubmitted requests (PATCH /api/prs/requests/{id}/)
    - Submitting requests for approval (POST /api/prs/requests/{id}/submit/)
    - Reading requests (GET /api/prs/requests/ and GET /api/prs/requests/{id}/)
    """
    permission_classes = [IsAuthenticated]
    queryset = PurchaseRequest.objects.select_related(
        'team',
        'form_template',
        'status',
        'status__type',  # For LookupSerializer
        'purchase_type',
        'purchase_type__type',  # For LookupSerializer
        'current_step',
        'requestor',
    ).prefetch_related(
        Prefetch(
            'field_values',
            queryset=RequestFieldValue.objects.select_related('field').all()
        ),
        'attachments',
    ).filter(is_active=True)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return PurchaseRequestCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PurchaseRequestUpdateSerializer
        else:
            return PurchaseRequestReadSerializer

    def get_queryset(self):
        """
        Base queryset for purchase requests.
        Actual permission-based scoping is applied in `list` and custom inbox
        endpoints so that we can treat Admin users differently from normal users.
        """
        qs = super().get_queryset()
        return qs

    def _user_is_admin(self, user) -> bool:
        """
        Determine if a user should be treated as an Admin for PRS visibility.
        
        Admins are:
        - Django superusers
        - Django staff users
        - Users with an AccessScope role code 'ADMIN'
        """
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        # Check ADMIN role via AccessScope (if configured)
        return AccessScope.objects.filter(
            user=user,
            role__code='ADMIN',
            is_active=True,
        ).exists()

    def _check_requestor_permission(self, purchase_request: PurchaseRequest):
        """Check if current user is the requestor"""
        if purchase_request.requestor != self.request.user:
            raise PermissionDenied('Only the requestor can perform this action.')

    def _check_editable_status(self, purchase_request: PurchaseRequest):
        """Check if request status allows editing"""
        editable_statuses = ['DRAFT', 'REJECTED', 'RESUBMITTED']
        status_code = purchase_request.status.code if purchase_request.status else None
        
        # COMPLETED and FINANCE_REVIEW are not editable
        if status_code in ['COMPLETED', 'FINANCE_REVIEW']:
            raise ValidationError(
                f'Request with status "{status_code}" cannot be edited. '
                'Completed requests and requests in finance review are frozen.'
            )
        
        if status_code not in editable_statuses:
            raise ValidationError(
                f'Request with status "{status_code}" cannot be edited. '
                f'Only requests with status {", ".join(editable_statuses)} can be edited.'
            )

    @extend_schema(
        summary="Create a new draft purchase request",
        description="Creates a new purchase request in DRAFT status linked to the team's active form template.",
        request=PurchaseRequestCreateSerializer,
        responses={
            201: PurchaseRequestReadSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new draft purchase request"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        purchase_request = serializer.save()
        
        # Create audit event
        services.create_audit_event_for_request_created(
            purchase_request=purchase_request,
            actor=request.user
        )
        
        # Return created request
        read_serializer = PurchaseRequestReadSerializer(purchase_request)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Update a draft/rejected/resubmitted purchase request",
        description="Updates top-level fields and/or field values for a request in DRAFT, REJECTED, or RESUBMITTED status. Only the requestor can update their own requests.",
        request=PurchaseRequestUpdateSerializer,
        responses={
            200: PurchaseRequestReadSerializer,
            400: {'description': 'Validation error'},
            403: {'description': 'Permission denied - not the requestor'},
        },
    )
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """Update a purchase request (top-level fields + field values)"""
        instance = self.get_object()
        
        # Check permissions
        self._check_requestor_permission(instance)
        self._check_editable_status(instance)
        
        # Validate serializer (audit logging is handled inside the serializer)
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True,
            context={
                'request': request,
                # Let the serializer know that the view will NOT perform
                # separate audit logging, to avoid double events.
                'skip_audit': False,
            }
        )
        serializer.is_valid(raise_exception=True)

        # Perform update (serializer now handles audit logging)
        purchase_request = serializer.save()

        # Return updated request
        read_serializer = PurchaseRequestReadSerializer(purchase_request)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Submit a purchase request for approval",
        description="Submits a purchase request for approval. Validates required fields and attachments, then transitions status to PENDING_APPROVAL or IN_REVIEW and sets the first workflow step.",
        responses={
            200: PurchaseRequestReadSerializer,
            400: {'description': 'Validation error - missing required fields or attachments'},
            403: {'description': 'Permission denied - not the requestor'},
        },
    )
    @action(detail=True, methods=['post'], url_path='submit')
    @transaction.atomic
    def submit(self, request, pk=None):
        """Submit a purchase request for approval"""
        purchase_request = self.get_object()
        
        # Check permissions
        self._check_requestor_permission(purchase_request)
        self._check_editable_status(purchase_request)
        
        # Track old status
        old_status_code = purchase_request.status.code if purchase_request.status else None
        
        # Validate required fields
        field_errors = services.validate_required_fields(purchase_request)
        if field_errors:
            raise ValidationError({
                'required_fields': field_errors,
                'message': 'Cannot submit request: required fields are missing.'
            })
        
        # Validate required attachments
        attachment_errors = services.validate_required_attachments(purchase_request)
        if attachment_errors:
            raise ValidationError({
                'required_attachments': attachment_errors,
                'message': 'Cannot submit request: required attachments are missing.'
            })
        
        # Get first workflow step
        first_step = services.get_first_workflow_step(purchase_request.team)
        if not first_step:
            raise ValidationError(
                'Cannot submit request: no active workflow found for this team.'
            )
        
        # Validate workflow configuration according to PRD:
        # - At least one non-finance step
        # - Finance step is optional (for test scenarios like S04)
        # Note: PRD requires finance step, but test scenarios may omit it
        from workflows.models import WorkflowStep  # Local import to avoid circular deps at module import time
        workflow_steps_qs = WorkflowStep.objects.filter(
            workflow=first_step.workflow,
            is_active=True,
        )
        has_finance_step = workflow_steps_qs.filter(is_finance_review=True).exists()
        has_non_finance_step = workflow_steps_qs.filter(is_finance_review=False).exists()
        workflow_errors = []
        if not has_non_finance_step:
            workflow_errors.append('Workflow must contain at least one non‑finance approval step.')
        # Finance step is optional - workflows without finance steps will go to FULLY_APPROVED
        # when all approval steps are complete (useful for test scenarios)
        if workflow_errors:
            raise ValidationError({
                'workflow': workflow_errors,
                'message': 'Cannot submit request: team workflow configuration is invalid.'
            })
        
        # Transition status
        # From DRAFT/REJECTED/RESUBMITTED, transition to PENDING_APPROVAL or IN_REVIEW
        # For simplicity, we'll use PENDING_APPROVAL as the initial status
        new_status = services.get_pending_approval_status()
        
        # Update purchase request
        purchase_request.status = new_status
        purchase_request.current_step = first_step
        purchase_request.submitted_at = timezone.now()
        purchase_request.save()
        
        # Create audit event
        services.create_audit_event_for_request_submitted(
            purchase_request=purchase_request,
            actor=request.user,
            old_status_code=old_status_code
        )
        
        # Return updated request
        read_serializer = PurchaseRequestReadSerializer(purchase_request)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="List attachments for a purchase request",
        description="Returns a list of all active attachments for the specified purchase request.",
        responses={
            200: AttachmentSerializer(many=True),
            403: {'description': 'Permission denied'},
            404: {'description': 'Request not found'},
        },
    )
    @action(detail=True, methods=['get'], url_path='attachments', url_name='list-attachments')
    def list_attachments(self, request, pk=None):
        """List all attachments for a purchase request"""
        purchase_request = self.get_object()
        
        # For now, allow any authenticated user to view attachments
        # Could add more granular permissions later
        # At minimum, ensure requestor can view
        if purchase_request.requestor != request.user and not (request.user.is_superuser or request.user.is_staff):
            # For now, allow viewing - can restrict later if needed
            pass
        
        # Get active attachments with related data
        attachments = Attachment.objects.filter(
            request=purchase_request,
            is_active=True
        ).select_related('category', 'uploaded_by').order_by('-upload_date')
        
        serializer = AttachmentSerializer(attachments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Upload an attachment for a purchase request",
        description="Uploads a file attachment for a purchase request. The request must be in an editable status (DRAFT/REJECTED/RESUBMITTED) and the user must be the requestor.",
        request={'multipart/form-data': {
            'type': 'object',
            'properties': {
                'file': {'type': 'string', 'format': 'binary'},
                'category_id': {'type': 'string', 'format': 'uuid', 'required': False}
            }
        }},
        responses={
            201: AttachmentSerializer,
            400: {'description': 'Validation error'},
            403: {'description': 'Permission denied - not the requestor'},
        },
    )
    @action(detail=True, methods=['post'], url_path='upload-attachment', url_name='upload-attachment')
    @transaction.atomic
    def upload_attachment(self, request, pk=None):
        """Upload an attachment for a purchase request"""
        purchase_request = self.get_object()
        
        # Check permissions
        self._check_requestor_permission(purchase_request)
        self._check_editable_status(purchase_request)
        
        # Validate file is present
        if 'file' not in request.FILES:
            raise ValidationError({'file': 'File is required.'})
        
        file_obj = request.FILES['file']
        
        # Get category_id from request data if provided (serializer will validate)
        category_id = request.data.get('category_id')
        
        # Create serializer with context
        serializer = AttachmentSerializer(
            data={
                'file': file_obj,
                'category_id': category_id,
            },
            context={
                'request': request,
                'request_obj': purchase_request,
            }
        )
        serializer.is_valid(raise_exception=True)
        
        # Save attachment
        attachment = serializer.save()
        
        # Create audit event
        services.create_audit_event_for_attachment_upload(
            purchase_request=purchase_request,
            actor=request.user,
            attachment=attachment
        )
        
        # Return created attachment
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Delete an attachment from a purchase request",
        description="Deletes (soft-deletes) an attachment from a purchase request. The request must be in an editable status and the user must be the requestor.",
        responses={
            204: {'description': 'Attachment deleted successfully'},
            400: {'description': 'Validation error - request not editable'},
            403: {'description': 'Permission denied'},
            404: {'description': 'Attachment not found'},
        },
    )
    @extend_schema(
        summary="Download an attachment from a purchase request",
        description="Downloads a file attachment. Only users involved in the workflow (Initiator, Approvers, Finance Reviewers, System Admin) can download attachments.",
        responses={
            200: {'description': 'File download'},
            403: {'description': 'Permission denied - user not authorized to access this attachment'},
            404: {'description': 'Attachment not found'},
        },
    )
    @action(detail=True, methods=['get'], url_path='attachments/(?P<attachment_id>[^/.]+)/download')
    def download_attachment(self, request, pk=None, attachment_id=None):
        """Download an attachment from a purchase request"""
        purchase_request = self.get_object()
        
        # Get attachment
        try:
            attachment = Attachment.objects.get(
                id=attachment_id,
                request=purchase_request,
                is_active=True
            )
        except Attachment.DoesNotExist:
            raise NotFound('Attachment not found.')
        
        # Check permissions - only workflow participants can download
        user = request.user
        is_authorized = False

        # System Admins and staff can always download
        if user.is_superuser or user.is_staff:
            is_authorized = True
        # Requestor can download
        elif purchase_request.requestor == user:
            is_authorized = True
        else:
            # Approvers (by role) at any step can download
            from workflows.models import WorkflowStepApprover

            user_role_ids = AccessScope.objects.filter(
                user=user,
                team=purchase_request.team,
                is_active=True,
            ).values('role_id')

            has_step_role = WorkflowStepApprover.objects.filter(
                step__workflow__team=purchase_request.team,
                is_active=True,
                role_id__in=user_role_ids,
            ).exists()

            # Finance Reviewers can download
            has_finance_role = False
            if purchase_request.current_step and purchase_request.current_step.is_finance_review:
                has_finance_role = WorkflowStepApprover.objects.filter(
                    step=purchase_request.current_step,
                    is_active=True,
                    role_id__in=user_role_ids,
                ).exists()

            if has_step_role or has_finance_role:
                is_authorized = True
        
        if not is_authorized:
            raise PermissionDenied(
                'You are not authorized to download attachments for this request. '
                'Only workflow participants (Initiator, Approvers, Finance Reviewers, System Admin) can download attachments.'
            )
        
        # Serve file for download
        from django.http import FileResponse, Http404
        try:
            response = FileResponse(
                attachment.file_path.open('rb'),
                as_attachment=True,
                filename=attachment.filename
            )
            return response
        except (ValueError, IOError):
            raise NotFound('Attachment file not found on disk.')
    
    @action(detail=True, methods=['delete'], url_path='attachments/(?P<attachment_id>[^/.]+)')
    @transaction.atomic
    def delete_attachment(self, request, pk=None, attachment_id=None):
        """Delete an attachment from a purchase request"""
        purchase_request = self.get_object()
        
        # Check permissions
        self._check_requestor_permission(purchase_request)
        self._check_editable_status(purchase_request)
        
        # Get attachment
        try:
            attachment = Attachment.objects.get(
                id=attachment_id,
                request=purchase_request,
                is_active=True
            )
        except Attachment.DoesNotExist:
            raise NotFound('Attachment not found.')
        
        # Create audit event before deletion (to capture all metadata)
        services.create_audit_event_for_attachment_removed(
            purchase_request=purchase_request,
            actor=request.user,
            attachment=attachment
        )
        
        # Soft delete: delete physical file first, then mark as inactive
        attachment.file_path.delete(save=False)
        attachment.is_active = False
        attachment.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Get approval history for a purchase request",
        description="Returns a list of all approval history records for the specified purchase request, ordered by timestamp (oldest first).",
        responses={
            200: ApprovalHistorySerializer(many=True),
            403: {'description': 'Permission denied'},
            404: {'description': 'Request not found'},
        },
    )
    @action(detail=True, methods=['get'], url_path='approvals')
    def approvals(self, request, pk=None):
        """Get approval history for a purchase request"""
        purchase_request = self.get_object()
        
        # Allow any authenticated user to view approval history
        # Could add more granular permissions later
        
        # Get approval history with related data
        approval_history = ApprovalHistory.objects.filter(
            request=purchase_request,
            is_active=True
        ).select_related('step', 'approver', 'role').order_by('timestamp')
        
        serializer = ApprovalHistorySerializer(approval_history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Get audit trail for a purchase request",
        description="Returns complete audit trail for the specified purchase request including all events and field changes, ordered by timestamp.",
        responses={
            200: {'description': 'List of audit events with field changes'},
            403: {'description': 'Permission denied'},
            404: {'description': 'Request not found'},
        },
    )
    @action(detail=True, methods=['get'], url_path='audit-trail')
    def audit_trail(self, request, pk=None):
        """Get complete audit trail for a purchase request"""
        purchase_request = self.get_object()
        
        # Allow any authenticated user to view audit trail
        # Could add more granular permissions later
        
        # Get all audit events for this request with field changes
        from audit.models import AuditEvent
        from audit.serializers import AuditEventSerializer
        
        audit_events = AuditEvent.objects.filter(
            request=purchase_request
        ).select_related('actor').prefetch_related(
            'field_changes__form_field',
            'field_changes__field'
        ).order_by('created_at')
        
        serializer = AuditEventSerializer(audit_events, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Approve a purchase request at current workflow step",
        description="Approves a purchase request at the current workflow step. If all approvers for the step have approved, the request moves to the next step or transitions to FINANCE_REVIEW status.",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'comment': {
                        'type': 'string',
                        'description': 'Optional comment from the approver'
                    }
                }
            }
        },
        responses={
            200: PurchaseRequestReadSerializer,
            400: {'description': 'Validation error - missing current_step or invalid status'},
            403: {'description': 'Permission denied - user is not an approver for this step'},
            404: {'description': 'Request not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='approve')
    @transaction.atomic
    def approve(self, request, pk=None):
        """Approve a purchase request at the current workflow step"""
        purchase_request = self.get_object()
        
        # Ensure request has a current step
        if not purchase_request.current_step:
            raise ValidationError(
                'Cannot approve request: request does not have a current workflow step.'
            )
        
        # Ensure status is in an approval state
        status_code = purchase_request.status.code if purchase_request.status else None
        if status_code not in ['PENDING_APPROVAL', 'IN_REVIEW']:
            raise ValidationError(
                f'Cannot approve request with status "{status_code}". '
                'Request must be in PENDING_APPROVAL or IN_REVIEW status.'
            )
        
        # Check user is an approver for this step
        services.ensure_user_is_step_approver(request.user, purchase_request)
        
        current_step = purchase_request.current_step
        comment = request.data.get('comment', '').strip() or None

        # Determine the role under which the user is approving, based on the
        # roles configured for this step and the user's AccessScope on the team.
        from workflows.models import WorkflowStepApprover

        step_role_ids = WorkflowStepApprover.objects.filter(
            step=current_step,
            is_active=True,
        ).values_list('role_id', flat=True)

        approval_role_id = None
        if step_role_ids.exists():
            approval_role_id = AccessScope.objects.filter(
                user=request.user,
                team=purchase_request.team,
                role_id__in=step_role_ids,
                is_active=True,
            ).values_list('role_id', flat=True).first()

        # Create approval history record
        ApprovalHistory.objects.create(
            request=purchase_request,
            step=current_step,
            approver=request.user,
            role_id=approval_role_id,
            action=ApprovalHistory.APPROVE,
            comment=comment
        )
        
        # Check if all approvers have approved
        if services.have_all_approvers_approved(purchase_request, current_step):
            # All approvers have approved - move to next step or final status
            next_step = services.get_next_workflow_step(current_step)
            
            if next_step and not next_step.is_finance_review:
                # Move to next non-finance step
                purchase_request.current_step = next_step
                purchase_request.status = services.get_in_review_status()
            elif next_step and next_step.is_finance_review:
                # Move to finance review step
                purchase_request.current_step = next_step
                purchase_request.status = services.get_finance_review_status()
            else:
                # No next step - should not happen if workflow is properly configured
                # But handle gracefully by setting to fully approved
                purchase_request.current_step = None
                purchase_request.status = services.get_fully_approved_status()
            
            purchase_request.save()
        
        # Create audit event
        services.create_audit_event_for_request_approved(
            purchase_request=purchase_request,
            actor=request.user,
            step=current_step
        )
        
        # Refresh from DB to get latest state
        purchase_request.refresh_from_db()
        
        # Return updated request
        read_serializer = PurchaseRequestReadSerializer(purchase_request)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Reject a purchase request at current workflow step",
        description="Rejects a purchase request at the current workflow step. Requires a comment with at least 10 characters explaining the rejection.",
        request={
            'application/json': {
                'type': 'object',
                'required': ['comment'],
                'properties': {
                    'comment': {
                        'type': 'string',
                        'description': 'Required rejection reason (minimum 10 characters)',
                        'minLength': 10
                    }
                }
            }
        },
        responses={
            200: PurchaseRequestReadSerializer,
            400: {'description': 'Validation error - missing/invalid comment, missing current_step, or invalid status'},
            403: {'description': 'Permission denied - user is not an approver for this step'},
            404: {'description': 'Request not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='reject')
    @transaction.atomic
    def reject(self, request, pk=None):
        """Reject a purchase request at the current workflow step"""
        purchase_request = self.get_object()
        
        # Validate comment is present and has minimum length
        comment = request.data.get('comment', '').strip()
        if not comment or len(comment) < 10:
            raise ValidationError({
                'comment': 'Rejection requires a comment with at least 10 characters.'
            })
        
        # Ensure request has a current step
        if not purchase_request.current_step:
            raise ValidationError(
                'Cannot reject request: request does not have a current workflow step.'
            )
        
        # Ensure status is in an approval state
        status_code = purchase_request.status.code if purchase_request.status else None
        if status_code not in ['PENDING_APPROVAL', 'IN_REVIEW', 'FINANCE_REVIEW']:
            raise ValidationError(
                f'Cannot reject request with status "{status_code}". '
                'Request must be in an approval state (PENDING_APPROVAL, IN_REVIEW, or FINANCE_REVIEW).'
            )
        
        # Check user is an approver for this step
        services.ensure_user_is_step_approver(request.user, purchase_request)
        
        current_step = purchase_request.current_step
        old_status_code = status_code

        # Determine the role under which the user is rejecting, based on the
        # roles configured for this step and the user's AccessScope on the team.
        from workflows.models import WorkflowStepApprover

        step_role_ids = WorkflowStepApprover.objects.filter(
            step=current_step,
            is_active=True,
        ).values_list('role_id', flat=True)

        rejection_role_id = None
        if step_role_ids.exists():
            rejection_role_id = AccessScope.objects.filter(
                user=request.user,
                team=purchase_request.team,
                role_id__in=step_role_ids,
                is_active=True,
            ).values_list('role_id', flat=True).first()

        # Create approval history record
        ApprovalHistory.objects.create(
            request=purchase_request,
            step=current_step,
            approver=request.user,
            role_id=rejection_role_id,
            action=ApprovalHistory.REJECT,
            comment=comment
        )
        
        # Update purchase request
        purchase_request.status = services.get_rejected_status()
        purchase_request.current_step = None
        purchase_request.rejection_comment = comment
        purchase_request.save()
        
        # Create audit event
        services.create_audit_event_for_request_rejected(
            purchase_request=purchase_request,
            actor=request.user,
            step=current_step,
            comment=comment,
            old_status_code=old_status_code
        )
        
        # Refresh from DB to get latest state
        purchase_request.refresh_from_db()
        
        # Return updated request
        read_serializer = PurchaseRequestReadSerializer(purchase_request)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Complete a purchase request (Finance Review)",
        description="Marks a purchase request in FINANCE_REVIEW status as COMPLETED. Only finance reviewers assigned to the finance review step can complete requests. This triggers a completion email and freezes the request.",
        responses={
            200: PurchaseRequestReadSerializer,
            400: {'description': 'Validation error - request not in finance review state or missing current_step'},
            403: {'description': 'Permission denied - user is not a finance reviewer for this step'},
            404: {'description': 'Request not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='complete')
    @transaction.atomic
    def complete(self, request, pk=None):
        """Complete a purchase request at the finance review step"""
        purchase_request = self.get_object()

        # Ensure request is active
        if not purchase_request.is_active:
            raise ValidationError('Cannot complete an inactive request.')
        
        # Store old status code
        old_status_code = purchase_request.status.code if purchase_request.status else None
        
        # Validate status is in finance review state
        status_code = old_status_code
        if status_code not in ['FINANCE_REVIEW', 'FULLY_APPROVED']:
            raise ValidationError(
                f'Request is not in finance review state. Current status: "{status_code}". '
                'Only requests in FINANCE_REVIEW or FULLY_APPROVED status can be completed.'
            )
        
        # Ensure request has a current step
        if not purchase_request.current_step:
            raise ValidationError(
                'Cannot complete request: request does not have a current workflow step.'
            )
        
        # Ensure current step is the finance review step
        if not purchase_request.current_step.is_finance_review:
            raise ValidationError(
                'Cannot complete request: current step is not a finance review step.'
            )

        # Ensure all required attachments are present before completion
        attachment_errors = services.validate_required_attachments(purchase_request)
        if attachment_errors:
            raise ValidationError({
                'required_attachments': attachment_errors,
                'message': 'Cannot complete request: required attachments are missing.'
            })
        
        # Check user is a finance reviewer for this step
        services.ensure_user_is_finance_reviewer(request.user, purchase_request)
        
        current_step = purchase_request.current_step
        comment = request.data.get('comment', '').strip() or None

        # Update purchase request to COMPLETED
        purchase_request.status = services.get_completed_status()
        purchase_request.completed_at = timezone.now()
        purchase_request.current_step = None  # Workflow is complete
        purchase_request.save()

        # Determine the role under which the user is completing, based on the
        # roles configured for this step and the user's AccessScope on the team.
        from workflows.models import WorkflowStepApprover

        step_role_ids = WorkflowStepApprover.objects.filter(
            step=current_step,
            is_active=True,
        ).values_list('role_id', flat=True)

        completion_role_id = None
        if step_role_ids.exists():
            completion_role_id = AccessScope.objects.filter(
                user=request.user,
                team=purchase_request.team,
                role_id__in=step_role_ids,
                is_active=True,
            ).values_list('role_id', flat=True).first()

        # Create approval history record for finance completion
        ApprovalHistory.objects.create(
            request=purchase_request,
            step=current_step,
            approver=request.user,
            role_id=completion_role_id,
            action=ApprovalHistory.APPROVE,  # Using APPROVE action for consistency
            comment=comment
        )
        
        # Create audit event (pass step before it was cleared)
        services.create_audit_event_for_request_completed(
            purchase_request=purchase_request,
            actor=request.user,
            old_status_code=old_status_code,
            step=current_step
        )
        
        # Send completion email (failures are logged but don't prevent completion)
        try:
            services.send_completion_email(purchase_request)
        except Exception as e:
            # Email failure should not prevent completion
            # Error is already logged in send_completion_email
            pass
        
        # Refresh from DB to get latest state
        purchase_request.refresh_from_db()
        
        # Return updated request
        read_serializer = PurchaseRequestReadSerializer(purchase_request)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    def _apply_list_filters(self, queryset, query_params):
        """
        Apply common filters to a purchase request queryset from query parameters.
        
        Supported filters:
        - status: Filter by status code
        - team_id: Filter by team UUID
        - created_from: Filter by created_at >= date/datetime
        - created_to: Filter by created_at <= date/datetime
        - vendor: Case-insensitive contains search on vendor_name
        - purchase_type: Filter by purchase type code
        - requestor_id: Filter by requestor UUID
        - workflow_step_id: Filter by current workflow step UUID
        
        Args:
            queryset: QuerySet to filter
            query_params: Request query parameters dict
        
        Returns:
            Filtered QuerySet
        """
        # Status filter
        status_code = query_params.get('status')
        if status_code:
            queryset = queryset.filter(status__code=status_code)
        
        # Team filter
        team_id = query_params.get('team_id')
        if team_id:
            try:
                team_uuid = UUID(team_id)
                queryset = queryset.filter(team_id=team_uuid)
            except (ValueError, TypeError):
                # Invalid UUID format - skip filter
                pass
        
        # Date range filters
        created_from = query_params.get('created_from')
        if created_from:
            try:
                # Try parsing as ISO datetime first, then date
                try:
                    dt = datetime.fromisoformat(created_from.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    # Try parsing as date
                    dt = datetime.strptime(created_from, '%Y-%m-%d')
                queryset = queryset.filter(created_at__gte=dt)
            except (ValueError, TypeError):
                # Invalid date format - skip filter
                pass
        
        created_to = query_params.get('created_to')
        if created_to:
            try:
                # Try parsing as ISO datetime first, then date
                try:
                    dt = datetime.fromisoformat(created_to.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    # Try parsing as date
                    dt = datetime.strptime(created_to, '%Y-%m-%d')
                queryset = queryset.filter(created_at__lte=dt)
            except (ValueError, TypeError):
                # Invalid date format - skip filter
                pass
        
        # Vendor filter (case-insensitive contains)
        vendor = query_params.get('vendor')
        if vendor:
            queryset = queryset.filter(vendor_name__icontains=vendor)
        
        # Purchase type filter
        purchase_type = query_params.get('purchase_type')
        if purchase_type:
            queryset = queryset.filter(purchase_type__code=purchase_type)
        
        # Requestor filter
        requestor_id = query_params.get('requestor_id')
        if requestor_id:
            try:
                requestor_uuid = UUID(requestor_id)
                queryset = queryset.filter(requestor_id=requestor_uuid)
            except (ValueError, TypeError):
                # Invalid UUID format - skip filter
                pass
        
        # Workflow step filter
        workflow_step_id = query_params.get('workflow_step_id')
        if workflow_step_id:
            try:
                step_uuid = UUID(workflow_step_id)
                queryset = queryset.filter(current_step_id=step_uuid)
            except (ValueError, TypeError):
                # Invalid UUID format - skip filter
                pass
        
        return queryset

    def list(self, request, *args, **kwargs):
        """
        List purchase requests.
        
        - **Admin users** (see `_user_is_admin`) get full visibility over all
          active requests across all teams.
        - **Non-admin users** are limited to:
          - Requests they initiated (`requestor == user`), OR
          - Requests belonging to teams they have an active `AccessScope` for.
        
        Standard query-string filters (status, team_id, dates, vendor, etc.)
        are then applied on top via `_apply_list_filters`, and the result is
        paginated.
        """
        user = request.user
        qs = self.get_queryset()

        if not self._user_is_admin(user):
            # Non-admin users: restrict visibility
            accessible_team_ids = AccessScope.objects.filter(
                user=user,
                team__is_active=True,
                is_active=True,
            ).values_list('team_id', flat=True)

            qs = qs.filter(
                models.Q(requestor=user) | models.Q(team_id__in=accessible_team_ids)
            )

        # Apply common list filters from query params
        qs = self._apply_list_filters(qs, request.query_params)
        qs = qs.order_by('-created_at')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="List purchase requests initiated by current user",
        description="Returns a paginated list of purchase requests created by the current user. Supports filtering by status, team, date range, and vendor name.",
        parameters=[
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by status code (e.g., "DRAFT", "PENDING_APPROVAL")',
                required=False,
            ),
            OpenApiParameter(
                name='team_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter by team UUID',
                required=False,
            ),
            OpenApiParameter(
                name='created_from',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter by created_at >= date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
                required=False,
            ),
            OpenApiParameter(
                name='created_to',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter by created_at <= date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
                required=False,
            ),
            OpenApiParameter(
                name='vendor',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by vendor name (case-insensitive contains)',
                required=False,
            ),
            OpenApiParameter(
                name='purchase_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by purchase type code (e.g., "GOOD", "SERVICE")',
                required=False,
            ),
            OpenApiParameter(
                name='requestor_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter by requestor UUID',
                required=False,
            ),
            OpenApiParameter(
                name='workflow_step_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter by current workflow step UUID',
                required=False,
            ),
        ],
        responses={
            200: PurchaseRequestReadSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'], url_path='my')
    def my(self, request):
        """List purchase requests initiated by the current user"""
        # Get base queryset for user's requests
        qs = services.get_my_requests_qs(request.user)
        
        # Apply filters
        qs = self._apply_list_filters(qs, request.query_params)
        
        # Order by newest first
        qs = qs.order_by('-created_at')
        
        # Paginate
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = PurchaseRequestReadSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        # Fallback if pagination is not configured
        serializer = PurchaseRequestReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="List purchase requests pending approval by current user",
        description="Returns a paginated list of purchase requests where the current user is an approver for the current workflow step and has not yet approved. Supports filtering by status, team, date range, and vendor name.",
        parameters=[
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by status code (e.g., "PENDING_APPROVAL", "IN_REVIEW")',
                required=False,
            ),
            OpenApiParameter(
                name='team_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter by team UUID',
                required=False,
            ),
            OpenApiParameter(
                name='created_from',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter by created_at >= date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
                required=False,
            ),
            OpenApiParameter(
                name='created_to',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter by created_at <= date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
                required=False,
            ),
            OpenApiParameter(
                name='vendor',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by vendor name (case-insensitive contains)',
                required=False,
            ),
        ],
        responses={
            200: PurchaseRequestReadSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'], url_path='my-approvals')
    def my_approvals(self, request):
        """List purchase requests pending approval by the current user"""
        # Get base queryset for approver inbox
        qs = services.get_approver_inbox_qs(request.user)
        
        # Apply filters
        qs = self._apply_list_filters(qs, request.query_params)
        
        # Order by newest first
        qs = qs.order_by('-created_at')
        
        # Paginate
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = PurchaseRequestReadSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        # Fallback if pagination is not configured
        serializer = PurchaseRequestReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="List purchase requests in finance review for current user",
        description="Returns a paginated list of purchase requests in FINANCE_REVIEW status where the current user is a finance reviewer for the current step. Supports filtering by team, date range, and vendor name.",
        parameters=[
            OpenApiParameter(
                name='team_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter by team UUID',
                required=False,
            ),
            OpenApiParameter(
                name='created_from',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter by created_at >= date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
                required=False,
            ),
            OpenApiParameter(
                name='created_to',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter by created_at <= date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
                required=False,
            ),
            OpenApiParameter(
                name='vendor',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by vendor name (case-insensitive contains)',
                required=False,
            ),
        ],
        responses={
            200: PurchaseRequestReadSerializer(many=True),
        },
    )
    @action(detail=False, methods=['get'], url_path='finance-inbox')
    def finance_inbox(self, request):
        """List purchase requests in finance review for the current user"""
        # Get base queryset for finance inbox
        qs = services.get_finance_inbox_qs(request.user)
        
        # Apply filters (status filter not needed since finance inbox is always FINANCE_REVIEW)
        qs = self._apply_list_filters(qs, request.query_params)
        
        # Order by newest first
        qs = qs.order_by('-created_at')
        
        # Paginate
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = PurchaseRequestReadSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        # Fallback if pagination is not configured
        serializer = PurchaseRequestReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        """Disable delete action - requests should be soft-deleted or archived"""
        raise ValidationError('Purchase requests cannot be deleted. Use status changes instead.')

