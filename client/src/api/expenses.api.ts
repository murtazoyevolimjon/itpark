import { api } from './axios';
import { PaginatedResponse, Expense } from '../types';

export const expensesApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Expense>> => {
    const res = await api.get('/expenses', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Expense> => {
    const res = await api.get(`/expenses/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Expense> => {
    const res = await api.post('/expenses', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Expense> => {
    const res = await api.patch(`/expenses/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/expenses/${id}`);
    return res.data;
  },
};
