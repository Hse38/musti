from django.urls import path

from . import views

urlpatterns = [
    path("auth/magic-link/request/", views.MagicLinkRequestView.as_view()),
    path("auth/magic-link/verify/", views.MagicLinkVerifyView.as_view()),
    path("auth/login/", views.TCTeamLoginView.as_view()),
    path("me/", views.MeView.as_view()),
    path("me/status/", views.MeStatusView.as_view()),
    path("transport/select/", views.TransportSelectView.as_view()),
    path("transport/details/", views.TransportDetailsView.as_view()),
    path("invoices/upload/", views.InvoiceUploadView.as_view()),
    path("invoices/", views.InvoiceListView.as_view()),
    path("faq/ask/", views.FAQAskView.as_view()),
    path("faq/history/", views.FAQHistoryView.as_view()),
    path("captain/team/", views.CaptainTeamView.as_view()),
    path("captain/upload-invoice/", views.CaptainUploadInvoiceView.as_view()),
]
