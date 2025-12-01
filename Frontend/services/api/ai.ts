import { apiRequest } from 'src/libs/apiRequest';

export interface Participant {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

export interface AiThread {
  id: string;
  title: string | null;
  request: string | null; // UUID of related purchase request
  last_message_at: string | null; // ISO date string
  participants: Participant[];
  message_count: number;
  last_message_preview: string | null;
  // PR linking fields (when thread is linked to a PurchaseRequest)
  request_id?: string | null;
  request_code?: string | null; // UUID string (same as request_id)
  request_status?: string | null;
  // Optional UI helpers (frontend only)
  unread_count?: number;
  category?: 'ALL' | 'CONTACTS' | 'INJAST' | 'UNIVERSITY' | 'PROXY';
}

export interface AiMessage {
  id: string;
  sender_type: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface RunAiResponse {
  orchestrator: {
    final_intent: string;
    confidence: number;
    handler_name: string;
    handler_result: Record<string, unknown>;
    debug: Record<string, unknown>;
  };
  ai_message: AiMessage;
}

export interface CreateThreadRequest {
  title?: string;
  request?: string; // Optional purchase request UUID
}

export async function getAiThreads(): Promise<AiThread[]> {
  const response = await apiRequest.get<AiThread[]>('/api/ai/threads/');
  return response.data;
}

export async function createAiThread(data?: CreateThreadRequest): Promise<AiThread> {
  const response = await apiRequest.post<AiThread>('/api/ai/threads/', data || {});
  return response.data;
}

export async function getThreadMessages(threadId: string): Promise<AiMessage[]> {
  const res = await apiRequest.get<AiMessage[]>(`/api/ai/threads/${threadId}/messages/`);
  return res.data;
}

export async function postThreadMessage(threadId: string, content: string): Promise<AiMessage> {
  const res = await apiRequest.post<AiMessage>(`/api/ai/threads/${threadId}/messages/`, {
    content,
  });
  return res.data;
}

export async function runAiOnThread(threadId: string): Promise<RunAiResponse> {
  const res = await apiRequest.post<RunAiResponse>(`/api/ai/threads/${threadId}/run/`, {});
  return res.data;
}

