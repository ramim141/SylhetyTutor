from django.urls import path

from .admin_views import ApprovalDetailView, ApprovalListView, ApproveView, RejectView

app_name = "tutor_admin"

urlpatterns = [
    path("approvals/", ApprovalListView.as_view(), name="approvals"),
    path("approvals/<uuid:profile_id>/", ApprovalDetailView.as_view(), name="approval"),
    path("approvals/<uuid:profile_id>/approve/", ApproveView.as_view(), name="approve"),
    path("approvals/<uuid:profile_id>/reject/", RejectView.as_view(), name="reject"),
]
