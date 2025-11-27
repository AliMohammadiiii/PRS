import { FC, useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Icon, Setting2, Lock1, ArrowDown2, ArrowUp2, AddSquare, DocumentText1, TickCircle, Wallet3 } from 'iconsax-reactjs';
import { Box, Image, Typography } from 'injast-core/components';
import { useAuth } from 'src/client/contexts/AuthContext';
import { hasRole, isRequesterOnlyUser } from 'src/shared/utils/prsUtils';

// Logo - served from Vite/React `public` folder root
const sideBarLogo = '/Navigationlogo.svg';

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

const SubMenuItem: FC<SubMenuItemProps> = ({ title, to }) => {
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
    key: 'prs-new-request',
    to: '/prs/requests/new',
    title: 'ثبت درخواست خرید',
    icon: AddSquare,
    disabled: false,
  },
  {
    key: 'prs-my-requests',
    to: '/prs/my-requests',
    // Admin sees global list, so label is generic
    title: 'درخواست‌ها',
    icon: DocumentText1,
    disabled: false,
  },
  {
    key: 'prs-inbox',
    to: '/prs/inbox',
    // Admin sees global approvals inbox, so label is generic
    title: 'تأییدها',
    icon: TickCircle,
    disabled: false,
  },
  {
    key: 'prs-finance',
    to: '/prs/finance',
    title: 'صندوق مالی',
    icon: Wallet3,
    disabled: false,
  },
  {
    key: 'prs-admin-operations',
    to: '/operations',
    title: 'مدیریت کاربران',
    icon: Setting2,
    disabled: false,
  },
  // UA-03: Admin navigation – admin-only configuration / management pages.
  // Admins should be able to manage PRS-related master data in addition to
  // using requester/approver features.
  {
    key: 'prs-admin-teams',
    to: '/prs/admin/teams',
    title: 'مدیریت تیم‌ها',
    icon: Setting2,
    disabled: false,
  },
  {
    key: 'prs-admin-form-templates',
    to: '/prs/admin/form-templates',
    title: 'قالب‌های فرم',
    icon: Setting2,
    disabled: false,
  },
  {
    key: 'prs-admin-workflows',
    to: '/prs/admin/workflows',
    title: 'گردش‌های کار',
    icon: Setting2,
    disabled: false,
  },
  {
    key: 'prs-admin-team-configs',
    to: '/prs/admin/team-configs',
    title: 'تنظیمات تیم‌ها',
    icon: Setting2,
    disabled: false,
  },
  {
    key: 'change-password',
    to: '/change-password',
    title: 'تغییر رمز عبور',
    icon: Lock1,
    disabled: false,
  },
];

// Requester-only menu configuration
// (UA-01: "ثبت درخواست خرید" + "درخواست‌های من")
const requesterMenuConfig: MenuEntry[] = [
  {
    key: 'prs-new-request',
    to: '/prs/requests/new',
    title: 'ثبت درخواست خرید',
    icon: AddSquare,
    disabled: false,
  },
  {
    key: 'prs-my-requests',
    to: '/prs/my-requests',
    title: 'درخواست‌های من',
    icon: DocumentText1,
    disabled: false,
  },
];

// Approver (non-admin) menu configuration:
// Focus on approvals inbox; optionally allow "My Requests".
const approverMenuConfig: MenuEntry[] = [
  {
    key: 'prs-inbox',
    to: '/prs/inbox',
    title: 'تأییدهای من',
    icon: TickCircle,
    disabled: false,
  },
  {
    key: 'prs-my-requests',
    to: '/prs/my-requests',
    title: 'درخواست‌های من',
    icon: DocumentText1,
    disabled: false,
  },
  {
    key: 'change-password',
    to: '/change-password',
    title: 'تغییر رمز عبور',
    icon: Lock1,
    disabled: false,
  },
];

// Finance-only menu configuration:
// Focus on finance inbox; optionally allow "My Requests".
const financeMenuConfig: MenuEntry[] = [
  {
    key: 'prs-finance',
    to: '/prs/finance',
    title: 'صندوق مالی',
    icon: Wallet3,
    disabled: false,
  },
  {
    key: 'prs-my-requests',
    to: '/prs/my-requests',
    title: 'درخواست‌های من',
    icon: DocumentText1,
    disabled: false,
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

  // Determine which menu config to use based on user type / roles
  const isAdmin = user?.is_admin ?? false;
  const isApprover = !!user && hasRole(user, 'APPROVER');
  const isFinance = !!user && hasRole(user, 'FINANCE');
  const isRequesterOnly = !!user && isRequesterOnlyUser(user);

  let menuConfig: MenuEntry[] = adminMenuConfig;
  if (!isAdmin) {
    if (isFinance) {
      menuConfig = financeMenuConfig;
    } else if (isApprover) {
      menuConfig = approverMenuConfig;
    } else if (isRequesterOnly) {
      menuConfig = requesterMenuConfig;
    } else {
      // Fallback for unknown role patterns: use requester menu (safe default)
      menuConfig = requesterMenuConfig;
    }
  }

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
