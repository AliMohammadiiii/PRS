export type OrganizationTreeItem = {
  id: string;
  name: string;
  level: number;
  isExpanded?: boolean;
  children?: OrganizationTreeItem[];
  organizationId?: string; // Reference to organization data
};

export type Organization = {
  id: string;
  name: string; // نام شرکت
  type: string; // نوع سازمان (HOLDING or COMPANY)
  registrationNumber: string; // شماره ثبت
  companyClassifications: string[]; // گروه گزارش (company classification IDs)
  legalEntityTypeId?: string; // نوع شخصیت حقوقی ID
  nationalId?: string; // شناسه ملی
  economicCode?: string; // کد اقتصادی
  registrationDate?: string; // تاریخ ثبت/تأسیس
  subIndustryId?: string; // زیرصنعت ID
  industryId?: string; // صنعت ID
  websiteUrl?: string; // لینک وبسایت رسمی
  parentHolding?: string; // هلدینگ بالاسری
  isActive: boolean; // فعال‌سازی سازمان
  parentId?: string; // Parent organization ID for tree structure
  createdAt: string;
  updatedAt: string;
};

export type OrganizationFormData = {
  name: string;
  type: string;
  registrationNumber: string;
  companyClassifications: string[];
  legalEntityType?: string;
  nationalId?: string;
  economicCode?: string;
  registrationDate?: string;
  subIndustry?: string;
  industry?: string;
  websiteUrl?: string;
  parentHolding?: string;
  isActive: boolean;
  parentId?: string;
};

export type User = {
  id: string;
  name: string;
  nationalId: string; // شناسه ملی
  phoneNumber?: string; // شماره موبایل
  role: string; // سمت در شرکت
  organizationId?: string; // Reference to organization
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  password?: string; // Password for new users
  userType?: 'new' | 'existing'; // Type of user operation
};

export type UserFormData = {
  name: string;
  nationalId: string;
  phoneNumber?: string;
  role: string;
  organizationId?: string;
  isActive: boolean;
};

