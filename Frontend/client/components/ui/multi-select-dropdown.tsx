import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { Checkbox } from "./checkbox";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

export interface MultiSelectDropdownProps {
  label: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
  placeholder,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemoveTag = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsOpen(!isOpen);
            }
          }}
          className="flex items-center justify-between w-full rounded-lg border border-app-border bg-white px-3 py-4 gap-2 text-right cursor-pointer hover:border-app-text-secondary transition-colors"
        >
          <ChevronDown
            className={cn(
              "w-5 h-5 text-app-text-secondary transition-transform flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
          <div className="flex items-center gap-2 flex-wrap justify-end flex-1">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label, index) => {
                const optValue = options.find((o) => o.label === label)?.value;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-app-text-secondary bg-white"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (optValue) handleRemoveTag(optValue);
                      }}
                      className="flex items-center justify-center p-0.5 rounded hover:bg-gray-100"
                      aria-label={`حذف ${label}`}
                    >
                      <X className="w-3 h-3 text-app-text-secondary" />
                    </button>
                    <span className="text-sm text-app-text-secondary">
                      {label}
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-base text-app-text-tertiary">
                {placeholder}
              </span>
            )}
          </div>
        </div>
        <div className="absolute -top-[3px] right-3 px-0.5 bg-white z-10">
          <span className="text-xs text-app-text-tertiary leading-none">
            {label}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-app-border bg-white shadow-lg z-50 overflow-hidden">
          <div className="max-h-[180px] overflow-y-auto p-2">
            <div className="flex flex-col">
              {options.map((option) => {
                const isChecked = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleToggle(option.value)}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-app-light transition-colors text-right cursor-pointer"
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggle(option.value)}
                        className={cn(
                          "w-4 h-4 border-app-border rounded",
                          isChecked && "bg-app-teal border-app-teal"
                        )}
                      />
                    </div>
                    <span className="flex-1 text-sm font-medium text-app-text-secondary">
                      {option.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="absolute left-2 top-2.5 bottom-2.5 w-3 flex items-start">
            <div className="w-1 h-10 bg-[#B1B7C2] rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}
