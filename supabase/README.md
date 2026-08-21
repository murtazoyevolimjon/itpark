# Supabase Ma'lumotlar Bazasi va Migratsiyalar

Ushbu papka loyihaning barcha Supabase SQL so'rovlari va o'zgarishlar tarixini saqlaydi.

## Fayllar:
- **`schema.sql`**: Loyihaning to'liq, joriy ma'lumotlar bazasi sxemasi (Jadvallar, Bog'lanishlar, RLS qoidalari, Boshlang'ich Admin).
- **`migrations/`**: Kelgusida kiritiladigan har bir yangi o'zgarish (masalan: yangi jadval, ustun qo'shish) sana va tartib raqami bilan alohida faylda qayd etib boriladi.

## Qoida:
Har safar bazaga yangi jadval, ustun yoki o'zgarish kiritilganda:
1. `supabase/schema.sql` yangilanadi.
2. `supabase/migrations/` ichiga yangi migration SQL fayli qo'shiladi.
