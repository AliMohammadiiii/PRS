import * as React from "react";
import { X } from "lucide-react";
import {
  Modal,
  IconButton,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Toggle,
  Box,
  Typography,
} from "injast-core/components";
import { defaultColors } from "injast-core/constants";
import {
  MultiSelectDropdown,
  type SelectOption,
} from "@/components/ui/multi-select-dropdown";
import { cn } from "@/lib/utils";

export type ReportTitleFormData = {
  title: string;
  groups: string[];
  description: string;
  isActive: boolean;
};

export interface AddReportTitleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReportTitleFormData) => void;
  initialData?: ReportTitleFormData;
  groupOptions: SelectOption[];
}

export function AddReportTitleModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  groupOptions,
}: AddReportTitleModalProps) {
  const [formData, setFormData] = React.useState<ReportTitleFormData>(
    initialData || {
      title: "",
      groups: [],
      description: "",
      isActive: false,
    }
  );

  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid =
    formData.title.trim() !== "" && formData.groups.length > 0;

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} width={551}>
      <Box sx={{ p: 4, position: "relative" }}>
        <IconButton
          onClick={() => onOpenChange(false)}
          sx={{
            position: "absolute",
            left: 16,
            top: 16,
            width: 40,
            height: 40,
          }}
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </IconButton>

        <Typography
          variant="h6"
          sx={{
            mb: 3,
            fontSize: 16,
            fontWeight: "bold",
            textAlign: "right",
            pr: 0,
          }}
        >
          افزودن عنوان گزارش
        </Typography>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="عنوان گزارش"
              fullWidth
              height={48}
              size="small"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="عنوان را وارد کنید"
              endAdornment={
                formData.title !== "" ? (
                  <IconButton
                    size="small"
                    onClick={() => setFormData({ ...formData, title: "" })}
                  >
                    <X size={20} color={defaultColors.neutral.light} />
                  </IconButton>
                ) : undefined
              }
            />

            <MultiSelectDropdown
              label="گروه گزارش"
              options={groupOptions}
              value={formData.groups}
              onChange={(groups) => setFormData({ ...formData, groups })}
              placeholder="گروه را انتخاب کنید"
            />

            <TextField
              label="توضیحات"
              fullWidth
              size="small"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="توضیحات را وارد کنید"
              multiline
              rows={4}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1,
                py: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                فعالسازی
              </Typography>
              <Toggle
                checked={formData.isActive}
                onChange={(e, checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
                color="primary"
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isFormValid}
              fullWidth
              buttonSize="M"
              sx={{ height: 48, borderRadius: 2 }}
            >
              ثبت
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
}
