# MARKAZ CRM — O'quv Markazlari Uchun SaaS CRM Tizimi

Bu o'quv markazlari (IT-markaz, til markazlari, repetitorlik markazlari) uchun yaratilgan zamonaviy, ko'p-ijarachili (multi-tenant) SaaS CRM platformasi.

---

## 🛠 Texnologiyalar Steki

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **React Router v6** — sahifalar routingi
- **TanStack Query (React Query v5)** — server holatini boshqarish va kesh
- **Axios** — HTTP so'rovlar va token interseptorlari
- **Recharts** — Davomat va Moliya grafiklari
- **Pure HTML + CSS Modules** — Hech qanday tayyor UI kutubxonasi ishlatilmagan (Tailwind, MUI, Bootstrap Yo'q). Barcha komponentlar qo'lda yaratilgan.

### Backend
- **NestJS** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **JWT** (Access + Refresh Token) & **bcrypt** parollarni shifrlash
- **class-validator / class-transformer** — DTO validatsiyalari
- **Swagger UI** — `/api/docs` manzilida avtomatik API dokumentatsiya

---

## 🚀 Ishga Tushirish Yo'riqnomasi

### 1. Talablar (Prerequisites)
- **Node.js** (v18 yoki undan yuqori)
- **PostgreSQL** ma'lumotlar bazasi (standart port `5432`)

### 2. Kutubxonalarni O'rnatish
Monorepo ildiz papkasida:
```bash
npm run install:all
```

### 3. Atrof-muhit Sozlamalari (.env)
- `server/.env` faylida PostgreSQL `DATABASE_URL` va JWT kalitlarini ko'rsating:
  ```env
  PORT=5000
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm_db?schema=public"
  JWT_ACCESS_SECRET="super-secret-access-token-key-2026"
  JWT_REFRESH_SECRET="super-secret-refresh-token-key-2026"
  ```
- `client/.env` faylida API URL belgilang:
  ```env
  VITE_API_URL="http://localhost:5000/api"
  ```

### 4. Bazani Tayyorlash va Seed Qilish
```bash
# Prisma migratsiya va client generatsiya
npm run prisma:generate
npm run prisma:migrate

# Test ma'lumotlarini yuklash (Center, Courses, Groups, Teachers, Students, Payments, Attendance)
npm run prisma:seed
```

### 5. Loyihani Ishga Tushirish
Bitta buyruq bilan Frontend va Backend serverni parallel ishga tushirish:
```bash
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Swagger Docs**: http://localhost:5000/api/docs

---

## 🔑 Test Akkaunt Ma'lumotlari

Seed qilingan test markazga kirish uchun:
- **Email**: `admin@itpark.uz`
- **Parol**: `password123`
