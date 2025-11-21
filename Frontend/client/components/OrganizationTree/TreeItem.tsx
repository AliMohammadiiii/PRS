import * as React from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TreeItemData = {
  id: string;
  name: string;
  level: number;
  isExpanded?: boolean;
  children?: TreeItemData[];
};

type TreeItemProps = {
  data: TreeItemData;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
};

export function TreeItem({ data, isSelected, onToggle, onClick }: TreeItemProps) {
  const hasChildren = data.children && data.children.length > 0;
  const paddingLeft = data.level * 40;

  return (
    <>
      <div
        onClick={() => onClick?.(data.id)}
        className={cn(
          "flex items-center justify-between h-12 px-3 rounded-lg border border-app-border bg-white cursor-pointer transition-colors hover:bg-gray-50",
          isSelected && "border-app-teal",
          data.level > 0 && "w-[calc(100%-" + paddingLeft + "px)]"
        )}
        style={data.level > 0 ? { marginLeft: `${paddingLeft}px` } : undefined}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle?.(data.id);
          }}
          className="p-0 hover:bg-transparent"
        >
          {hasChildren ? (
            data.isExpanded ? (
              <ChevronDown className="w-5 h-5 text-app-text-primary" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-app-text-primary" />
            )
          ) : (
            <ChevronLeft className="w-5 h-5 text-app-text-primary" />
          )}
        </button>
        <span className="flex-1 text-base font-bold text-app-text-secondary text-right">
          {data.name}
        </span>
      </div>

      {hasChildren && data.isExpanded && (
        <div className="flex flex-col gap-4 mt-4">
          {data.children!.map((child) => (
            <TreeItem
              key={child.id}
              data={child}
              isSelected={isSelected}
              onToggle={onToggle}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </>
  );
}
