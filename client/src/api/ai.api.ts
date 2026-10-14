import { api } from './axios';

export type AITaskType =
  | 'dashboard_summary'
  | 'student_analysis'
  | 'attendance_analysis'
  | 'finance_analysis'
  | 'teacher_load'
  | 'chat_qa';

export interface AIAnalysisRequest {
  task_type: AITaskType;
  date_range?: string;
  user_question?: string;
  prompt?: string;
  gemini_api_key?: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  result: string;
  response?: string;
  text?: string;
  message?: string;
  source: 'gemini_ai' | 'builtin_engine';
  task_type: AITaskType;
}

export const aiApi = {
  analyze: async (data: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
    // Check if user stored custom Gemini key in localStorage
    const storedApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '';
    const superadminToken = typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') : null;
    const regularToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const activeToken = regularToken || superadminToken;

    const payload = {
      ...data,
      gemini_api_key: data.gemini_api_key || storedApiKey,
    };

    const headers: Record<string, string> = {};
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await api.post<AIAnalysisResponse>('/ai', payload, { headers });
    return res.data;
  },
};
