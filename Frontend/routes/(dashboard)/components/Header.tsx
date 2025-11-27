import { LogoutCurve, ArrowDown2 } from 'iconsax-reactjs';
import logger from "@/lib/logger";
import {
  Box,
  Grid,
  IconButton,
  Typography,
  Select,
  MenuItem,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { longFormatInWords } from 'injast-core/utils';
import { useAuth } from 'src/client/contexts/AuthContext';
import { useCompany } from 'src/client/contexts/CompanyContext';
import { useTeam } from 'src/client/contexts/TeamContext';
import { useNavigate } from '@tanstack/react-router';

const Header = () => {
  const { user, logout } = useAuth();
  const { selectedCompany, accessibleCompanies, selectCompany } = useCompany();
  const { selectedTeam, teams, selectTeam } = useTeam();
  const navigate = useNavigate();

  const getToday = () => {
    const persianWeekday = new Date(Date.now()).toLocaleDateString('fa-IR', {
      weekday: 'long',
    });

    const d = longFormatInWords(Date.now(), {
      dayInWord: false,
      monthInWord: true,
      yearInWord: false,
      showTime: false,
      separator: '',
    });
    return `${persianWeekday} ${d}`;
  };

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  const displayName = user
    ? `${user.username}${user.is_admin ? ' (مدیر)' : ''}`
    : 'کاربر';
  const displayRole = user && user.roles.length > 0
    ? user.roles[0]
    : 'کاربر سیستم';

  const isNormalUser = user && !user.is_admin;

  return (
    <>
      <Grid container alignItems="center" height={82}>
        <Grid
          size={12}
          id="header_content"
          py={4.5}
          px={3}
          style={{
            backgroundColor: 'white',
          }}
        >
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            width={'100%'}
          >
            <Grid
              size={12}
              display={'flex'}
              alignItems={'center'}
              justifyContent={'flex-end'}
              gap={2}
            >
              <Box
                bgcolor={defaultColors.neutral[50]}
                py={2.5}
                px={2}
                borderRadius={2}
              >
                <Typography color="neutral.main">{getToday()}</Typography>
              </Box>

              {isNormalUser && (
                <>
                  {/* Company Dropdown */}
                  {accessibleCompanies.length > 0 && (
                    <Select
                      value={selectedCompany?.id || ''}
                      onChange={(e) => {
                        const company = accessibleCompanies.find(
                          (c) => c.id === e.target.value
                        );
                        if (company) {
                          selectCompany(company);
                        }
                      }}
                      size="small"
                      height={48}
                      sx={{
                        minWidth: 192,
                        bgcolor: defaultColors.neutral[50],
                        borderRadius: 1,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: defaultColors.neutral[300],
                        },
                        '& .MuiSelect-select': {
                          py: 2,
                          px: 1.5,
                          fontSize: '14px',
                          color: defaultColors.neutral.main,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                        },
                      }}
                      IconComponent={() => (
                        <ArrowDown2
                          size={20}
                          color={defaultColors.neutral.main}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    >
                      {accessibleCompanies.map((company) => (
                        <MenuItem key={company.id} value={company.id}>
                          {company.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}

                  {/* Team Dropdown (PRS) */}
                  {teams.length > 0 && (
                    <Select
                      value={selectedTeam?.id && teams.some(t => t.id === selectedTeam.id) ? selectedTeam.id : ''}
                      onChange={(e) => {
                        const team = teams.find((t) => t.id === e.target.value);
                        if (team) {
                          selectTeam(team);
                        }
                      }}
                      size="small"
                      height={48}
                      displayEmpty
                      sx={{
                        minWidth: 150,
                        bgcolor: defaultColors.neutral[50],
                        borderRadius: 1,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: defaultColors.neutral[300],
                        },
                        '& .MuiSelect-select': {
                          py: 2,
                          px: 1.5,
                          fontSize: '14px',
                          color: defaultColors.neutral.main,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                        },
                      }}
                      IconComponent={() => (
                        <ArrowDown2
                          size={20}
                          color={defaultColors.neutral.main}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    >
                      {teams.map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                </>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="body2"
                    sx={{ color: defaultColors.neutral.main, fontSize: '14px', fontWeight: 500 }}
                  >
                    {displayName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: defaultColors.neutral.light, fontSize: '12px' }}
                  >
                    {displayRole}
                  </Typography>
                </Box>
              </Box>

              <IconButton
                onClick={handleLogout}
                sx={{
                  bgcolor: defaultColors.neutral[50],
                  p: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                <LogoutCurve size="24" color={defaultColors.neutral.main} />
              </IconButton>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default Header;
