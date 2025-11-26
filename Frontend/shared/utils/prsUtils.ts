/**
 * Utility functions for PRS (Purchase Request System)
 */

/**
 * Get Persian label for PRS status code
 */
export function getPrsStatusLabel(statusCode: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'پیش‌نویس',
    PENDING_APPROVAL: 'در انتظار تأیید',
    IN_REVIEW: 'در حال بررسی',
    REJECTED: 'رد شده',
    RESUBMITTED: 'ارسال مجدد',
    FINANCE_REVIEW: 'بررسی مالی',
    COMPLETED: 'تکمیل شده',
    FULLY_APPROVED: 'تأیید کامل',
  };

  return statusMap[statusCode] || statusCode;
}

/**
 * Extract user-friendly Persian error message from API error
 */
export function extractErrorMessage(error: any): string {
  // If error has a detail field (Django REST framework style)
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  // If error has a message field
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // If error has non_field_errors
  if (error?.response?.data?.non_field_errors) {
    const errors = error.response.data.non_field_errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[0];
    }
    return String(errors);
  }

  // If error message exists
  if (error?.message) {
    // Map common error messages to Persian
    const messageMap: Record<string, string> = {
      'Network Error': 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
      'Request failed with status code 400': 'درخواست نامعتبر است. لطفاً اطلاعات را بررسی کنید.',
      'Request failed with status code 401': 'احراز هویت نامعتبر است. لطفاً دوباره وارد شوید.',
      'Request failed with status code 403': 'شما دسترسی لازم برای انجام این عملیات را ندارید.',
      'Request failed with status code 404': 'منبع مورد نظر یافت نشد.',
      'Request failed with status code 500': 'خطای سرور. لطفاً بعداً تلاش کنید.',
    };

    if (messageMap[error.message]) {
      return messageMap[error.message];
    }

    return error.message;
  }

  // Default error message
  return 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.';
}

/**
 * Get status badge colors for PRS status
 */
export function getPrsStatusColors(statusCode: string): { bg: string; color: string } {
  switch (statusCode) {
    case 'DRAFT':
      return { bg: '#E3F2FD', color: '#1976D2' };
    case 'PENDING_APPROVAL':
      return { bg: '#FFF3E0', color: '#F57C00' };
    case 'IN_REVIEW':
      return { bg: '#E1F5FE', color: '#0288D1' };
    case 'REJECTED':
      return { bg: '#FFEBEE', color: '#D32F2F' };
    case 'RESUBMITTED':
      return { bg: '#F3E5F5', color: '#7B1FA2' };
    case 'FINANCE_REVIEW':
      return { bg: '#E8F5E9', color: '#388E3C' };
    case 'COMPLETED':
      return { bg: '#E8F5E9', color: '#2E7D32' };
    case 'FULLY_APPROVED':
      return { bg: '#E8F5E9', color: '#2E7D32' };
    default:
      return { bg: '#F5F5F5', color: '#616161' };
  }
}

/**
 * Check if current user is the requestor of a purchase request
 */
export function isRequestor(currentUserId: string, request: { requestor: string }): boolean {
  // request.requestor can be user ID or username, so check both
  return request.requestor === currentUserId;
}

/**
 * Check if user has a specific role (if RBAC is implemented)
 * Note: This is a placeholder - adjust based on your actual RBAC implementation
 */
export function hasRole(user: { roles?: string[] }, roleCode: string): boolean {
  if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
    return false;
  }

  const target = roleCode.toUpperCase();
  const upperRoles = user.roles.map((r) => String(r).toUpperCase());

  // Match either exact code (e.g. 'APPROVER') or obvious title variants (e.g. 'Approver')
  return upperRoles.some((r) => r === target || r.includes(target));
}

/**
 * Heuristic helper to determine if a user is a "Requester-only" user.
 *
 * We don't rely on exact backend role codes here; instead we try to infer:
 * - Requester-only users are NOT admins
 * - Their roles do NOT contain obvious approver/admin/finance keywords.
 */
export function isRequesterOnlyUser(user: { roles?: string[]; is_admin?: boolean }): boolean {
  if (!user || user.is_admin) {
    return false;
  }
  if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
    return false;
  }

  const upperRoles = user.roles.map((r) => r.toUpperCase());

  const hasNonRequesterKeyword = upperRoles.some((r) =>
    r.includes('APPROV') || r.includes('ADMIN') || r.includes('FINANCE') || r.includes('CFO'),
  );

  return !hasNonRequesterKeyword;
}

/**
 * Check if a status allows editing by the requestor
 */
export function isEditableStatus(statusCode: string): boolean {
  const editableStatuses = ['DRAFT', 'REJECTED', 'RESUBMITTED'];
  return editableStatuses.includes(statusCode);
}

/**
 * Check if a status allows approval actions
 */
export function canApprove(statusCode: string): boolean {
  const approvalStatuses = ['PENDING_APPROVAL', 'IN_REVIEW'];
  return approvalStatuses.includes(statusCode);
}

/**
 * Check if a status allows rejection
 */
export function canReject(statusCode: string): boolean {
  const rejectableStatuses = ['PENDING_APPROVAL', 'IN_REVIEW', 'FINANCE_REVIEW'];
  return rejectableStatuses.includes(statusCode);
}

/**
 * Check if a status allows finance completion
 */
export function canFinanceComplete(statusCode: string): boolean {
  const financeStatuses = ['FINANCE_REVIEW', 'FULLY_APPROVED'];
  return financeStatuses.includes(statusCode);
}


