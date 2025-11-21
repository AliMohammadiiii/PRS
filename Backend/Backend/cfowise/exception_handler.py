"""
Custom exception handler to ensure no sensitive data is exposed in error responses.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from django.http import Http404
from django.core.exceptions import PermissionDenied, ValidationError

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that:
    - Logs errors appropriately
    - Removes sensitive information from error responses
    - Provides user-friendly error messages
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Log the exception
    if response is not None:
        logger.error(
            f"API Error: {exc.__class__.__name__} - {str(exc)}",
            extra={'context': context, 'status_code': response.status_code}
        )
    else:
        # Unhandled exception
        logger.exception(
            f"Unhandled exception: {exc.__class__.__name__}",
            extra={'context': context}
        )
    
    # Customize the response data
    if response is not None:
        # Remove sensitive information from error details
        if isinstance(response.data, dict):
            # Remove any potential sensitive fields
            sensitive_fields = ['password', 'secret', 'token', 'key', 'api_key', 'access_token']
            for field in sensitive_fields:
                if field in response.data:
                    response.data[field] = '[REDACTED]'
            
            # Ensure error messages don't expose internal details
            if 'detail' in response.data:
                detail = response.data['detail']
                # Don't expose database errors or internal exceptions
                if isinstance(detail, str):
                    if 'database' in detail.lower() or 'sql' in detail.lower():
                        response.data['detail'] = 'An error occurred processing your request.'
                    elif 'does not exist' in detail.lower():
                        response.data['detail'] = 'The requested resource was not found.'
                    elif 'permission' in detail.lower() or 'forbidden' in detail.lower():
                        response.data['detail'] = 'You do not have permission to perform this action.'
        elif isinstance(response.data, list):
            # Handle list of errors
            response.data = [msg for msg in response.data if not any(
                sensitive in str(msg).lower() for sensitive in ['password', 'secret', 'token']
            )]
    
    # Handle unhandled exceptions
    if response is None:
        if isinstance(exc, Http404):
            response = Response(
                {'detail': 'The requested resource was not found.'},
                status=404
            )
        elif isinstance(exc, PermissionDenied):
            response = Response(
                {'detail': 'You do not have permission to perform this action.'},
                status=403
            )
        elif isinstance(exc, ValidationError):
            response = Response(
                {'detail': 'Invalid data provided.'},
                status=400
            )
        else:
            # Generic error for any unhandled exception
            response = Response(
                {'detail': 'An internal server error occurred.'},
                status=500
            )
    
    return response




