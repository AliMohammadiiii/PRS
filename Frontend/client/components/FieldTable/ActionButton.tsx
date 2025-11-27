import { Edit2, Plus, Trash2 } from "lucide-react";
import { IconButton } from "injast-core/components";

type ActionButtonProps = {
  variant: "edit" | "add" | "delete";
  onClick?: () => void;
  className?: string;
};

export function ActionButton({ variant, onClick, className }: ActionButtonProps) {
  const getIcon = () => {
    switch (variant) {
      case "edit":
        return Edit2;
      case "delete":
        return Trash2;
      default:
        return Plus;
    }
  };

  const getColor = () => {
    switch (variant) {
      case "edit":
        return "warning"; // Orange for edit
      case "delete":
        return "error"; // Red for delete
      default:
        return "primary";
    }
  };

  const getAriaLabel = () => {
    switch (variant) {
      case "edit":
        return "ویرایش";
      case "delete":
        return "حذف";
      default:
        return "افزودن";
    }
  };

  const Icon = getIcon();
  
  return (
    <IconButton
      onClick={onClick}
      color={getColor()}
      size="small"
      sx={{
        width: 32,
        height: 32,
        borderRadius: 1,
      }}
      className={className}
      aria-label={getAriaLabel()}
    >
      <Icon className="w-4 h-4" />
    </IconButton>
  );
}
