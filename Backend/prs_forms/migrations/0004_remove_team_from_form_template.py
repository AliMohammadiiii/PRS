# Generated for making FormTemplate team-agnostic

from django.db import migrations, models
import django.db.models.deletion


def ensure_template_names(apps, schema_editor):
    """
    Data migration: Ensure all FormTemplate instances have a name.
    If name is empty or None, generate one based on team and version.
    """
    FormTemplate = apps.get_model('prs_forms', 'FormTemplate')
    Team = apps.get_model('teams', 'Team')
    
    for template in FormTemplate.objects.all():
        if not template.name or template.name.strip() == '':
            # Try to get team name for generating a default name
            try:
                team = Team.objects.get(pk=template.team_id)
                template.name = f'{team.name}_Template_v{template.version_number}'
            except Team.DoesNotExist:
                template.name = f'Template_v{template.version_number}'
            template.save()


class Migration(migrations.Migration):

    dependencies = [
        ('prs_forms', '0003_formtemplate_name'),
        ('teams', '0001_initial'),
    ]

    operations = [
        # First, ensure all templates have names (data migration)
        migrations.RunPython(ensure_template_names, migrations.RunPython.noop),
        # Remove team-related indexes (using names from migration 0002)
        migrations.RemoveIndex(
            model_name='formtemplate',
            name='prs_forms_f_team_id_3eb2c2_idx',
        ),
        migrations.RemoveIndex(
            model_name='formtemplate',
            name='prs_forms_f_team_id_9657e4_idx',
        ),
        # Remove unique_together constraint
        migrations.AlterUniqueTogether(
            name='formtemplate',
            unique_together=set(),
        ),
        # Make name field required (remove blank=True)
        migrations.AlterField(
            model_name='formtemplate',
            name='name',
            field=models.CharField(help_text='Name for the template', max_length=128),
        ),
        # Remove team field
        migrations.RemoveField(
            model_name='formtemplate',
            name='team',
        ),
        # Add new unique_together constraint on (name, version_number)
        migrations.AlterUniqueTogether(
            name='formtemplate',
            unique_together={('name', 'version_number')},
        ),
        # Add new indexes based on name
        migrations.AddIndex(
            model_name='formtemplate',
            index=models.Index(fields=['name', 'version_number'], name='prs_forms_formtem_name_ver_idx'),
        ),
        migrations.AddIndex(
            model_name='formtemplate',
            index=models.Index(fields=['name', 'is_active'], name='prs_forms_formtem_name_active_idx'),
        ),
        # Update ordering
        migrations.AlterModelOptions(
            name='formtemplate',
            options={'ordering': ['name', '-version_number']},
        ),
    ]

