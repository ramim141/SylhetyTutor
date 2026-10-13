from django.urls import path

from .views import (
    GuardianMeView,
    MatchingDetailView,
    MatchingListView,
    RequirementCloseView,
    RequirementDetailView,
    RequirementListView,
    RequirementPublishView,
)

app_name = "guardians"

urlpatterns = [
    path("guardians/me/", GuardianMeView.as_view(), name="me"),
    path("requirements/", RequirementListView.as_view(), name="requirements"),
    path("requirements/matching/", MatchingListView.as_view(), name="matching"),
    path("requirements/matching/<uuid:pk>/", MatchingDetailView.as_view(), name="matching-detail"),
    path("requirements/<uuid:pk>/", RequirementDetailView.as_view(), name="requirement"),
    path("requirements/<uuid:pk>/publish/", RequirementPublishView.as_view(), name="publish"),
    path("requirements/<uuid:pk>/close/", RequirementCloseView.as_view(), name="close"),
]
