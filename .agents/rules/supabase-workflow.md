# Supabase SQL Management Rule

## Core Directives
1. **Always Record SQL Changes in `supabase/` Folder**:
   - The master database schema is always kept up to date at `supabase/schema.sql`.
   - Whenever any database change (new table, new column, modified enum, updated constraint, RLS policy) is created or requested by the user, ALWAYS write/update the corresponding SQL scripts inside the `supabase/` folder (and create incremental migrations in `supabase/migrations/`).
2. **Full-Stack Next.js Architecture**:
   - The project uses Next.js 14 App Router with Supabase SDK (`@supabase/supabase-js`).
   - Server-side database calls are executed in `src/app/api/...` Route Handlers using `src/lib/supabase/server.ts`.
