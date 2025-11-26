import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TextField,
  FormControl,
  InputLabel,
  Toggle,
  Box,
} from "injast-core/components";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { OrganizationTree, type TreeItemData } from "@/components/OrganizationTree";
import { Calendar, X } from "lucide-react";
import { IconButton } from "injast-core/components";

const groupOptions = [
  { value: "financial", label: "گروه مالی" },
  { value: "service", label: "گروه خدماتی" },
  { value: "commercial", label: "گروه تجاری" },
  { value: "investment", label: "گروه سرمایه‌گذاری" },
];

const organizationTreeData: TreeItemData[] = [
  {
    id: "1",
    name: "توسعه راهکارهای نوین اعتماد",
    level: 0,
    isExpanded: true,
    children: [
      {
        id: "1-1",
        name: "شرکت ۱",
        level: 1,
      },
      {
        id: "1-2",
        name: "شرکت ۲",
        level: 1,
      },
      {
        id: "1-3",
        name: "شرکت ۳",
        level: 1,
      },
      {
        id: "1-4",
        name: "شرکت ۴",
        level: 1,
        isExpanded: true,
        children: [
          {
            id: "1-4-1",
            name: "زیرشرکت ۱",
            level: 2,
            isExpanded: true,
            children: [
              { id: "1-4-1-1", name: "زیرشرکت ۱", level: 3 },
              { id: "1-4-1-2", name: "زیرشرکت ۲", level: 3 },
              { id: "1-4-1-3", name: "زیرشرکت ۳", level: 3 },
              { id: "1-4-1-4", name: "زیرشرکت ۴", level: 3 },
            ],
          },
          { id: "1-4-2", name: "زیرشرکت ۲", level: 2 },
          { id: "1-4-3", name: "زیرشرکت ۳", level: 2 },
          { id: "1-4-4", name: "زیرشرکت ۴", level: 2 },
        ],
      },
    ],
  },
];

export default function Operations() {
  const [activeTab, setActiveTab] = useState("organization");
  const [companyName, setCompanyName] = useState("توسعه راهکارهای نوین اعتماد");
  const [orgType, setOrgType] = useState("هلدینگ");
  const [registrationNumber, setRegistrationNumber] = useState("۱۲۳۴۵۶۷۸۹");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(["financial"]);
  const [isActive, setIsActive] = useState(true);

  const handleAddOrganization = () => {
    
  };

  const handleItemClick = (id: string) => {
    
  };

  return (
    <DashboardLayout pageTitle="تعریف عملیاتی" breadcrumb="تعریف عملیاتی">
      <div className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          <TabsContent value="organization" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-[432px_1fr] gap-4">
              {/* Left Column - Organization Info Form */}
              <div className="bg-white rounded-xl p-6 flex flex-col gap-5">
                <h3 className="text-base font-bold text-app-text-primary text-right">
                  اطلاعات سازمان
                </h3>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <FormControl fullWidth>
                    <InputLabel>نام شرکت</InputLabel>
                    <TextField
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                      InputProps={{
                        endAdornment:
                          companyName !== "" ? (
                            <IconButton
                              size="small"
                              onClick={() => setCompanyName("")}
                            >
                              <X className="w-5 h-5" />
                            </IconButton>
                          ) : undefined,
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>نوع سازمان</InputLabel>
                    <TextField
                    label="نوع سازم��ن"
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      InputProps={{
                        endAdornment:
                          orgType !== "" ? (
                            <IconButton
                              size="small"
                              onClick={() => setOrgType("")}
                            >
                              <X className="w-5 h-5" />
                            </IconButton>
                          ) : undefined,
                      }}
                  />

                  <FormControl fullWidth>
                    <InputLabel>شماره ثبت</InputLabel>
                    <TextField
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                      InputProps={{
                        endAdornment:
                          registrationNumber !== "" ? (
                            <IconButton
                              size="small"
                              onClick={() => setRegistrationNumber("")}
                            >
                              <X className="w-5 h-5" />
                            </IconButton>
                          ) : undefined,
                      }}
                    />
                  </FormControl>

                  <MultiSelectDropdown
                    label="گروه گزارش"
                    options={groupOptions}
                    value={selectedGroups}
                    onChange={setSelectedGroups}
                    placeholder="گروه را انتخاب کنید"
                  />

                  <FormControl fullWidth>
                    <InputLabel>نوع شخصیت حقوقی</InputLabel>
                    <TextField placeholder="نوع شخصیت حقوقی" />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>شناسه ملی</InputLabel>
                    <TextField placeholder="شناسه ملی" />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>کد اقتصادی</InputLabel>
                    <TextField placeholder="کد اقتصادی" />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>تاریخ ثبت/تأسیس</InputLabel>
                    <TextField
                      placeholder="تاریخ ثبت/تأسیس"
                      InputProps={{
                        startAdornment: <Calendar className="w-5 h-5" />,
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>زیرصنعت</InputLabel>
                    <TextField placeholder="زیرصنعت" />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>صنعت</InputLabel>
                    <TextField placeholder="صنعت" />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>لینک وبسایت رسمی</InputLabel>
                    <TextField placeholder="لینک وبسایت رسمی" />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>هلدینگ بالاسری (در صورت وجود)</InputLabel>
                    <TextField placeholder="هلدینگ بالاسری (در صورت وجود)" />
                  </FormControl>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 1,
                    py: 1,
                  }}
                >
                  <span className="text-sm font-medium text-app-text-primary">
                    فعال‌سازی سازمان
                  </span>
                  <Toggle
                    checked={isActive}
                    onChange={(e, checked) => setIsActive(checked)}
                    color="primary"
                  />
                </Box>
              </div>

              {/* Right Column - Organization Tree */}
              <OrganizationTree
                data={organizationTreeData}
                onItemClick={handleItemClick}
                onAddOrganization={handleAddOrganization}
              />
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-white rounded-xl p-6">
              <p className="text-center text-app-text-secondary">
                صفحه تعریف کاربران
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
