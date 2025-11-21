import { FC, useState, useEffect } from 'react';
import logger from "@/lib/logger";
import { Box, Button, Typography, CircularProgress } from 'injast-core/components';
import { User, Organization } from 'src/types/operations';
import { BasicInfoItem } from 'src/types/basicInfo';
import { UsersTable } from './UsersTable';
import { AddUserModal } from './AddUserModal';
import { Plus } from 'lucide-react';
import * as userApi from 'src/services/api/users';
import * as accessScopeApi from 'src/services/api/accessScopes';
import { User as ApiUser } from 'src/types/api/users';
import { AccessScope } from 'src/types/api/accessScopes';

type UsersSectionProps = {
  organizations: Organization[];
  roles: BasicInfoItem[]; // position-in-company items
};

// Helper function to map backend User to frontend User
function mapApiUserToUser(apiUser: ApiUser, accessScopes: AccessScope[]): User {
  const userScope = accessScopes.find((scope) => scope.user === apiUser.id);
  return {
    id: apiUser.id,
    name: `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim() || apiUser.username,
    nationalId: apiUser.national_code || '',
    phoneNumber: apiUser.mobile_phone || '',
    role: userScope?.role_title || '',
    organizationId: userScope?.org_node || undefined,
    isActive: apiUser.is_active,
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
  };
}

const UsersSection: FC<UsersSectionProps> = ({ organizations, roles }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [existingUsers, setExistingUsers] = useState<ApiUser[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users from API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [apiUsers, accessScopes] = await Promise.all([
          userApi.getUsers(),
          accessScopeApi.getAccessScopes(),
        ]);
        // Store existing users for the modal
        setExistingUsers(apiUsers);
        const mapped = apiUsers.map((apiUser) => mapApiUserToUser(apiUser, accessScopes));
        setUsers(mapped);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          'خطا در بارگذاری کاربران'
        );
        logger.error('Error loading users:',  err);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleAdd = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setEditingUser(user);
      setModalOpen(true);
    }
  };

  const handleSubmit = async (userData: User) => {
    try {
      if (editingUser) {
        // Update user
        const updateData = {
          first_name: userData.name.split(' ')[0] || '',
          last_name: userData.name.split(' ').slice(1).join(' ') || '',
          national_code: userData.nationalId || '',
          mobile_phone: userData.phoneNumber || '',
          is_active: userData.isActive,
        };
        const updated = await userApi.updateUser(userData.id, updateData);
        
        // Update access scope if organization or role changed
        if (userData.organizationId || userData.role) {
          const scopes = await accessScopeApi.getAccessScopes();
          const userScope = scopes.find((s) => s.user === userData.id);
          if (userScope) {
            const role = roles.find((r) => r.id === userData.role);
            if (role) {
              await accessScopeApi.updateAccessScope(userScope.id, {
                org_node: userData.organizationId || null,
                role: role.id,
                position_title: role.title,
              });
            }
          }
        }

        // Reload users
        const [apiUsers, accessScopes] = await Promise.all([
          userApi.getUsers(),
          accessScopeApi.getAccessScopes(),
        ]);
        const mapped = apiUsers.map((apiUser) => mapApiUserToUser(apiUser, accessScopes));
        setUsers(mapped);
      } else {
        // Check if creating new user or access scope for existing user
        if (userData.userType === 'existing' && userData.id) {
          // Create access scope for existing user
          if (userData.organizationId && userData.role) {
            const role = roles.find((r) => r.id === userData.role);
            if (role) {
              await accessScopeApi.createAccessScope({
                user: userData.id,
                org_node: userData.organizationId,
                role: role.id,
                position_title: role.title,
                is_active: userData.isActive,
              });
            }
          }
        } else {
          // Create new user
          const nameParts = (userData.name || '').split(' ');
          const createData = {
            username: userData.nationalId || `user_${Date.now()}`,
            password: userData.password || 'TempPassword123!',
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            national_code: userData.nationalId || '',
            mobile_phone: userData.phoneNumber || '',
            is_active: userData.isActive,
          };
          const created = await userApi.createUser(createData);

          // Create access scope if organization and role provided
          if (userData.organizationId && userData.role) {
            const role = roles.find((r) => r.id === userData.role);
            if (role) {
              await accessScopeApi.createAccessScope({
                user: created.id,
                org_node: userData.organizationId,
                role: role.id,
                position_title: role.title,
                is_active: true,
              });
            }
          }
        }

        // Reload users
        const [apiUsers, accessScopes] = await Promise.all([
          userApi.getUsers(),
          accessScopeApi.getAccessScopes(),
        ]);
        setExistingUsers(apiUsers);
        const mapped = apiUsers.map((apiUser) => mapApiUserToUser(apiUser, accessScopes));
        setUsers(mapped);
      }
      setModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail ||
        err.message ||
        'خطا در ذخیره کاربر'
      );
    }
  };


  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
        px: 4,
        py: 6,
        mt: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'neutral.secondary',
          }}
        >
          کاربران تعریف شده
        </Typography>
        <Button
          onClick={handleAdd}
          variant="contained"
          color="primary"
          buttonSize="S"
          sx={{ borderRadius: 1 }}
          startIcon={<Plus size={20} />}
        >
          افزودن کاربر
        </Button>
      </Box>

      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box
          sx={{
            p: 2,
            bgcolor: '#fee',
            borderRadius: 1,
            border: '1px solid #fcc',
          }}
        >
          <Typography
            sx={{
              color: '#c00',
              textAlign: 'center',
            }}
          >
            {error}
          </Typography>
        </Box>
      ) : (
        <UsersTable
          users={users}
          organizations={organizations}
          roles={roles}
          onEdit={handleEdit}
        />
      )}

      <AddUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSubmit}
        initialData={editingUser}
        organizations={organizations}
        roles={roles}
        existingUsers={existingUsers}
      />
    </Box>
  );
};

export default UsersSection;
