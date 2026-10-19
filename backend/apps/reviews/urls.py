from django.urls import path

from .views import (
    GuardianReviewStatusView,
    TutorReviewCreateView,
    TutorReviewListView,
)

urlpatterns = [
    path(
        "tutors/<slug:slug>/reviews/",
        TutorReviewListView.as_view(),
        name="tutor-reviews-list",
    ),
    path(
        "tutors/<slug:slug>/reviews/create/",
        TutorReviewCreateView.as_view(),
        name="tutor-reviews-create",
    ),
    path(
        "guardians/me/reviews/<slug:slug>/",
        GuardianReviewStatusView.as_view(),
        name="guardian-review-status",
    ),
]
