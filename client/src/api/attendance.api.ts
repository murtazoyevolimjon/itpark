import { api } from './axios';

export const attendanceApi = {
  bulkSave: async (data: { groupId: string; date: string; records: any[] }) => {
    const res = await api.post('/attendance/bulk', data);
    return res.data;
  },
  getByGroup: async (groupId: string, dateOrFrom?: string, to?: string) => {
    const params: Record<string, string | undefined> = {};
    if (to) {
      params.from = dateOrFrom;
      params.to = to;
    } else if (dateOrFrom) {
      params.date = dateOrFrom;
      params.from = dateOrFrom;
    }
    const res = await api.get(`/attendance/group/${groupId}`, { params });
    return res.data;
  },
  getStats: async (params?: number | { days?: number; date?: string }) => {
    const queryParams = typeof params === 'number' ? { days: params } : params || { days: 7 };
    const res = await api.get('/attendance/stats', { params: queryParams });
    return res.data;
  },
};
