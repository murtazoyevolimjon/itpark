import { api } from './axios';

export type AITaskType =
  | 'dashboard_summary'
  | 'student_analysis'
  | 'attendance_analysis'
  | 'finance_analysis'
  | 'teacher_load'
  | 'teacher_methodology'
  | 'student_tutor'
  | 'chat_qa';

export interface AIAnalysisRequest {
  task_type: AITaskType | string;
  date_range?: string;
  user_question?: string;
  role?: string;
  context?: string;
  student_name?: string;
  course_name?: string;
  topic?: string;
  teacher_name?: string;
  prompt?: string;
  gemini_api_key?: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  result: string;
  source: 'gemini_ai' | 'builtin_engine';
  task_type: string;
}

export const aiApi = {
  analyze: async (data: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
    // Check if user stored custom Gemini key in localStorage
    const storedApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '';
    const payload = {
      ...data,
      gemini_api_key: data.gemini_api_key || storedApiKey,
    };
    const res = await api.post<AIAnalysisResponse>('/ai', payload);
    return res.data;
  },
};
