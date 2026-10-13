from django.urls import path

from .views import (
    AreaListView,
    ClassLevelListView,
    LookupsGroupedView,
    SubjectListView,
    UniversityListView,
)

app_name = "lookups"

urlpatterns = [
    path("", LookupsGroupedView.as_view(), name="grouped"),
    path("areas/", AreaListView.as_view(), name="areas-list"),
    path("subjects/", SubjectListView.as_view(), name="subjects-list"),
    path("class-levels/", ClassLevelListView.as_view(), name="class-levels-list"),
    path("universities/", UniversityListView.as_view(), name="universities-list"),
]
