from django.contrib import admin

from .models import Area, ClassLevel, Subject, University


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_bn", "slug", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name_en", "name_bn", "slug")
    prepopulated_fields = {"slug": ("name_en",)}
    ordering = ("sort_order", "name_en")


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_bn", "slug", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name_en", "name_bn", "slug")
    prepopulated_fields = {"slug": ("name_en",)}
    ordering = ("sort_order", "name_en")


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_bn", "slug", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name_en", "name_bn", "slug")
    prepopulated_fields = {"slug": ("name_en",)}
    ordering = ("sort_order", "name_en")


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ("name_en", "short_name", "name_bn", "slug", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name_en", "name_bn", "short_name", "slug")
    prepopulated_fields = {"slug": ("name_en",)}
    ordering = ("sort_order", "name_en")
