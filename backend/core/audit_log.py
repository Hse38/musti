from apps.audit.models import AuditLog


def log_action(
    *,
    user,
    action: str,
    target_type: str,
    target_id: str,
    new_value=None,
    old_value=None,
):
    AuditLog.objects.create(
        user=user if user and getattr(user, "is_authenticated", False) else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id)[:100],
        new_value=new_value,
        old_value=old_value,
    )
