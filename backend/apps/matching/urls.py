from django.urls import path

from .views import ApplyView, MyApplicationsView

app_name = "matching"

urlpatterns = [
    path("tutors/me/applications/", MyApplicationsView.as_view(), name="my-applications"),
    path("tutors/me/apply/<uuid:requirement_id>/", ApplyView.as_view(), name="apply"),
]
