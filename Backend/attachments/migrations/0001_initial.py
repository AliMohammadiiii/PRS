# Generated manually for PRS models

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('purchase_requests', '0001_initial'),
        ('teams', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttachmentCategory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=128)),
                ('required', models.BooleanField(default=False, help_text='If True, at least one attachment of this category is required on submission')),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachment_categories', to='teams.team')),
            ],
            options={
                'ordering': ['team', 'name'],
                'unique_together': {('team', 'name')},
                'indexes': [
                    models.Index(fields=['team', 'is_active'], name='attachment_team_id_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='Attachment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('filename', models.CharField(help_text='Original filename', max_length=255)),
                ('file_path', models.FileField(upload_to='request_attachments/', validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png', 'docx'])])),
                ('file_size', models.PositiveIntegerField(help_text='File size in bytes')),
                ('file_type', models.CharField(help_text='MIME type or file extension', max_length=32)),
                ('upload_date', models.DateTimeField(auto_now_add=True)),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attachments', to='attachments.attachmentcategory')),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='purchase_requests.purchaserequest')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_attachments', to='accounts.user')),
            ],
            options={
                'ordering': ['request', '-upload_date'],
                'indexes': [
                    models.Index(fields=['request', 'category'], name='attachment_request_idx'),
                    models.Index(fields=['request', 'upload_date'], name='attachment_request_2_idx'),
                ],
            },
        ),
    ]


