import { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, CircularProgress } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { Team } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';

type TeamSelectorProps = {
  onTeamSelect: (teamId: string) => void;
  selectedTeamId?: string;
};

export default function TeamSelector({ onTeamSelect, selectedTeamId }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await prsApi.getTeams();
        setTeams(data.filter(team => team.is_active));
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'خطا در بارگذاری تیم‌ها';
        setError(errorMessage);
        logger.error('Error loading teams:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeams();
  }, []);

  const handleChange = (teamId: string) => {
    onTeamSelect(teamId);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: '#fee', borderRadius: 1, mb: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h2" fontWeight={700} color="text.primary" sx={{ mb: 2 }}>
        انتخاب تیم
      </Typography>
      <Select
        fullWidth
        height={48}
        value={selectedTeamId || ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="تیم را انتخاب کنید"
        size="small"
      >
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>
            {team.name}
          </MenuItem>
        ))}
      </Select>
      {teams.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          هیچ تیم فعالی یافت نشد
        </Typography>
      )}
    </Box>
  );
}

