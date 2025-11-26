from pathlib import Path
from django.apps import AppConfig


class AttachmentsConfig(AppConfig):
    name = "attachments"
    verbose_name = "Attachments"
    path = str(Path(__file__).resolve().parent)


