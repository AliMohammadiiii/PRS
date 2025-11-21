import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "injast-core/components";
import DashboardLayout from "@/components/DashboardLayout";
import { FieldTable, type FieldData } from "@/components/FieldTable";
import {
  AddReportTitleModal,
  type ReportTitleFormData,
} from "@/components/AddReportTitleModal";

const groupOptions = [
  { value: "investment", label: "گروه سرمایه‌گذاری" },
  { value: "commercial", label: "گروه تجاری" },
  { value: "financial", label: "گروه مالی" },
  { value: "service", label: "گروه خدماتی" },
];

const sampleData: FieldData[] = [
  {
    id: "1",
    reportTitle: "فروش و درآمد",
    titleCode: "۱۲۳۴۵۶۷",
    groups: "گروه مالی، گروه خدماتی",
    fields: "ـــ",
    titleStatus: "active",
  },
  {
    id: "2",
    reportTitle: "بهای تمام‌شده",
    titleCode: "۶۲۱۶۲۳۱",
    groups: "گروه نرم افزاری",
    fields: "ـــ",
    titleStatus: "inactive",
  },
];

export default function Groups() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleAddField = (id: string) => {
    
  };

  const handleAdd = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: ReportTitleFormData) => {
    
    setIsModalOpen(false);
    setEditingId(null);
  };

  return (
    <DashboardLayout pageTitle="تعریف گروه" breadcrumb="تعریف گروه">
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <h2 className="text-base md:text-lg font-bold text-app-text-primary">
            عناوین تعریف شده
          </h2>

          <Button
            onClick={handleAdd}
            variant="contained"
            color="primary"
            buttonSize="M"
            startIcon={<Plus className="w-5 h-5" />}
            sx={{ flexShrink: 0 }}
          >
            افزودن
          </Button>
        </div>

        <FieldTable
          data={sampleData}
          onEdit={handleEdit}
          onAddField={handleAddField}
        />
      </div>

      <AddReportTitleModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleModalSubmit}
        groupOptions={groupOptions}
        initialData={
          editingId
            ? {
                title: "فروش و درآمد",
                groups: ["financial", "service"],
                description:
                  "این عنوان مربوط به گروه های مالی خدماتی میباشد",
                isActive: true,
              }
            : undefined
        }
      />
    </DashboardLayout>
  );
}
