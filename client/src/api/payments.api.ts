import { api } from './axios';
import { PaginatedResponse, Payment } from '../types';

export const paymentsApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Payment>> => {
    const res = await api.get('/payments', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Payment> => {
    const res = await api.get(`/payments/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Payment> => {
    const res = await api.post('/payments', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Payment> => {
    const res = await api.patch(`/payments/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/payments/${id}`);
    return res.data;
  },
};
