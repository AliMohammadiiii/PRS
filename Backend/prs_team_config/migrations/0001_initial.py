# Initial migration for prs_team_config app

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('teams', '0001_initial'),
        ('classifications', '0001_initial'),
        ('prs_forms', '0003_formtemplate_name'),
        ('workflows', '0006_migrate_workflow_to_template'),
    ]

    operations = [
        migrations.CreateModel(
            name='TeamPurchaseConfig',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('team', models.ForeignKey(
                    help_text='Team this configuration applies to',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='purchase_configs',
                    to='teams.team',
                )),
                ('purchase_type', models.ForeignKey(
                    help_text='Purchase type (e.g., GOODS, SERVICE) from PURCHASE_TYPE lookups',
                    limit_choices_to={'type__code': 'PURCHASE_TYPE'},
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='team_purchase_configs',
                    to='classifications.lookup',
                )),
                ('form_template', models.ForeignKey(
                    help_text='Form template to use for this team + purchase type combination',
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='team_purchase_configs',
                    to='prs_forms.formtemplate',
                )),
                ('workflow_template', models.ForeignKey(
                    help_text='Workflow template to use for this team + purchase type combination',
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='team_purchase_configs',
                    to='workflows.workflowtemplate',
                )),
            ],
            options={
                'verbose_name': 'Team Purchase Configuration',
                'verbose_name_plural': 'Team Purchase Configurations',
                'ordering': ['team', 'purchase_type'],
            },
        ),
        migrations.AddIndex(
            model_name='teampurchaseconfig',
            index=models.Index(fields=['team', 'purchase_type', 'is_active'], name='prs_team_co_team_purchase_idx'),
        ),
        migrations.AddIndex(
            model_name='teampurchaseconfig',
            index=models.Index(fields=['team', 'is_active'], name='prs_team_co_team_active_idx'),
        ),
    ]


