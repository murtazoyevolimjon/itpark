import { api } from './axios';

export interface CreateHomeworkPayload {
  groupId: string;
  groupName?: string;
  courseName?: string;
  title: string;
  desc?: string;
  deadline?: string;
  file?: {
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null;
  centerId?: string;
}

export interface SubmitHomeworkPayload {
  hwId: string;
  groupId: string;
  studentId?: string;
  studentName?: string;
  studentPhone?: string;
  submissionLink?: string;
  comment?: string;
  centerId?: string;
}

export interface GradeSubmissionPayload {
  submissionId: string;
  grade?: number;
  teacherFeedback?: string;
  status?: 'KUTILMOQDA' | 'BAHOLANDI';
}

export const homeworkApi = {
  getAll: async (params?: { groupId?: string; centerId?: string }) => {
    const res = await api.get('/homework', { params });
    return res.data;
  },

  create: async (data: CreateHomeworkPayload) => {
    const res = await api.post('/homework', data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/homework?id=${id}`);
    return res.data;
  },

  getSubmissions: async (params?: { hwId?: string; groupId?: string; studentId?: string; centerId?: string }) => {
    const res = await api.get('/homework/submissions', { params });
    return res.data;
  },

  submit: async (data: SubmitHomeworkPayload) => {
    const res = await api.post('/homework/submissions', data);
    return res.data;
  },

  gradeSubmission: async (data: GradeSubmissionPayload) => {
    const res = await api.patch('/homework/submissions', data);
    return res.data;
  },
};
