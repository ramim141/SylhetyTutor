from django.urls import path

from .views import (
    ApplicationDecisionView,
    ApplyView,
    BookDemoView,
    MyApplicationsView,
    RequirementApplicantsView,
)

app_name = "matching"

urlpatterns = [
    path("tutors/me/applications/", MyApplicationsView.as_view(), name="my-applications"),
    path("tutors/me/apply/<uuid:requirement_id>/", ApplyView.as_view(), name="apply"),
    path(
        "requirements/<uuid:pk>/applications/",
        RequirementApplicantsView.as_view(),
        name="applicants",
    ),
    path(
        "applications/<uuid:pk>/shortlist/",
        ApplicationDecisionView.as_view(action="shortlist"),
        name="shortlist",
    ),
    path(
        "applications/<uuid:pk>/reject/",
        ApplicationDecisionView.as_view(action="reject"),
        name="reject",
    ),
    path("applications/<uuid:pk>/book-demo/", BookDemoView.as_view(), name="book-demo"),
]
