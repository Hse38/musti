from .models import AuditLog


def write_audit(user, action: str, target_type: str, target_id: str, old=None, new=None, ip=None):
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id)[:100],
        old_value=old,
        new_value=new,
        ip_address=ip,
    )
