import { ReactNode } from "react";
import { LogOut, Search } from "lucide-react";
import { List, ListItem, TextField, Box, Typography } from "injast-core/components";
import { IconButton } from "injast-core/components";
import { ListItemButton, InputAdornment } from "@mui/material";

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle: string;
  breadcrumb?: string;
}

export default function DashboardLayout({
  children,
  pageTitle,
  breadcrumb,
}: DashboardLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-app-light" dir="rtl">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 max-w-7xl">
            <div className="mb-6">
              <h1 className="text-lg md:text-xl font-bold text-app-text-primary mb-2">
                {pageTitle}
              </h1>
              {breadcrumb && (
                <p className="text-xs text-app-text-tertiary">{breadcrumb}</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 bg-app-dark flex-col h-screen flex-shrink-0">
      <div className="px-6 py-6">
        <div className="text-white text-xs font-bold tracking-wide">
          CFO WIZE
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <List sx={{ p: 0 }}>
          <NavItem label="گزارش‌ها" />
          <NavItem label="تعریف اطلاعات پایه" />
          <NavItem label="تعریف گزارش ها" />
          <NavItem label="تعریف گروه" isActive />
          <NavItem label="تعریف عناوین گزارشات" />
          <NavItem label="تعریف عملیاتی" />
          <NavItem label="ارسال اعلان‌" />
          <NavItem label="تغییر رمز عبور" />
        </List>
      </nav>

      <div className="p-4 border-t border-gray-700"></div>
    </aside>
  );
}

function NavItem({
  label,
  isActive = false,
}: {
  label: string;
  isActive?: boolean;
}) {
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        sx={{
          borderRadius: 2,
          py: 1.5,
          px: 2,
          textAlign: "right",
          bgcolor: isActive ? "rgba(255, 255, 255, 0.1)" : "transparent",
          color: isActive ? "white" : "rgba(255, 255, 255, 0.7)",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.05)",
            color: "white",
          },
          transition: "all 0.2s",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: isActive ? 500 : 400,
            fontSize: "0.875rem",
          }}
        >
          {label}
        </Typography>
      </ListItemButton>
    </ListItem>
  );
}

function TopBar() {
  const today = new Date();
  const farsiDate = `امروز: ${today.toLocaleDateString("fa-IR")}`;

  return (
    <div className="bg-white border-b border-app-border h-20 flex items-center justify-between px-8 flex-shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-app-light rounded-lg flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5 text-app-text-secondary" />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-app-text-secondary">
                الهه ابراهیمی
              </div>
              <div className="text-xs text-app-text-tertiary">
                کارشناس امور مالی
              </div>
            </div>

            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/e68a8ad675cfc73cbdf11065fdf9eea77b19e8dd?width=84"
              alt="User avatar"
              className="w-10 h-10 rounded-lg flex-shrink-0"
            />
          </div>

          <div className="bg-app-light rounded-lg px-3 py-2 text-sm text-app-text-secondary whitespace-nowrap">
            {farsiDate}
          </div>
        </div>
      </div>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: 224,
          flexShrink: 0,
        }}
      >
        <TextField
          placeholder="جستجو"
          size="small"
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton edge="end" size="small">
                  <Search className="w-5 h-5" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
            },
          }}
        />
      </Box>
    </div>
  );
}
