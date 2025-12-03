import { apiRequest } from 'src/libs/apiRequest';

export type UiMode = 'FULL_DASHBOARD' | 'MESSENGER_ONLY';

export interface UiModeResponse {
  ui_mode: UiMode;
  username: string;
  is_staff: boolean;
}

export async function getUiMode(): Promise<UiModeResponse> {
  const res = await apiRequest.get<UiModeResponse>('/api/ui-mode/');
  return res.data;
}








