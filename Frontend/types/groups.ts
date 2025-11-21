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

export type Group = {
  id: string;
  title: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
};

export type GroupFormData = {
  title: string;
  description: string;
  isActive: boolean;
};

