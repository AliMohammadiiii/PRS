import { FC, useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  Icon,
  DocumentText,
  Setting2,
  NotificationBing,
  Lock1,
  ArrowDown2,
  ArrowUp2,
  Chart2,
} from 'iconsax-reactjs';
import { Box, Image, Typography } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { INITIAL_LIMIT } from 'src/shared/constants';
import { useAuth } from 'src/client/contexts/AuthContext';

// Logo will be loaded from assets or Figma URL
const sideBarLogo = 'https://www.figma.com/api/mcp/asset/3a702fa0-5a2c-4d61-b022-4632e612cbd7';

type MenuItemProps = {
  isActive: boolean;
  title: string;
  icon: Icon;
  disabled?: boolean;
  hasDropdown?: boolean;
  isExpanded?: boolean;
  onClick?: () => void;
};

const MenuItem: FC<MenuItemProps> = ({
  isActive,
  title,
  icon: Icon,
  disabled,
  hasDropdown,
  isExpanded,
  onClick,
}) => {
  return (
    <Box
      role="link"
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 4,
        py: 2,
        mb: 0.5,
        gap: 2,
        bgcolor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        borderRadius: 2,
        opacity: disabled ? '0.3' : '1',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        <Icon size={24} color="white" variant="Outline" />
        <Typography
          variant="body1"
          sx={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 500,
            textAlign: 'right',
          }}
        >
          {title}
        </Typography>
      </Box>
      {hasDropdown && (
        <>
          {isExpanded ? (
            <ArrowUp2 size={18} color="white" variant="Outline" />
          ) : (
            <ArrowDown2 size={18} color="white" variant="Outline" />
          )}
        </>
      )}
    </Box>
  );
};

type SubMenuItemProps = {
  isActive: boolean;
  title: string;
  to: string;
};

const SubMenuItem: FC<SubMenuItemProps> = ({ isActive, title, to }) => {
  return (
    <Link to={to}>
      {({ isActive: linkIsActive }: { isActive: boolean }) => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            pl: 8,
            pr: 4,
            py: 2,
            mb: 0.5,
            bgcolor: linkIsActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            borderRadius: 2,
            cursor: 'pointer',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              right: 32,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'white',
            },
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: 'white',
              fontSize: '16px',
              fontWeight: 500,
              textAlign: 'right',
            }}
          >
            {title}
          </Typography>
        </Box>
      )}
    </Link>
  );
};

interface SubMenuEntry {
  key: string;
  to: string;
  title: string;
}

interface MenuEntry {
  key: string;
  to: string;
  search?: Record<string, string | number>;
  title: string;
  icon: Icon;
  disabled?: boolean;
  hasDropdown?: boolean;
  subItems?: SubMenuEntry[];
}

// Admin menu configuration
const adminMenuConfig: MenuEntry[] = [
  {
    key: 'reports',
    to: '/reports',
    search: {
      page: 1,
      limit: INITIAL_LIMIT,
    },
    title: 'گزارش‌ها',
    icon: Chart2,
  },
  {
    key: 'define-basic-info',
    to: '/basic-info',
    title: 'تعریف اطلاعات پایه',
    icon: DocumentText,
    disabled: false,
  },
  {
    key: 'define-reports',
    to: '/',
    title: 'تعریف گزارش ها',
    icon: DocumentText,
    hasDropdown: true,
    disabled: false,
    subItems: [
      {
        key: 'define-group',
        to: '/groups',
        title: 'تعریف گروه',
      },
      {
        key: 'define-report-titles',
        to: '/report-titles',
        title: 'تعریف عناوین گزارشات',
      },
    ],
  },
  {
    key: 'define-operational',
    to: '/operations',
    title: 'تعریف عملیاتی',
    icon: Setting2,
    disabled: false,
  },
  {
    key: 'send-notification',
    to: '/',
    title: 'ارسال اعلان‌',
    icon: NotificationBing,
    disabled: true,
  },
  {
    key: 'change-password',
    to: '/change-password',
    title: 'تغییر رمز عبور',
    icon: Lock1,
    disabled: false,
  },
];

// Non-admin menu configuration (simplified)
const userMenuConfig: MenuEntry[] = [
  {
    key: 'reports',
    to: '/reports',
    search: {
      page: 1,
      limit: INITIAL_LIMIT,
    },
    title: 'گزارش‌ها',
    icon: Chart2,
  },
  {
    key: 'company-basic-info',
    to: '/company-basic-info',
    title: 'اطلاعات پایه شرکت',
    icon: DocumentText,
    disabled: false,
  },
  {
    key: 'notifications',
    to: '/',
    title: 'اعلان‌ها',
    icon: NotificationBing,
    disabled: true,
  },
  {
    key: 'change-password',
    to: '/change-password',
    title: 'تغییر رمز عبور',
    icon: Lock1,
    disabled: false,
  },
];

const SideBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  
  // Determine which menu config to use based on user type
  const isAdmin = user?.is_admin ?? false;
  const menuConfig = isAdmin ? adminMenuConfig : userMenuConfig;

  // Auto-expand menu if current route matches a sub-item
  useEffect(() => {
    const currentPath = location.pathname;
    menuConfig.forEach((menu) => {
      if (menu.subItems) {
        const hasActiveSubItem = menu.subItems.some((subItem) =>
          currentPath.startsWith(subItem.to)
        );
        if (hasActiveSubItem) {
          setExpandedMenus((prev) => new Set(prev).add(menu.key));
        }
      }
    });
  }, [location.pathname, menuConfig]);

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isSubItemActive = (subItem: SubMenuEntry): boolean => {
    return location.pathname.startsWith(subItem.to);
  };

  const isParentActive = (menu: MenuEntry): boolean => {
    if (menu.subItems) {
      return menu.subItems.some((subItem) => isSubItemActive(subItem));
    }
    return false;
  };

  return (
    <Box sx={{ bgcolor: '#181D26', color: 'white', height: '100%', px: 2 }}>
      <Box
        sx={{
          py: 6,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Image src={sideBarLogo} width="80px" height={53} objectFit="contain" />
      </Box>

      <nav>
        {menuConfig.map((menu) => {
          const { key, to, search, title, icon: Icon, disabled, hasDropdown, subItems } = menu;
          const isExpanded = expandedMenus.has(key);
          const isActive = isParentActive(menu);

          if (hasDropdown && subItems) {
            return (
              <Box key={key}>
                <MenuItem
                  isActive={isActive}
                  title={title}
                  icon={Icon}
                  disabled={disabled}
                  hasDropdown={hasDropdown}
                  isExpanded={isExpanded}
                  onClick={() => !disabled && toggleMenu(key)}
                />
                {isExpanded && !disabled && (
                  <Box>
                    {subItems.map((subItem) => (
                      <SubMenuItem
                        key={subItem.key}
                        isActive={isSubItemActive(subItem)}
                        title={subItem.title}
                        to={subItem.to}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          }

          return (
            <Link
              key={key}
              to={to}
              search={search}
              disabled={disabled}
              children={({ isActive: linkIsActive }: { isActive: boolean }) => (
                <MenuItem
                  isActive={disabled ? false : linkIsActive}
                  title={title}
                  icon={Icon}
                  disabled={disabled}
                  hasDropdown={hasDropdown}
                />
              )}
            />
          );
        })}
      </nav>
    </Box>
  );
};

export default SideBar;
