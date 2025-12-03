import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import logger from '@/lib/logger';
import { useAuth } from './AuthContext';
import { Team } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';

interface TeamContextType {
  selectedTeam: Team | null;
  selectedTeamId: string | null;
  teams: Team[];
  isLoading: boolean;
  selectTeam: (team: Team | null) => void;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const SELECTED_TEAM_KEY = 'prs_selected_team_id';

export function TeamProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setSelectedTeam(null);
      setSelectedTeamId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await prsApi.getTeams();
      const activeTeams = data.filter((t) => t.is_active);
      setTeams(activeTeams);

      const savedTeamId = sessionStorage.getItem(SELECTED_TEAM_KEY);
      if (savedTeamId && activeTeams.length > 0) {
        const savedTeam = activeTeams.find((t) => t.id === savedTeamId);
        if (savedTeam) {
          setSelectedTeam(savedTeam);
          setSelectedTeamId(savedTeam.id);
          return;
        }
      }

      if (activeTeams.length > 0) {
        // Default to the first active team if nothing is saved
        const firstTeam = activeTeams[0];
        setSelectedTeam(firstTeam);
        setSelectedTeamId(firstTeam.id);
        sessionStorage.setItem(SELECTED_TEAM_KEY, firstTeam.id);
      } else {
        setSelectedTeam(null);
        setSelectedTeamId(null);
        sessionStorage.removeItem(SELECTED_TEAM_KEY);
      }
    } catch (error) {
      logger.error('Error loading teams in TeamContext:', error);
      setTeams([]);
      setSelectedTeam(null);
      setSelectedTeamId(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const selectTeam = useCallback((team: Team | null) => {
    setSelectedTeam(team);
    const id = team?.id ?? null;
    setSelectedTeamId(id);
    if (id) {
      sessionStorage.setItem(SELECTED_TEAM_KEY, id);
    } else {
      sessionStorage.removeItem(SELECTED_TEAM_KEY);
    }
  }, []);

  const refreshTeams = useCallback(async () => {
    await loadTeams();
  }, [loadTeams]);

  return (
    <TeamContext.Provider
      value={{
        selectedTeam,
        selectedTeamId,
        teams,
        isLoading,
        selectTeam,
        refreshTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}












