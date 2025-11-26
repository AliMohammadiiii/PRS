from pathlib import Path
from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    name = "workflows"
    verbose_name = "Workflows"
    path = str(Path(__file__).resolve().parent)


