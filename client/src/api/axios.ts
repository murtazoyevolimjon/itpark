import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  // A hung server must surface as an error instead of an endless spinner
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // On developer pages the superadmin token must win over a stale center token left in the same browser
      const onSuperAdminArea =
        window.location.pathname.startsWith('/superadmin') || window.location.pathname.startsWith('/ai-assistant');
      const token = onSuperAdminArea
        ? localStorage.getItem('superadmin_token') || localStorage.getItem('token')
        : localStorage.getItem('token') || localStorage.getItem('superadmin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      if (!error.response) {
        console.error("❌ Serverga ulanib bo'lmadi:", error);
      } else if (error.response.status === 401) {
        const isSuperAdminPath = window.location.pathname.startsWith('/superadmin');
        if (isSuperAdminPath) {
          localStorage.removeItem('superadmin_token');
          localStorage.removeItem('superadmin_user');
          if (window.location.pathname !== '/superadmin/login') {
            window.location.href = '/superadmin/login';
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  },
);

