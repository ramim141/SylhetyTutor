from django.urls import path

from .admin_views import PaymentDecisionView, PaymentListView

app_name = "payments_admin"

urlpatterns = [
    path("payments/", PaymentListView.as_view(), name="payments"),
    path("payments/<uuid:pk>/verify/", PaymentDecisionView.as_view(action="verify"), name="verify"),
    path("payments/<uuid:pk>/reject/", PaymentDecisionView.as_view(action="reject"), name="reject"),
]
