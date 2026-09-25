import axios from 'axios';

export const superadminClient = axios.create({
  baseURL: '/api/superadmin',
  headers: {
    'Content-Type': 'application/json',
  },
});

superadminClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('superadmin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

superadminClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('superadmin_token');
      localStorage.removeItem('superadmin_user');
      if (window.location.pathname.startsWith('/superadmin') && window.location.pathname !== '/superadmin/login') {
        window.location.href = '/superadmin/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface CreateCenterDto {
  name: string;
  phone: string;
  login: string;
  adminName?: string;
  password: string;
}

export interface UpdateCenterDto {
  name?: string;
  phone?: string;
  adminName?: string;
  newPassword?: string;
}

export const superadminApi = {
  login: async (data: { login: string; password: string }) => {
    const res = await superadminClient.post('/login', data);
    return res.data;
  },
  getMe: async () => {
    const res = await superadminClient.get('/me');
    return res.data;
  },
  getCenters: async () => {
    const res = await superadminClient.get('/centers');
    return res.data;
  },
  getCenterById: async (id: string) => {
    const res = await superadminClient.get(`/centers/${id}`);
    return res.data;
  },
  createCenter: async (data: CreateCenterDto) => {
    const res = await superadminClient.post('/centers', data);
    return res.data;
  },
  updateCenter: async (id: string, data: UpdateCenterDto) => {
    const res = await superadminClient.patch(`/centers/${id}`, data);
    return res.data;
  },
  deleteCenter: async (id: string) => {
    const res = await superadminClient.delete(`/centers/${id}`);
    return res.data;
  },
  impersonateCenter: async (centerId: string) => {
    const res = await superadminClient.post('/impersonate', { centerId });
    return res.data;
  },
  getDbStats: async () => {
    const res = await superadminClient.get('/db-stats');
    return res.data;
  },
};
