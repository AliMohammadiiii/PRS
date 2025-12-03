# Generated for making WorkflowTemplate team-agnostic

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '0007_rename_workflows_w_team_is_active_idx_workflows_w_team_id_04f710_idx_and_more'),
    ]

    operations = [
        # Remove team-related indexes first
        migrations.RemoveIndex(
            model_name='workflowtemplate',
            name='workflows_w_team_id_04f710_idx',
        ),
        migrations.RemoveIndex(
            model_name='workflowtemplate',
            name='workflows_w_team_id_74238a_idx',
        ),
        # Remove unique_together constraint
        migrations.AlterUniqueTogether(
            name='workflowtemplate',
            unique_together=set(),
        ),
        # Remove team field
        migrations.RemoveField(
            model_name='workflowtemplate',
            name='team',
        ),
        # Add new unique_together constraint on (name, version_number)
        migrations.AlterUniqueTogether(
            name='workflowtemplate',
            unique_together={('name', 'version_number')},
        ),
        # Add new indexes based on name
        migrations.AddIndex(
            model_name='workflowtemplate',
            index=models.Index(fields=['name', 'is_active'], name='workflows_w_name_active_idx'),
        ),
        migrations.AddIndex(
            model_name='workflowtemplate',
            index=models.Index(fields=['name', 'version_number'], name='workflows_w_name_ver_idx'),
        ),
        # Update ordering
        migrations.AlterModelOptions(
            name='workflowtemplate',
            options={'ordering': ['name', '-version_number']},
        ),
    ]










