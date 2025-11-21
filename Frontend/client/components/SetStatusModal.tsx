import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Box,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  IconButton,
} from "injast-core/components";
import { defaultColors } from "injast-core/constants";
import { X } from "lucide-react";

interface SetStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: "APPROVED" | "REJECTED", comment?: string) => Promise<void>;
  isLoading?: boolean;
}

export function SetStatusModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: SetStatusModalProps) {
  const [status, setStatus] = React.useState<"APPROVED" | "REJECTED" | "">("");
  const [comment, setComment] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    
    if (!status) {
      setError("لطفا وضعیت را انتخاب کنید");
      return;
    }

    if (status === "REJECTED" && !comment.trim()) {
      setError("برای رد کردن، توضیحات الزامی است");
      return;
    }

    try {
      await onConfirm(status, comment.trim() || undefined);
      // Reset form on success
      setStatus("");
      setComment("");
      setError(null);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "خطا در ثبت وضعیت");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setStatus("");
      setComment("");
      setError(null);
      onOpenChange(false);
    }
  };

  const isSubmitDisabled = !status || (status === "REJECTED" && !comment.trim()) || isLoading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] p-4" dir="rtl">
        <DialogHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="bg-[#f4f6fa] rounded-xl p-2.5 hover:bg-[#e8ebf0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5 text-[#242933] rotate-180 scale-y-[-1]" />
            </button>
          </div>
          <DialogTitle className="text-right text-base font-bold text-[#242933]">
            تعیین وضعیت
          </DialogTitle>
        </DialogHeader>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 10, pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as "APPROVED" | "REJECTED");
                setError(null);
              }}
              disabled={isLoading}
              fullWidth
              height={48}
              size="small"
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            >
              <MenuItem value="" disabled>
                وضعیت گزارش
              </MenuItem>
              <MenuItem value="APPROVED">تایید شده</MenuItem>
              <MenuItem value="REJECTED">نیازمند تغییرات</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError(null);
              }}
              placeholder="توضیحات (اختیاری)"
              disabled={isLoading}
              multiline
              rows={6}
              fullWidth
              sx={{
                minHeight: '152px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            />
          </Box>

          {error && (
            <Typography
              variant="body2"
              sx={{
                color: defaultColors.danger?.main || '#FF0000',
                textAlign: 'right',
                fontSize: '14px',
              }}
            >
              {error}
            </Typography>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            variant="contained"
            fullWidth
            loading={isLoading}
            sx={{
              height: 48,
              borderRadius: 1.5,
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            {isLoading ? "در حال ثبت..." : "ثبت"}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

