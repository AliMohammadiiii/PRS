from pathlib import Path
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = "accounts"
    verbose_name = "Accounts"
    path = str(Path(__file__).resolve().parent)









