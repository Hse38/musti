from rest_framework.exceptions import APIException
from rest_framework import status


class ServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Servis geçici olarak kullanılamıyor."
    default_code = "service_unavailable"


class ValidationProcessingError(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Doğrulama işlenemedi."
    default_code = "validation_error"
