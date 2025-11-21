import * as React from "react";
import { Button } from "injast-core/components";
import { TreeItem, type TreeItemData } from "./TreeItem";

type OrganizationTreeProps = {
  data: TreeItemData[];
  selectedId?: string;
  onItemClick?: (id: string) => void;
  onAddOrganization?: () => void;
};

export function OrganizationTree({
  data,
  selectedId,
  onItemClick,
  onAddOrganization,
}: OrganizationTreeProps) {
  const [treeData, setTreeData] = React.useState<TreeItemData[]>(data);

  React.useEffect(() => {
    setTreeData(data);
  }, [data]);

  const handleToggle = (id: string) => {
    const toggleNode = (nodes: TreeItemData[]): TreeItemData[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(toggleNode(treeData));
  };

  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Button
          onClick={onAddOrganization}
          variant="contained"
          color="primary"
          buttonSize="S"
          sx={{ borderRadius: 1 }}
        >
          افزودن سازمان
        </Button>
        <h3 className="text-base font-bold text-app-text-secondary">
          نمودار درختی سازمان
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        {treeData.map((item) => (
          <TreeItem
            key={item.id}
            data={item}
            isSelected={selectedId === item.id}
            onToggle={handleToggle}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

export { TreeItem };
export type { TreeItemData };
