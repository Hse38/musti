from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.audit.utils import write_audit
from apps.competitions.models import Competition, Participant, Team
from apps.validation.models import ReportTemplate, ValidationRule

from core.permissions import IsOperator, IsSuperAdmin

from .models import ModuleConfig
from .serializers import (
    CompetitionSerializer,
    ModuleConfigSerializer,
    ParticipantSerializer,
    ReportTemplateSerializer,
    TeamSerializer,
    UserAdminSerializer,
    ValidationRuleSerializer,
)

User = get_user_model()


class AdminAuthMixin:
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsOperator]


class RuleListView(AdminAuthMixin, APIView):
    def get(self, request):
        qs = ValidationRule.objects.all().order_by("priority", "id")
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(category=cat)
        return Response(ValidationRuleSerializer(qs, many=True).data)


class RuleCategoriesView(AdminAuthMixin, APIView):
    def get(self, request):
        return Response(
            [{"value": c[0], "label": c[1]} for c in ValidationRule.CATEGORY_CHOICES]
        )


class RulePatchView(AdminAuthMixin, APIView):
    def patch(self, request, pk):
        rule = get_object_or_404(ValidationRule, pk=pk)
        old = {
            "is_active": rule.is_active,
            "priority": rule.priority,
            "config": rule.config,
        }
        for field in ("is_active", "priority", "config", "is_blocking"):
            if field in request.data:
                setattr(rule, field, request.data[field])
        rule.save()
        write_audit(
            request.user,
            "rule.patch",
            "ValidationRule",
            str(rule.pk),
            old,
            {
                "is_active": rule.is_active,
                "priority": rule.priority,
                "config": rule.config,
                "is_blocking": rule.is_blocking,
            },
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ValidationRuleSerializer(rule).data)


class ModuleListView(AdminAuthMixin, APIView):
    def get(self, request):
        qs = ModuleConfig.objects.all().order_by("name")
        return Response(ModuleConfigSerializer(qs, many=True).data)


class ModulePatchView(AdminAuthMixin, APIView):
    def patch(self, request, name):
        mod = get_object_or_404(ModuleConfig, name=name)
        old = {"is_active": mod.is_active, "config": mod.config}
        if "is_active" in request.data:
            mod.is_active = bool(request.data["is_active"])
        if "config" in request.data:
            merged = {**(mod.config or {}), **request.data["config"]}
            mod.config = merged
        mod.updated_by = request.user
        mod.save()
        write_audit(
            request.user,
            "module.enable" if mod.is_active else "module.disable",
            "ModuleConfig",
            mod.name,
            old,
            {"is_active": mod.is_active, "config": mod.config},
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ModuleConfigSerializer(mod).data)


class CompetitionListCreateView(AdminAuthMixin, APIView):
    def get(self, request):
        return Response(
            CompetitionSerializer(Competition.objects.all(), many=True).data
        )

    def post(self, request):
        ser = CompetitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        c = ser.save()
        write_audit(
            request.user,
            "competition.create",
            "Competition",
            str(c.pk),
            None,
            ser.data,
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ser.data, status=status.HTTP_201_CREATED)


class CompetitionDetailView(AdminAuthMixin, APIView):
    def get(self, request, pk):
        c = get_object_or_404(Competition, pk=pk)
        return Response(CompetitionSerializer(c).data)

    def put(self, request, pk):
        c = get_object_or_404(Competition, pk=pk)
        ser = CompetitionSerializer(c, data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        write_audit(
            request.user,
            "competition.update",
            "Competition",
            str(c.pk),
            None,
            ser.data,
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ser.data)

    def delete(self, request, pk):
        c = get_object_or_404(Competition, pk=pk)
        write_audit(
            request.user,
            "competition.delete",
            "Competition",
            str(c.pk),
            None,
            None,
            request.META.get("REMOTE_ADDR"),
        )
        c.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamListCreateView(AdminAuthMixin, APIView):
    def get(self, request, competition_id):
        qs = Team.objects.filter(competition_id=competition_id)
        return Response(TeamSerializer(qs, many=True).data)

    def post(self, request, competition_id):
        comp = get_object_or_404(Competition, pk=competition_id)
        data = {**request.data, "competition": comp.pk}
        ser = TeamSerializer(data=data)
        ser.is_valid(raise_exception=True)
        t = ser.save()
        write_audit(
            request.user,
            "team.create",
            "Team",
            str(t.pk),
            None,
            ser.data,
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ser.data, status=status.HTTP_201_CREATED)


class ParticipantListCreateView(AdminAuthMixin, APIView):
    def get(self, request, team_id):
        qs = Participant.objects.filter(team_id=team_id)
        return Response(ParticipantSerializer(qs, many=True).data)

    def post(self, request, team_id):
        team = get_object_or_404(Team, pk=team_id)
        data = {**request.data, "team": team.pk}
        ser = ParticipantSerializer(data=data)
        ser.is_valid(raise_exception=True)
        p = ser.save()
        write_audit(
            request.user,
            "participant.create",
            "Participant",
            str(p.pk),
            None,
            ser.data,
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ser.data, status=status.HTTP_201_CREATED)


class ParticipantDetailView(AdminAuthMixin, APIView):
    def put(self, request, pk):
        p = get_object_or_404(Participant, pk=pk)
        ser = ParticipantSerializer(p, data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        write_audit(
            request.user,
            "participant.update",
            "Participant",
            str(p.pk),
            None,
            ser.data,
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ser.data)

    def delete(self, request, pk):
        p = get_object_or_404(Participant, pk=pk)
        write_audit(
            request.user,
            "participant.delete",
            "Participant",
            str(p.pk),
            None,
            None,
            request.META.get("REMOTE_ADDR"),
        )
        p.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportTemplateListCreateView(AdminAuthMixin, APIView):
    def get(self, request):
        qs = ReportTemplate.objects.all()
        return Response(ReportTemplateSerializer(qs, many=True).data)

    def post(self, request):
        ser = ReportTemplateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        t = ser.save(created_by=request.user)
        return Response(ReportTemplateSerializer(t).data, status=status.HTTP_201_CREATED)


class ReportTemplateSetDefaultView(AdminAuthMixin, APIView):
    def patch(self, request, pk):
        tpl = get_object_or_404(ReportTemplate, pk=pk)
        ReportTemplate.objects.filter(report_type=tpl.report_type).update(
            is_default=False
        )
        tpl.is_default = True
        tpl.save(update_fields=["is_default"])
        write_audit(
            request.user,
            "report_template.default",
            "ReportTemplate",
            str(tpl.pk),
            None,
            {"is_default": True},
            request.META.get("REMOTE_ADDR"),
        )
        return Response(ReportTemplateSerializer(tpl).data)


class UserListCreateView(AdminAuthMixin, APIView):
    def get(self, request):
        return Response(UserAdminSerializer(User.objects.all(), many=True).data)

    def post(self, request):
        from apps.accounts.serializers import UserCreateSerializer

        ser = UserCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        u = ser.save()
        write_audit(
            request.user,
            "user.create",
            "User",
            str(u.pk),
            None,
            {"username": u.username, "role": u.role},
            request.META.get("REMOTE_ADDR"),
        )
        return Response(UserAdminSerializer(u).data, status=status.HTTP_201_CREATED)


class UserRolePatchView(AdminAuthMixin, APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, pk):
        u = get_object_or_404(User, pk=pk)
        old = u.role
        u.role = request.data.get("role", u.role)
        u.save(update_fields=["role"])
        write_audit(
            request.user,
            "user.role",
            "User",
            str(u.pk),
            {"role": old},
            {"role": u.role},
            request.META.get("REMOTE_ADDR"),
        )
        return Response(UserAdminSerializer(u).data)


class AuditLogListView(AdminAuthMixin, APIView):
    def get(self, request):
        from apps.audit.models import AuditLog

        qs = AuditLog.objects.select_related("user").all()
        uid = request.query_params.get("user_id")
        if uid:
            qs = qs.filter(user_id=uid)
        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action__icontains=action)
        data = []
        for log in qs[:500]:
            data.append(
                {
                    "id": log.pk,
                    "user": log.user.username if log.user else None,
                    "action": log.action,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "old_value": log.old_value,
                    "new_value": log.new_value,
                    "created_at": log.created_at.isoformat(),
                }
            )
        return Response(data)


class AdminDashboardView(AdminAuthMixin, APIView):
    def get(self, request):
        from apps.tickets.models import AnalysisSession
        from core.module_registry import ModuleRegistry

        sessions = AnalysisSession.objects.all()
        total = sessions.count()
        last5 = sessions.order_by("-created_at")[:5]
        subs_approved = 0
        subs_rejected = 0
        for s in sessions:
            summ = s.summary or {}
            subs_approved += int(summ.get("approved", 0) or 0)
            subs_rejected += int(summ.get("rejected", 0) or 0)
        active_modules = sum(
            1 for n in ModuleRegistry._modules if ModuleConfig.objects.filter(name=n, is_active=True).exists()
        )
        db_ok = True
        try:
            Competition.objects.count()
        except Exception:
            db_ok = False
        mod_health = []
        for name, m in ModuleRegistry.get_all().items():
            cfg = ModuleConfig.objects.filter(name=name).first()
            mod_health.append(
                {
                    "name": name,
                    "active": cfg.is_active if cfg else False,
                    "health": m.health_check(),
                }
            )
        return Response(
            {
                "totals": {
                    "sessions": total,
                    "approved_submissions": subs_approved,
                    "rejected_submissions": subs_rejected,
                    "active_modules": active_modules,
                },
                "recent_sessions": [
                    {
                        "id": str(s.id),
                        "status": s.status,
                        "created_at": s.created_at.isoformat(),
                        "summary": s.summary,
                    }
                    for s in last5
                ],
                "health": {"database": db_ok, "modules": mod_health},
            }
        )


class TeamDetailView(AdminAuthMixin, APIView):
    def put(self, request, pk):
        t = get_object_or_404(Team, pk=pk)
        ser = TeamSerializer(t, data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        t = get_object_or_404(Team, pk=pk)
        t.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
