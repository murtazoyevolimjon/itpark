import { api } from './axios';
import { PaginatedResponse, Student } from '../types';

export const studentsApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Student>> => {
    const res = await api.get('/students', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Student> => {
    const res = await api.get(`/students/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Student> => {
    const res = await api.post('/students', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Student> => {
    const res = await api.patch(`/students/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },
};
