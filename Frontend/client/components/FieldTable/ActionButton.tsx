import { Edit2, Plus } from "lucide-react";
import { IconButton } from "injast-core/components";

type ActionButtonProps = {
  variant: "edit" | "add";
  onClick?: () => void;
  className?: string;
};

export function ActionButton({ variant, onClick, className }: ActionButtonProps) {
  const isEdit = variant === "edit";
  const Icon = isEdit ? Edit2 : Plus;
  
  return (
    <IconButton
      onClick={onClick}
      color={isEdit ? "warning" : "primary"}
      size="small"
      sx={{
        width: 32,
        height: 32,
        borderRadius: 1,
      }}
      className={className}
      aria-label={isEdit ? "ویرایش" : "افزودن"}
    >
      <Icon className="w-4 h-4" />
    </IconButton>
  );
}
