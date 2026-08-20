import { api } from './axios';
import { PaginatedResponse, Teacher } from '../types';

export const teachersApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Teacher>> => {
    const res = await api.get('/teachers', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Teacher> => {
    const res = await api.get(`/teachers/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Teacher> => {
    const res = await api.post('/teachers', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Teacher> => {
    const res = await api.patch(`/teachers/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/teachers/${id}`);
    return res.data;
  },
};
