import { api } from './axios';

export const attendanceApi = {
  bulkSave: async (data: { groupId: string; date: string; records: any[] }) => {
    const res = await api.post('/attendance/bulk', data);
    return res.data;
  },
  getByGroup: async (groupId: string, from?: string, to?: string) => {
    const res = await api.get(`/attendance/group/${groupId}`, { params: { from, to } });
    return res.data;
  },
  getStats: async (params?: number | { days?: number; date?: string }) => {
    const queryParams = typeof params === 'number' ? { days: params } : params || { days: 7 };
    const res = await api.get('/attendance/stats', { params: queryParams });
    return res.data;
  },
};
