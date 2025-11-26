# Generated manually for PRS models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('teams', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='FormTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('version_number', models.PositiveIntegerField(default=1)),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='form_templates', to='teams.team')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_form_templates', to='accounts.user')),
            ],
            options={
                'ordering': ['team', '-version_number'],
                'unique_together': {('team', 'version_number')},
                'indexes': [
                    models.Index(fields=['team', 'version_number'], name='prs_forms_formtem_team_id_idx'),
                    models.Index(fields=['team', 'is_active'], name='prs_forms_formtem_team_id_2_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='FormField',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('field_id', models.CharField(max_length=64)),
                ('name', models.CharField(max_length=128)),
                ('label', models.CharField(max_length=128)),
                ('field_type', models.CharField(choices=[('TEXT', 'Text'), ('NUMBER', 'Number'), ('DATE', 'Date'), ('BOOLEAN', 'Boolean'), ('DROPDOWN', 'Dropdown'), ('FILE_UPLOAD', 'File Upload')], max_length=16)),
                ('required', models.BooleanField(default=False)),
                ('order', models.PositiveIntegerField(default=0)),
                ('default_value', models.TextField(blank=True, null=True)),
                ('validation_rules', models.JSONField(blank=True, default=dict)),
                ('help_text', models.TextField(blank=True, null=True)),
                ('dropdown_options', models.JSONField(blank=True, default=list, null=True)),
                ('template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fields', to='prs_forms.formtemplate')),
            ],
            options={
                'ordering': ['template', 'order'],
                'unique_together': {('template', 'field_id')},
                'indexes': [
                    models.Index(fields=['template', 'field_id'], name='prs_forms_formfie_templat_idx'),
                    models.Index(fields=['template', 'order'], name='prs_forms_formfie_templat_2_idx'),
                ],
            },
        ),
    ]
