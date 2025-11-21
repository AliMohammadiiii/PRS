export type BasicInfoCategory =
  | 'position-in-company'
  | 'financial-period'
  | 'report-period'
  | 'legal-entity-type'
  | 'report-status'
  | 'industry'
  | 'sub-industry';

export type BasicInfoItem = {
  id: string;
  title: string;
  code: string;
  status: 'active' | 'inactive';
  category: BasicInfoCategory;
};

export type BasicInfoCategoryConfig = {
  key: BasicInfoCategory;
  title: string;
  fourthColumnTitle: string;
};

export const BASIC_INFO_CATEGORIES: BasicInfoCategoryConfig[] = [
  {
    key: 'position-in-company',
    title: 'سمت در شرکت',
    fourthColumnTitle: 'عنوان سمت',
  },
  {
    key: 'financial-period',
    title: 'دوره مالی',
    fourthColumnTitle: 'عنوان دوره',
  },
  {
    key: 'report-period',
    title: 'دوره گزارش',
    fourthColumnTitle: 'عنوان دوره',
  },
  {
    key: 'legal-entity-type',
    title: 'نوع شخصیت حقوقی',
    fourthColumnTitle: 'عنوان شخصیت حقوقی',
  },
  {
    key: 'report-status',
    title: 'وضعیت گزارش‌ها',
    fourthColumnTitle: 'عنوان وضعیت گزارش',
  },
  {
    key: 'industry',
    title: 'صنعت',
    fourthColumnTitle: 'عنوان صنعت',
  },
  {
    key: 'sub-industry',
    title: 'زیرصنعت',
    fourthColumnTitle: 'عنوان زیرصنعت',
  },
];

// Helper function to convert English digits to Persian digits
function toPersianDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
}

// Helper function to generate a Persian code (7 digits)
export function generatePersianCode(): string {
  const random = Math.floor(Math.random() * 10000000);
  const code = random.toString().padStart(7, '0');
  return toPersianDigits(code);
}

