import { api } from './axios';
import { DashboardStats, FinanceSummary } from '../types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
  getAttendance: async (days: number = 30) => {
    const res = await api.get('/dashboard/attendance', { params: { days } });
    return res.data;
  },
  getFinanceSummary: async (): Promise<FinanceSummary> => {
    const res = await api.get('/finance/summary');
    return res.data;
  },
  getMonthlyIncome: async () => {
    const res = await api.get('/finance/monthly-income');
    return res.data;
  },
  getIncomeByCourse: async () => {
    const res = await api.get('/finance/income-by-course');
    return res.data;
  },
};
