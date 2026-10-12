from django.urls import path

from .views import TutorListView, TutorMeView, TutorSubmitView

app_name = "tutors"

urlpatterns = [
    path("", TutorListView.as_view(), name="list"),
    path("me/", TutorMeView.as_view(), name="me"),
    path("me/submit/", TutorSubmitView.as_view(), name="submit"),
]
