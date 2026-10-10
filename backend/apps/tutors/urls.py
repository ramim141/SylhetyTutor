from django.urls import path

from .views import TutorListView

app_name = "tutors"

urlpatterns = [
    path("", TutorListView.as_view(), name="list"),
]
