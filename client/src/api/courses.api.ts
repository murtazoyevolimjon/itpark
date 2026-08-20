import { api } from './axios';
import { PaginatedResponse, Course } from '../types';

export const coursesApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Course>> => {
    const res = await api.get('/courses', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Course> => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Course> => {
    const res = await api.post('/courses', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Course> => {
    const res = await api.patch(`/courses/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/courses/${id}`);
    return res.data;
  },
};
