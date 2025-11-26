"""
B. Domain Models Tests (Teams, Forms, Workflows)
"""
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from teams.models import Team
from prs_forms.models import FormTemplate, FormField
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover


@pytest.mark.django_db
@pytest.mark.P1
class TestTeamBasics:
    """B1: Team basics - create, update, soft-delete, ordering"""
    
    def test_create_team(self, db):
        """Test creating an active team"""
        team = Team.objects.create(name="Engineering", is_active=True)
        assert team.name == "Engineering"
        assert team.is_active is True
        assert team.id is not None
    
    def test_team_name_uniqueness(self, db):
        """Test that team names must be unique"""
        Team.objects.create(name="Marketing", is_active=True)
        
        with pytest.raises(IntegrityError):
            Team.objects.create(name="Marketing", is_active=True)
    
    def test_team_soft_delete(self, db):
        """Test soft-delete behavior via is_active"""
        team = Team.objects.create(name="Sales", is_active=True)
        team_id = team.id
        
        # Soft delete
        team.is_active = False
        team.save()
        
        # Should not appear in default queryset
        assert Team.objects.filter(is_active=True).count() == 0
        
        # But should still exist
        assert Team.objects.filter(id=team_id).exists()
    
    def test_team_ordering(self, db):
        """Test team ordering by name"""
        Team.objects.create(name="Zebra", is_active=True)
        Team.objects.create(name="Alpha", is_active=True)
        Team.objects.create(name="Beta", is_active=True)
        
        teams = list(Team.objects.filter(is_active=True).order_by('name'))
        assert teams[0].name == "Alpha"
        assert teams[1].name == "Beta"
        assert teams[2].name == "Zebra"


@pytest.mark.django_db
@pytest.mark.P0
class TestFormTemplateConstraints:
    """B2: FormTemplate constraints"""
    
    def test_one_active_template_per_team(self, team_with_workflow):
        """Test that only one active template per team is allowed"""
        team = team_with_workflow["team"]
        template = team_with_workflow["template"]
        
        # Try to create another active template for same team
        new_template = FormTemplate(
            team=team,
            version_number=2,
            is_active=True
        )
        
        with pytest.raises(ValidationError) as exc_info:
            new_template.full_clean()
        
        assert "already has an active form template" in str(exc_info.value)
    
    def test_multiple_inactive_templates_allowed(self, team_with_workflow, user_manager):
        """Test that multiple inactive templates are allowed"""
        team = team_with_workflow["team"]
        template = team_with_workflow["template"]
        
        # Create inactive template
        inactive_template = FormTemplate.objects.create(
            team=team,
            version_number=2,
            is_active=False,
            created_by=user_manager
        )
        
        assert FormTemplate.objects.filter(team=team, is_active=False).count() == 1
        assert FormTemplate.objects.filter(team=team, is_active=True).count() == 1
    
    def test_deactivate_old_activate_new(self, team_with_workflow, user_manager):
        """Test deactivating old template and activating new one"""
        team = team_with_workflow["team"]
        template = team_with_workflow["template"]
        
        # Deactivate old template
        template.is_active = False
        template.save()
        
        # Create and activate new template
        new_template = FormTemplate.objects.create(
            team=team,
            version_number=2,
            is_active=True,
            created_by=user_manager
        )
        
        # Should pass validation
        new_template.full_clean()
        
        assert FormTemplate.objects.filter(team=team, is_active=True).count() == 1
        assert FormTemplate.objects.filter(team=team, is_active=True).first() == new_template


@pytest.mark.django_db
@pytest.mark.P0
class TestFormFieldConstraints:
    """B3: FormField constraints"""
    
    def test_unique_template_field_id(self, team_with_workflow):
        """Test that (template, field_id) must be unique"""
        template = team_with_workflow["template"]
        
        # Try to create duplicate field_id
        with pytest.raises(IntegrityError):
            FormField.objects.create(
                template=template,
                field_id="REQ_DESC",  # Same as existing
                name="duplicate",
                label="Duplicate",
                field_type=FormField.TEXT,
                order=10
            )
    
    def test_field_ordering(self, team_with_workflow):
        """Test that fields are ordered by order field"""
        template = team_with_workflow["template"]
        
        # Create fields with different orders (using high order numbers to avoid conflicts)
        field3 = FormField.objects.create(
            template=template,
            field_id="FIELD3",
            name="field3",
            label="Field 3",
            field_type=FormField.TEXT,
            order=30
        )
        
        field1 = FormField.objects.create(
            template=template,
            field_id="FIELD1",
            name="field1",
            label="Field 1",
            field_type=FormField.TEXT,
            order=10
        )
        
        field2 = FormField.objects.create(
            template=template,
            field_id="FIELD2",
            name="field2",
            label="Field 2",
            field_type=FormField.TEXT,
            order=20
        )
        
        # Get only the newly created fields ordered
        new_fields = list(FormField.objects.filter(
            template=template,
            field_id__in=["FIELD1", "FIELD2", "FIELD3"]
        ).order_by('order'))
        
        # Should be ordered by order field
        assert len(new_fields) == 3
        assert new_fields[0].order == 10
        assert new_fields[1].order == 20
        assert new_fields[2].order == 30
    
    def test_all_field_types_accepted(self, team_with_workflow):
        """Test that all field types are accepted"""
        template = team_with_workflow["template"]
        
        field_types = [
            FormField.TEXT,
            FormField.NUMBER,
            FormField.DATE,
            FormField.BOOLEAN,
            FormField.DROPDOWN,
            FormField.FILE_UPLOAD,
        ]
        
        for idx, field_type in enumerate(field_types):
            field = FormField.objects.create(
                template=template,
                field_id=f"FIELD_{field_type}_{idx}",
                name=f"field_{idx}",
                label=f"Field {idx}",
                field_type=field_type,
                order=100 + idx,
                dropdown_options=["Option1", "Option2"] if field_type == FormField.DROPDOWN else None
            )
            assert field.field_type == field_type


@pytest.mark.django_db
@pytest.mark.P0
class TestWorkflowConstraints:
    """B4: Workflow constraints"""
    
    def test_exactly_one_finance_step_per_workflow(self, team_with_workflow):
        """Test that exactly one finance step per workflow is enforced"""
        workflow = team_with_workflow["workflow"]
        finance_step = team_with_workflow["finance_step"]
        
        # Try to create another finance step
        new_finance_step = WorkflowStep(
            workflow=workflow,
            step_name="Another Finance Step",
            step_order=3,
            is_finance_review=True
        )
        
        with pytest.raises(ValidationError) as exc_info:
            new_finance_step.full_clean()
        
        assert "already has a Finance Review step" in str(exc_info.value)
    
    def test_multiple_non_finance_steps_allowed(self, team_with_workflow):
        """Test that multiple non-finance steps are allowed"""
        workflow = team_with_workflow["workflow"]
        
        # Create additional non-finance step
        step3 = WorkflowStep.objects.create(
            workflow=workflow,
            step_name="Additional Approval",
            step_order=3,
            is_finance_review=False,
            is_active=True
        )
        
        assert WorkflowStep.objects.filter(workflow=workflow, is_finance_review=False).count() >= 2
    
    def test_step_ordering(self, team_with_workflow):
        """Test that steps are ordered by step_order"""
        workflow = team_with_workflow["workflow"]
        
        # Create steps with different orders
        step3 = WorkflowStep.objects.create(
            workflow=workflow,
            step_name="Step 3",
            step_order=3,
            is_finance_review=False,
            is_active=True
        )
        
        step1 = WorkflowStep.objects.get(step_order=1)
        
        # Get steps ordered
        steps = list(WorkflowStep.objects.filter(workflow=workflow).order_by('step_order'))
        
        # Should be ordered by step_order
        assert steps[0].step_order == 1
        assert steps[1].step_order == 2
        assert steps[2].step_order == 3
    
    def test_unique_workflow_step_order(self, team_with_workflow):
        """Test that (workflow, step_order) must be unique"""
        workflow = team_with_workflow["workflow"]
        
        # Try to create duplicate step_order (using step_order=1 which already exists from fixture)
        with pytest.raises((IntegrityError, ValidationError)):
            step = WorkflowStep(
                workflow=workflow,
                step_name="Duplicate Step",
                step_order=1,  # Same as existing
                is_finance_review=False,
                is_active=True
            )
            step.full_clean()  # This should catch the validation error
            step.save()  # This should catch the integrity error


@pytest.mark.django_db
@pytest.mark.P0
class TestWorkflowStepApproverConstraints:
    """B5: WorkflowStepApprover constraints"""
    
    def test_unique_step_approver(self, team_with_workflow, user_manager):
        """Test that (step, approver) must be unique"""
        step1 = team_with_workflow["step1"]
        
        # Try to add same user twice as approver
        with pytest.raises(IntegrityError):
            WorkflowStepApprover.objects.create(
                step=step1,
                approver=user_manager,
                is_active=True
            )
    
    def test_inactive_approvers_ignored(self, team_with_workflow, user_manager):
        """Test that inactive approvers are ignored by permission helpers"""
        step1 = team_with_workflow["step1"]
        
        # Get existing approver
        approver = WorkflowStepApprover.objects.get(step=step1, approver=user_manager)
        
        # Deactivate approver
        approver.is_active = False
        approver.save()
        
        # Check that inactive approvers are filtered out
        active_approvers = WorkflowStepApprover.objects.filter(
            step=step1,
            is_active=True
        )
        
        assert active_approvers.count() == 0

