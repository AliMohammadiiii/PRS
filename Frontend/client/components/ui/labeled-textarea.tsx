import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabeledTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

const LabeledTextarea = React.forwardRef<
  HTMLTextAreaElement,
  LabeledTextareaProps
>(({ className, label, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[120px] w-full rounded-lg border border-app-border bg-white px-3 py-4 text-sm font-medium text-app-text-secondary outline-none placeholder:text-app-text-tertiary resize-none leading-6",
          className
        )}
        {...props}
      />
      <div className="absolute -top-[3px] right-3 px-0.5 bg-white">
        <span className="text-xs text-app-text-tertiary leading-none">
          {label}
        </span>
      </div>
    </div>
  );
});
LabeledTextarea.displayName = "LabeledTextarea";

export { LabeledTextarea };
