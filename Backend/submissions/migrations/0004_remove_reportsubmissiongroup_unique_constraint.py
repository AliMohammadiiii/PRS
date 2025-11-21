# Generated manually to remove unique constraint from ReportSubmissionGroup

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0003_reportsubmissiongroup_submission_group_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='reportsubmissiongroup',
            unique_together=set(),
        ),
    ]





