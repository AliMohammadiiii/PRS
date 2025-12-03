import os
import sys
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
# Add repo root so Django can import apps located at project root (e.g., accounts/, core/, ...)
REPO_ROOT = BASE_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

# Basic
DEBUG = os.environ.get("DEBUG", "True") == "True"
# Parse ALLOWED_HOSTS: check DJANGO_ALLOWED_HOSTS first, then ALLOWED_HOSTS, then default
# Split by comma, strip whitespace, filter empty strings
allowed_hosts_str = os.environ.get("DJANGO_ALLOWED_HOSTS") or os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1")
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(",") if host.strip()]

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "change-me-in-development"
    else:
        raise ValueError("SECRET_KEY environment variable must be set in production")

# Applications
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    # Domain apps (located at repo root)
    "core.apps.CoreConfig",
    "accounts.apps.AccountsConfig",
    "audit.apps.AuditConfig",
    "classifications.apps.ClassificationsConfig",
    "org.apps.OrgConfig",
    "periods.apps.PeriodsConfig",
    "reports.apps.ReportsConfig",
    "submissions.apps.SubmissionsConfig",
    # PRS apps
    "teams.apps.TeamsConfig",
    "prs_forms.apps.PrsFormsConfig",
    "workflows.apps.WorkflowsConfig",
    "purchase_requests.apps.PurchaseRequestsConfig",
    "attachments.apps.AttachmentsConfig",
    "approvals.apps.ApprovalsConfig",
    "prs_team_config.apps.PrsTeamConfigConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "cfowise.urls"

# Subpath deployment support
FORCE_SCRIPT_NAME = os.environ.get("FORCE_SCRIPT_NAME", "")
if FORCE_SCRIPT_NAME:
    USE_X_FORWARDED_HOST = True
    USE_X_FORWARDED_PORT = True

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "cfowise.wsgi.application"
ASGI_APPLICATION = "cfowise.asgi.application"

# Database
def _db_from_url(url: str):
    """
    Minimal DATABASE_URL parser supporting postgres and sqlite.
    Examples:
      postgres://USER:PASSWORD@HOST:PORT/NAME
      postgresql://USER:PASSWORD@HOST:PORT/NAME
      sqlite:///absolute/path/to/db.sqlite3
      sqlite:///:memory:
    """
    parsed = urlparse(url)
    scheme = parsed.scheme
    if scheme in ('postgres', 'postgresql', 'postgresql_psycopg2'):
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/'),
            'USER': parsed.username or '',
            'PASSWORD': parsed.password or '',
            'HOST': parsed.hostname or '',
            'PORT': parsed.port or '5432',
        }
    if scheme == 'sqlite':
        # sqlite:///path/to/db.sqlite3 or sqlite:///:memory:
        path = parsed.path
        name = ':memory:' if path == '/:memory:' else (path if path else str(BASE_DIR / 'db.sqlite3'))
        return {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': name,
        }
    # Fallback to sqlite
    return {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': str(BASE_DIR / 'db.sqlite3'),
    }

DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{BASE_DIR / "db.sqlite3"}')
DATABASES = {
    'default': _db_from_url(DATABASE_URL)
}

# Prevent SQLite in production
if not DEBUG and DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3':
    raise ValueError("SQLite database is not allowed in production. Please use PostgreSQL.")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
# Use FORCE_SCRIPT_NAME for subpath deployment (e.g., /cfowise)
FORCE_SCRIPT_NAME = os.environ.get("FORCE_SCRIPT_NAME", "")
STATIC_URL = f"{FORCE_SCRIPT_NAME}/static/" if FORCE_SCRIPT_NAME else "/static/"
STATIC_ROOT = os.environ.get("STATIC_ROOT", str(BASE_DIR / "staticfiles"))

# Media files
MEDIA_URL = f"{FORCE_SCRIPT_NAME}/media/" if FORCE_SCRIPT_NAME else "/media/"
MEDIA_ROOT = os.environ.get("MEDIA_ROOT", str(BASE_DIR / "media"))

# Custom user model
AUTH_USER_MODEL = "accounts.User"

# DRF / Auth
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ),
    "EXCEPTION_HANDLER": "cfowise.exception_handler.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

# Disable browsable API in production
if not DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = ("rest_framework.renderers.JSONRenderer",)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
}

# CORS Configuration
CORS_ALLOW_CREDENTIALS = True

if DEBUG:
    # Development: allow all origins
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:5173",
    ]
else:
    # Production: only allow specific origins from environment
    CORS_ALLOW_ALL_ORIGINS = False
    cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "")
    if cors_origins:
        CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    else:
        CORS_ALLOWED_ORIGINS = []

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# CSRF Configuration
# CSRF_TRUSTED_ORIGINS is required for Django 4.0+ to prevent CSRF errors
# Format: ['https://example.com', 'http://localhost:8000']
csrf_trusted_origins_str = os.environ.get("CSRF_TRUSTED_ORIGINS", "")
if csrf_trusted_origins_str:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_trusted_origins_str.split(",") if origin.strip()]
elif DEBUG:
    # In development, allow common localhost origins
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]
else:
    # In production, CSRF_TRUSTED_ORIGINS should be set via environment variable
    CSRF_TRUSTED_ORIGINS = []

# CSRF Cookie Settings
CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False  # Must be False for JavaScript to access
CSRF_USE_SESSIONS = False  # Use cookies (default)
CSRF_COOKIE_SAMESITE = "Lax"  # Allows CSRF cookie to be sent in top-level navigations

# Session Cookie Settings (for consistency with CSRF)
SESSION_COOKIE_NAME = "sessionid"
SESSION_COOKIE_SAMESITE = "Lax"

# CSRF Cookie Path (for subpath deployment support)
if FORCE_SCRIPT_NAME:
    CSRF_COOKIE_PATH = FORCE_SCRIPT_NAME + "/"
    SESSION_COOKIE_PATH = FORCE_SCRIPT_NAME + "/"

# Security Settings (Production)
if not DEBUG:
    # HTTPS Settings
    SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True") == "True"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Security Headers
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = "DENY"
    
    # Additional Security
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    
    # Request size limits (prevent DoS)
    DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
    FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
    DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000
else:
    # Development: allow insecure cookies for HTTP
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# Logging Configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.environ.get("LOG_FILE", str(BASE_DIR / "logs" / "django.log")),
            "maxBytes": 1024 * 1024 * 10,  # 10 MB
            "backupCount": 5,
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console", "file"] if not DEBUG else ["console"],
        "level": "INFO" if not DEBUG else "DEBUG",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"] if not DEBUG else ["console"],
            "level": "INFO" if not DEBUG else "DEBUG",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "file"] if not DEBUG else ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

# Ensure log directory exists
import logging
log_dir = Path(LOGGING["handlers"]["file"]["filename"]).parent
log_dir.mkdir(parents=True, exist_ok=True)

# Email Configuration
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True") == "True"
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "False") == "True"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@example.com")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# PRS Completion Email
PRS_COMPLETION_EMAIL = os.environ.get("PRS_COMPLETION_EMAIL", "")
