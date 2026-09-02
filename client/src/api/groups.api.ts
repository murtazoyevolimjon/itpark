import { api } from './axios';
import { PaginatedResponse, Group } from '../types';

export const groupsApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Group>> => {
    const res = await api.get('/groups', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Group> => {
    const res = await api.get(`/groups/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Group> => {
    const res = await api.post('/groups', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Group> => {
    const res = await api.patch(`/groups/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/groups/${id}`);
    return res.data;
  },
  removeStudent: async (groupId: string, studentId: string) => {
    const res = await api.delete(`/groups/${groupId}/students/${studentId}`);
    return res.data;
  },
  addStudent: async (groupId: string, studentId: string) => {
    const res = await api.post(`/groups/${groupId}/students`, { studentId });
    return res.data;
  },
};
