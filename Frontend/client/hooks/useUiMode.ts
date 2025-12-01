import { useQuery } from '@tanstack/react-query';
import { getUiMode } from 'src/services/api/uiMode';

export function useUiMode() {
  return useQuery({
    queryKey: ['uiMode'],
    queryFn: getUiMode,
  });
}




