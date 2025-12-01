from pathlib import Path
from django.apps import AppConfig


class AiAgentConfig(AppConfig):
    name = "ai_agent"
    verbose_name = "AI Agent"
    path = str(Path(__file__).resolve().parent)





