import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LabeledInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  onClear?: () => void;
  showClearButton?: boolean;
}

const LabeledInput = React.forwardRef<HTMLInputElement, LabeledInputProps>(
  ({ className, label, onClear, showClearButton, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <div className="relative flex items-center w-full rounded-lg border border-app-border bg-white px-3 py-4 gap-2">
          {showClearButton && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-app-text-secondary hover:text-app-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <input
            ref={ref}
            className={cn(
              "flex-1 text-base font-medium text-app-text-secondary bg-transparent outline-none placeholder:text-app-text-tertiary",
              className
            )}
            {...props}
          />
        </div>
        <div className="absolute -top-[3px] right-3 px-0.5 bg-white">
          <span className="text-xs text-app-text-tertiary leading-none">
            {label}
          </span>
        </div>
      </div>
    );
  }
);
LabeledInput.displayName = "LabeledInput";

export { LabeledInput };
