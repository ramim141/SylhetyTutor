from django.urls import path

from .admin_views import (
    CommissionDecisionView,
    CommissionListView,
    PaymentDecisionView,
    PaymentListView,
)

app_name = "payments_admin"

urlpatterns = [
    path("payments/", PaymentListView.as_view(), name="payments"),
    path("payments/<uuid:pk>/verify/", PaymentDecisionView.as_view(action="verify"), name="verify"),
    path("payments/<uuid:pk>/reject/", PaymentDecisionView.as_view(action="reject"), name="reject"),
    path("commissions/", CommissionListView.as_view(), name="commissions"),
    path(
        "commissions/<uuid:pk>/mark-paid/",
        CommissionDecisionView.as_view(action="mark_paid"),
        name="mark-paid",
    ),
    path(
        "commissions/<uuid:pk>/waive/", CommissionDecisionView.as_view(action="waive"), name="waive"
    ),
]
