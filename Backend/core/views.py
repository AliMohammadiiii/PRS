from rest_framework import viewsets, status
from rest_framework.response import Response


class SoftDeleteModelViewSet(viewsets.ModelViewSet):
    """
    Enforces soft-delete semantics for models inheriting BaseModel with `is_active`.
    - Default queryset filters is_active=True unless `include_inactive=1` is provided.
    - DELETE operations are disabled (returns 405 Method Not Allowed).
    """
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options', 'trace']
    
    def get_queryset(self):
        qs = super().get_queryset()
        include_inactive = self.request.query_params.get('include_inactive')
        if include_inactive in ('1', 'true', 'True'):
            return qs
        if hasattr(qs.model, 'is_active'):
            return qs.filter(is_active=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        """
        Delete operations are disabled. Use is_active=False for soft deletes if needed.
        """
        return Response(
            {'detail': 'Delete operations are not allowed. Use soft delete by setting is_active=False if needed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
