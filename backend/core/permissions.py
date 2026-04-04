from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", None) == "superadmin")


class IsOperator(BasePermission):
    """Süper admin veya operatör."""

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        return getattr(u, "role", None) in ("superadmin", "operator")


class IsViewerOrAbove(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated)
