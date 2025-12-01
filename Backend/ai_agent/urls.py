"""
URL routes for ai_agent app.
"""
from django.urls import path
from .views import (
    ChatThreadListView,
    ChatThreadDetailView,
    ChatMessageListView,
    RunOrchestratorView,
)

urlpatterns = [
    path("threads/", ChatThreadListView.as_view(), name="chat-thread-list"),
    path("threads/<uuid:thread_id>/", ChatThreadDetailView.as_view(), name="chat-thread-detail"),
    path("threads/<uuid:thread_id>/messages/", ChatMessageListView.as_view(), name="chat-message-list-create"),
    path("threads/<uuid:thread_id>/run/", RunOrchestratorView.as_view(), name="run-orchestrator"),
]

