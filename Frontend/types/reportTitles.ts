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

export type FieldType = 'text' | 'switch' | 'combo-box' | 'file-upload' | 'financial-period';

export type ReportField = {
  id: string;
  title: string; // عنوان
  type: FieldType; // نوع فیلد
  label: string; // لیبل
  defaultText?: string; // متن پیش‌فرض (only for text type)
  code: string; // کد فیلد
  isActive: boolean; // فعال‌سازی فیلد
  // For combo-box
  options?: string[]; // گزینه‌ها
  // For file-upload
  fileExtension?: string; // پسوند فایل
};

export type ReportTitleItem = {
  id: string;
  title: string; // عنوان گزارش
  code: string; // کد عنوان
  groups: string[]; // گروه‌ها
  fields: ReportField[]; // فیلدها
  status: 'active' | 'inactive'; // وضعیت عنوان
  description?: string; // توضیحات
};

export type ReportTitleFormData = {
  title: string;
  groups: string[];
  description: string;
  isActive: boolean;
};

