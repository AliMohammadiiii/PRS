"""
URL configuration for ui_config app.
"""
from django.urls import path
from ui_config.views import UiModeView

urlpatterns = [
    path("ui-mode/", UiModeView.as_view(), name="ui-mode"),
]



