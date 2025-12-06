# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attachments', '0004_rename_attachments_approval_idx_attachments_approva_ccaaf2_idx_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='attachment',
            name='file_type',
            field=models.CharField(help_text='MIME type or file extension', max_length=100),
        ),
    ]

