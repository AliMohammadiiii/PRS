from typing import Iterable
from reports.models import ReportBox
from org.models import OrgNode


def get_reports_for_company(company: OrgNode) -> Iterable[ReportBox]:
    """
    Implements additive logic:
      - Collect all company classifications
      - Return distinct ReportBoxes linked to any of those classifications
    """
    classification_ids = company.company_classifications.values_list('classification_id', flat=True)
    return ReportBox.objects.filter(
        classifications__in=classification_ids
    ).prefetch_related('classifications').distinct()






