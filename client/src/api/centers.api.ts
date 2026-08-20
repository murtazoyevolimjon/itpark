import { api } from './axios';

export const centersApi = {
  getProfile: async () => {
    const res = await api.get('/centers/profile');
    return res.data;
  },
  updateProfile: async (data: any) => {
    const res = await api.patch('/centers/profile', data);
    return res.data;
  },
  changePassword: async (data: any) => {
    const res = await api.patch('/centers/change-password', data);
    return res.data;
  },
};
