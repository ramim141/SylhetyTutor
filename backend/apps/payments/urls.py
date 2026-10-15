from django.urls import path

from .views import MyPaymentsView, PaymentInfoView, PayUnlockView

app_name = "payments"

urlpatterns = [
    path("payments/info/", PaymentInfoView.as_view(), name="info"),
    path("tutors/me/payments/", MyPaymentsView.as_view(), name="mine"),
    path(
        "tutors/me/applications/<uuid:pk>/pay-unlock/", PayUnlockView.as_view(), name="pay-unlock"
    ),
]
