from django.urls import path

from .views import (
    DocumentDownloadView,
    TutorDetailView,
    TutorDocumentView,
    TutorListView,
    TutorMeView,
    TutorSubmitView,
)

app_name = "tutors"

urlpatterns = [
    path("", TutorListView.as_view(), name="list"),
    path("me/", TutorMeView.as_view(), name="me"),
    path("me/submit/", TutorSubmitView.as_view(), name="submit"),
    path("me/documents/<str:kind>/", TutorDocumentView.as_view(), name="my-document"),
    path(
        "documents/<uuid:profile_id>/<str:kind>/", DocumentDownloadView.as_view(), name="document"
    ),
    # Last: any other word under /tutors/ is a profile address (slugs.RESERVED keeps the above free)
    path("<slug:slug>/", TutorDetailView.as_view(), name="detail"),
]
