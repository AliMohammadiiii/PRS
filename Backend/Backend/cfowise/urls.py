from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from .views import me_view, health_view
from .rate_limit_views import RateLimitedTokenObtainPairView, RateLimitedTokenRefreshView, RateLimitedTokenVerifyView
from accounts.views import UserViewSet, AccessScopeViewSet, change_password_view
from classifications.views import LookupTypeViewSet, LookupViewSet
from periods.views import FinancialPeriodViewSet
from org.views import OrgNodeViewSet, CompanyClassificationViewSet
from reports import views as reports_views
from submissions.views import UserWorkflowViewSet, AdminReviewViewSet, SubmissionViewSet, ReportSubmissionGroupViewSet
from audit.views import AuditEventViewSet, FieldChangeViewSet

router = DefaultRouter()
# Admin/setup APIs
router.register(r"users", UserViewSet, basename="user")
router.register(r"access-scopes", AccessScopeViewSet, basename="access-scope")
router.register(r"lookup-types", LookupTypeViewSet, basename="lookup-type")
router.register(r"lookups", LookupViewSet, basename="lookup")
router.register(r"financial-periods", FinancialPeriodViewSet, basename="financial-period")
router.register(r"org-nodes", OrgNodeViewSet, basename="org-node")
router.register(r"company-classifications", CompanyClassificationViewSet, basename="company-classification")
# Reports setup
router.register(r"report-groups", reports_views.ReportGroupViewSet, basename="report-group")
router.register(r"report-boxes", reports_views.ReportBoxViewSet, basename="report-box")
router.register(r"report-fields", reports_views.ReportFieldViewSet, basename="report-field")
# Workflow / review
router.register(r"workflow", UserWorkflowViewSet, basename="workflow")
router.register(r"submissions", SubmissionViewSet, basename="submission")
router.register(r"report-submission-groups", ReportSubmissionGroupViewSet, basename="report-submission-group")
router.register(r"review", AdminReviewViewSet, basename="review")
# Audit APIs
router.register(r"audit-events", AuditEventViewSet, basename="audit-event")
router.register(r"field-changes", FieldChangeViewSet, basename="field-change")

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
    # API router
    path("api/", include(router.urls)),
]


