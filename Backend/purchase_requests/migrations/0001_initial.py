# Generated manually for PRS models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('workflows', '0001_initial'),
        ('teams', '0001_initial'),
        ('prs_forms', '0001_initial'),
        ('classifications', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PurchaseRequest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('vendor_name', models.CharField(max_length=255)),
                ('vendor_account', models.CharField(help_text='Bank account details or IBAN for payment', max_length=128)),
                ('subject', models.CharField(max_length=200)),
                ('description', models.TextField(max_length=2000)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('rejection_comment', models.TextField(blank=True, help_text='Latest rejection comment. Full history in ApprovalHistory.', null=True)),
                ('requestor', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='purchase_requests', to='accounts.user')),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='purchase_requests', to='teams.team')),
                ('form_template', models.ForeignKey(help_text='Form template version used when this request was created', on_delete=django.db.models.deletion.PROTECT, related_name='purchase_requests', to='prs_forms.formtemplate')),
                ('status', models.ForeignKey(limit_choices_to={'type__code': 'REQUEST_STATUS'}, on_delete=django.db.models.deletion.PROTECT, related_name='purchase_requests', to='classifications.lookup')),
                ('current_step', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='current_requests', to='workflows.workflowstep')),
                ('purchase_type', models.ForeignKey(limit_choices_to={'type__code': 'PURCHASE_TYPE'}, on_delete=django.db.models.deletion.PROTECT, related_name='purchase_requests_by_type', to='classifications.lookup')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['status', 'team'], name='purchase_r_status__idx'),
                    models.Index(fields=['requestor', 'created_at'], name='purchase_r_request_idx'),
                    models.Index(fields=['team', 'created_at'], name='purchase_r_team_id_idx'),
                    models.Index(fields=['status', 'created_at'], name='purchase_r_status__2_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='RequestFieldValue',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('value_number', models.DecimalField(blank=True, decimal_places=4, max_digits=20, null=True)),
                ('value_text', models.TextField(blank=True, null=True)),
                ('value_bool', models.BooleanField(blank=True, null=True)),
                ('value_date', models.DateField(blank=True, null=True)),
                ('value_dropdown', models.JSONField(blank=True, help_text='Stores selected dropdown option value', null=True)),
                ('field', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='request_values', to='prs_forms.formfield')),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='field_values', to='purchase_requests.purchaserequest')),
            ],
            options={
                'unique_together': {('request', 'field')},
                'indexes': [
                    models.Index(fields=['request', 'field'], name='purchase_r_request_2_idx'),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name='requestfieldvalue',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(('value_number__isnull', True)) | models.Q(('value_text__isnull', True))
                ) & (
                    models.Q(('value_number__isnull', True)) | models.Q(('value_bool__isnull', True))
                ) & (
                    models.Q(('value_number__isnull', True)) | models.Q(('value_date__isnull', True))
                ) & (
                    models.Q(('value_number__isnull', True)) | models.Q(('value_dropdown__isnull', True))
                ) & (
                    models.Q(('value_text__isnull', True)) | models.Q(('value_bool__isnull', True))
                ) & (
                    models.Q(('value_text__isnull', True)) | models.Q(('value_date__isnull', True))
                ) & (
                    models.Q(('value_text__isnull', True)) | models.Q(('value_dropdown__isnull', True))
                ) & (
                    models.Q(('value_bool__isnull', True)) | models.Q(('value_date__isnull', True))
                ) & (
                    models.Q(('value_bool__isnull', True)) | models.Q(('value_dropdown__isnull', True))
                ) & (
                    models.Q(('value_date__isnull', True)) | models.Q(('value_dropdown__isnull', True))
                ),
                name='single_value_column',
            ),
        ),
    ]
