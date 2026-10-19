from django.urls import path

from .views import CreateReplacementRequestView, CreateReportView

urlpatterns = [
    path("reports/", CreateReportView.as_view(), name="safety-create-report"),
    path(
        "matches/<uuid:match_id>/replace/",
        CreateReplacementRequestView.as_view(),
        name="safety-create-replacement",
    ),
]
