import { api } from './axios';
import { PaginatedResponse, Room } from '../types';

export const roomsApi = {
  getAll: async (params?: any): Promise<PaginatedResponse<Room>> => {
    const res = await api.get('/rooms', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Room> => {
    const res = await api.get(`/rooms/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Room> => {
    const res = await api.post('/rooms', data);
    return res.data;
  },
  update: async (id: string, data: any): Promise<Room> => {
    const res = await api.patch(`/rooms/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/rooms/${id}`);
    return res.data;
  },
};
