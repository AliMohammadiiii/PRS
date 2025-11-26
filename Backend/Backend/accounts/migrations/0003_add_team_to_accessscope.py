# Generated manually for PRS models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_accessscope'),
        ('teams', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='accessscope',
            name='team',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='user_access_scopes', to='teams.team'),
        ),
        migrations.AlterUniqueTogether(
            name='accessscope',
            unique_together={('user', 'org_node', 'role'), ('user', 'team', 'role')},
        ),
    ]


