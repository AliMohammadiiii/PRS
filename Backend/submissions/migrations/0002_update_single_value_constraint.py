# Generated manually to update the single_value_column constraint to include entity_ref_uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0001_initial'),
    ]

    operations = [
        # Drop the old constraint
        migrations.RemoveConstraint(
            model_name='submissionfieldvalue',
            name='single_value_column',
        ),
        # Add the new constraint with entity_ref_uuid included
        # Ensure at most one value field is non-null by checking pairwise that at least one is null
        migrations.AddConstraint(
            model_name='submissionfieldvalue',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(value_number__isnull=True) | models.Q(value_text__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_bool__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_bool__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_date__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_date__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_file__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ),
                name='single_value_column',
            ),
        ),
    ]

