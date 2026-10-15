from django.urls import path

from .admin_views import CallAnswerView, CallListView

app_name = "matching_admin"

urlpatterns = [
    path("call-list/", CallListView.as_view(), name="call-list"),
    path("call-list/<uuid:pk>/answer/", CallAnswerView.as_view(), name="call-answer"),
]
