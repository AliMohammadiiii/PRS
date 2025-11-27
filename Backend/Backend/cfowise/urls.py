from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from .views import me_view, health_view
from .rate_limit_views import RateLimitedTokenObtainPairView, RateLimitedTokenRefreshView, RateLimitedTokenVerifyView
from accounts.views import UserViewSet, AccessScopeViewSet, change_password_view
from classifications.views import LookupTypeViewSet, LookupViewSet
from audit.views import AuditEventViewSet, FieldChangeViewSet
from teams.views import TeamViewSet
from purchase_requests.views import PurchaseRequestViewSet
from prs_forms.views import FormTemplateViewSet
from workflows.views import WorkflowViewSet, WorkflowTemplateViewSet

router = DefaultRouter()
# Admin/setup APIs
router.register(r"users", UserViewSet, basename="user")
router.register(r"access-scopes", AccessScopeViewSet, basename="access-scope")
router.register(r"lookup-types", LookupTypeViewSet, basename="lookup-type")
router.register(r"lookups", LookupViewSet, basename="lookup")
#
# Legacy CFO-wise APIs (financial periods, org, reports, submissions) have been
# removed from the public router to keep this project focused on PRS.
# The underlying apps and models remain available for data preservation but are
# no longer exposed as HTTP endpoints.
# Audit APIs
router.register(r"audit-events", AuditEventViewSet, basename="audit-event")
router.register(r"field-changes", FieldChangeViewSet, basename="field-change")
# PRS APIs
router.register(r"prs/teams", TeamViewSet, basename="prs-team")
router.register(r"prs/requests", PurchaseRequestViewSet, basename="prs-request")
router.register(r"prs/form-templates", FormTemplateViewSet, basename="prs-form-template")
router.register(r"prs/workflows", WorkflowTemplateViewSet, basename="prs-workflow-template")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check endpoint
    path("health", health_view, name="health"),
    # Auth endpoints (rate-limited)
    path("api/auth/token/", RateLimitedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", RateLimitedTokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/verify/", RateLimitedTokenVerifyView.as_view(), name="token_verify"),
    path("api/auth/change-password/", change_password_view, name="change_password"),
    # Current user
    path("api/me/", me_view, name="me"),
    # OpenAPI schema & docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API router (PRS‑focused)
    path("api/", include(router.urls)),
]


