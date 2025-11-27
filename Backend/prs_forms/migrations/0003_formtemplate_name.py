# Generated for PRS multi-template support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('prs_forms', '0002_rename_prs_forms_formfie_templat_idx_prs_forms_f_templat_7eb318_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='formtemplate',
            name='name',
            field=models.CharField(blank=True, help_text='Optional name for the template', max_length=128, default=''),
            preserve_default=False,
        ),
    ]


