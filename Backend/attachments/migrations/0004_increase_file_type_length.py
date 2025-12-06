# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attachments', '0003_add_approval_history_to_attachment'),
    ]

    operations = [
        migrations.AlterField(
            model_name='attachment',
            name='file_type',
            field=models.CharField(help_text='MIME type or file extension', max_length=100),
        ),
    ]

