from django.urls import path

from .views import (
    MyCommissionsView,
    MyPaymentsView,
    PayCommissionView,
    PaymentInfoView,
    PayUnlockView,
)

app_name = "payments"

urlpatterns = [
    path("payments/info/", PaymentInfoView.as_view(), name="info"),
    path("tutors/me/payments/", MyPaymentsView.as_view(), name="mine"),
    path(
        "tutors/me/applications/<uuid:pk>/pay-unlock/", PayUnlockView.as_view(), name="pay-unlock"
    ),
    path("tutors/me/commissions/", MyCommissionsView.as_view(), name="my-commissions"),
    path(
        "tutors/me/commissions/<uuid:pk>/pay/", PayCommissionView.as_view(), name="pay-commission"
    ),
]
