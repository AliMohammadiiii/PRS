# Generated manually for PRS models

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Team',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=128, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
            ],
            options={
                'ordering': ['name'],
                'indexes': [
                    models.Index(fields=['is_active', 'name'], name='teams_team_is_acti_idx'),
                ],
            },
        ),
    ]


