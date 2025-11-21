import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: "active" | "inactive";
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isActive = status === "active";
  
  return (
    <span
      className={cn(
        "text-sm font-medium",
        isActive ? "text-[#18AB33]" : "text-[#ED2C3A]",
        className
      )}
    >
      {isActive ? "فعال" : "غیرفعال"}
    </span>
  );
}
