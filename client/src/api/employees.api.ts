import { api } from './axios';
import { PaginatedResponse, Employee } from '../types';

export const employeesApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Employee>> => {
    const res = await api.get('/employees', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Employee> => {
    const res = await api.get(`/employees/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Employee> => {
    const res = await api.post('/employees', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Employee> => {
    const res = await api.patch(`/employees/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/employees/${id}`);
    return res.data;
  },
};
