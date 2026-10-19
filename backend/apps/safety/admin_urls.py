from django.urls import path

from .views import (
    AdminReplacementListView,
    AdminReplacementResolveView,
    AdminReportListView,
    AdminReportResolveView,
    AdminReportSuspendTutorView,
)

urlpatterns = [
    path("reports/", AdminReportListView.as_view(), name="admin-reports-list"),
    path(
        "reports/<uuid:pk>/resolve/",
        AdminReportResolveView.as_view(),
        name="admin-reports-resolve",
    ),
    path(
        "reports/<uuid:pk>/suspend-tutor/",
        AdminReportSuspendTutorView.as_view(),
        name="admin-reports-suspend-tutor",
    ),
    path(
        "replacements/",
        AdminReplacementListView.as_view(),
        name="admin-replacements-list",
    ),
    path(
        "replacements/<uuid:pk>/resolve/",
        AdminReplacementResolveView.as_view(),
        name="admin-replacements-resolve",
    ),
]
