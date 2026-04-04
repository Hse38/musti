from django.contrib import admin

from .models import Competition, Participant, Team


class ParticipantInline(admin.TabularInline):
    model = Participant
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "team_code", "competition")
    inlines = [ParticipantInline]


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "start_date", "end_date", "is_active")
    prepopulated_fields = {"slug": ("name",)}
