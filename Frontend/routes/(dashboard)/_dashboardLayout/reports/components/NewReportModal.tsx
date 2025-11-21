import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { useCompany } from 'src/client/contexts/CompanyContext';

type NewReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NewReportModal({ open, onOpenChange }: NewReportModalProps) {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const handleSubmit = () => {
    if (selectedCompany) {
      // Navigate to report submission page with company pre-selected
      navigate({ 
        to: '/reports/submit',
        search: { companyId: selectedCompany.id }
      });
      onOpenChange(false);
    }
  };

  if (!selectedCompany) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-right">خطا</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-right">لطفاً یک شرکت را انتخاب کنید</p>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#d6d9df]"
            >
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-right">ایجاد گزارش جدید</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-right text-sm text-gray-600">
              گزارش جدید برای شرکت <strong>{selectedCompany.name}</strong> ایجاد خواهد شد.
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            onClick={handleSubmit}
            className="bg-[#1dbf98] hover:bg-[#1dbf98]/90 text-white"
          >
            ادامه
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#d6d9df]"
          >
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

