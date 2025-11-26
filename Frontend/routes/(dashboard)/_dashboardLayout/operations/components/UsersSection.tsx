import { FC, useState, useEffect } from 'react';
import logger from "@/lib/logger";
import { Box, Button, Typography, CircularProgress } from 'injast-core/components';
import { User } from 'src/types/operations';
import { BasicInfoItem } from 'src/types/basicInfo';
import { UsersTable } from './UsersTable';
import { AddUserModal } from './AddUserModal';
import { Plus } from 'lucide-react';
import * as userApi from 'src/services/api/users';
import * as accessScopeApi from 'src/services/api/accessScopes';
import { User as ApiUser } from 'src/types/api/users';
import { AccessScope } from 'src/types/api/accessScopes';
import { Team } from 'src/types/api/prs';

type UsersSectionProps = {
  roles: BasicInfoItem[]; // position-in-company items
  teams: Team[];
};

// Helper function to map backend User + access scopes to frontend User
function mapApiUserToUser(apiUser: ApiUser, accessScopes: AccessScope[]): User {
  const userScopes = accessScopes.filter(
    (scope) => scope.user === apiUser.id && scope.is_active
  );

  // Build full list of team/role assignments for this user (only team-based scopes are relevant here)
  const assignments =
    userScopes
      .filter((scope) => scope.team)
      .map((scope) => ({
        teamId: scope.team || null,
        teamName: scope.team_name || '',
        roleId: scope.role,
        roleTitle: scope.role_title || '',
        isActive: scope.is_active,
      })) || [];

  // Prefer a team-based primary scope for PRS; fall back to any active scope
  const primaryScope =
    assignments.length > 0
      ? assignments[0]
      : userScopes[0]
        ? {
            teamId: userScopes[0].team || null,
            teamName: userScopes[0].team_name || '',
            roleId: userScopes[0].role,
            roleTitle: userScopes[0].role_title || '',
            isActive: userScopes[0].is_active,
          }
        : undefined;

  return {
    id: apiUser.id,
    username: apiUser.username,
    name: `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim() || apiUser.username,
    nationalId: apiUser.national_code || '',
    phoneNumber: apiUser.mobile_phone || '',
    // Keep primary role/team fields for backwards compatibility in the UI
    role: primaryScope?.roleId || '',
    // Reuse organizationId as primary team ID for PRS UI
    organizationId: primaryScope?.teamId || undefined,
    teamName: primaryScope?.teamName || '',
    assignments,
    isActive: apiUser.is_active,
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
  };
}

const UsersSection: FC<UsersSectionProps> = ({ roles, teams }) => {
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
        await userApi.updateUser(userData.id, updateData);
        
        // Handle multiple access scopes
        const assignments = userData.assignments || [];
        if (assignments.length > 0) {
          // Get all existing scopes for this user
          const allScopes = await accessScopeApi.getAccessScopes();
          const userScopes = allScopes.filter((s) => s.user === userData.id);
          
          // Create or update scopes based on assignments
          for (const assignment of assignments) {
            if (assignment.teamId && assignment.roleId) {
              const role = roles.find((r) => r.id === assignment.roleId);
              if (role) {
                // Check if scope already exists for this team
                const existingScope = userScopes.find((s) => s.team === assignment.teamId);
                if (existingScope) {
                  // Update existing scope
                  await accessScopeApi.updateAccessScope(existingScope.id, {
                    team: assignment.teamId,
                    role: assignment.roleId,
                    position_title: role.title,
                    is_active: assignment.isActive !== false,
                  });
                } else {
                  // Create new scope
                  await accessScopeApi.createAccessScope({
                    user: userData.id,
                    team: assignment.teamId,
                    role: assignment.roleId,
                    position_title: role.title,
                    is_active: assignment.isActive !== false,
                  });
                }
              }
            }
          }
          
          // Deactivate scopes that are no longer in assignments
          const activeTeamIds = assignments.map(a => a.teamId).filter(Boolean);
          for (const scope of userScopes) {
            if (scope.team && !activeTeamIds.includes(scope.team)) {
              await accessScopeApi.updateAccessScope(scope.id, {
                is_active: false,
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
          // Create access scopes for existing user
          const assignments = userData.assignments || [];
          for (const assignment of assignments) {
            if (assignment.teamId && assignment.roleId) {
              const role = roles.find((r) => r.id === assignment.roleId);
              if (role) {
                await accessScopeApi.createAccessScope({
                  user: userData.id,
                  team: assignment.teamId,
                  role: assignment.roleId,
                  position_title: role.title,
                  is_active: assignment.isActive !== false,
                });
              }
            }
          }
        } else {
          // Create new user
          const nameParts = (userData.name || '').split(' ');
          const createData = {
            username: userData.username || userData.nationalId || `user_${Date.now()}`,
            password: userData.password || 'TempPassword123!',
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            national_code: userData.nationalId || '',
            mobile_phone: userData.phoneNumber || '',
            is_active: userData.isActive,
          };
          const created = await userApi.createUser(createData);

          // Create access scopes for all assignments
          const assignments = userData.assignments || [];
          for (const assignment of assignments) {
            if (assignment.teamId && assignment.roleId) {
              const role = roles.find((r) => r.id === assignment.roleId);
              if (role) {
                await accessScopeApi.createAccessScope({
                  user: created.id,
                  team: assignment.teamId,
                  role: assignment.roleId,
                  position_title: role.title,
                  is_active: true,
                });
              }
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
          roles={roles}
          teams={teams}
          onEdit={handleEdit}
        />
      )}

      <AddUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSubmit}
        initialData={editingUser}
        teams={teams}
        roles={roles}
        existingUsers={existingUsers}
      />
    </Box>
  );
};

export default UsersSection;
