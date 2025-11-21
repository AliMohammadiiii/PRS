import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cfowise.settings")

# Get FORCE_SCRIPT_NAME from environment for subpath deployment
_application = get_wsgi_application()

def application(environ, start_response):
    # Set SCRIPT_NAME from environment variable if provided
    script_name = os.environ.get("FORCE_SCRIPT_NAME", "")
    if script_name:
        environ["SCRIPT_NAME"] = script_name
    return _application(environ, start_response)






