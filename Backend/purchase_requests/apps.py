from pathlib import Path
from django.apps import AppConfig


class PurchaseRequestsConfig(AppConfig):
    name = "purchase_requests"
    verbose_name = "Purchase Requests"
    path = str(Path(__file__).resolve().parent)

