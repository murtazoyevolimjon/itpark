-- Migration: Add helper RPC functions for database size monitoring
-- These functions allow the superadmin to view database size metrics

-- Function 1: Get total database size in bytes
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT pg_database_size(current_database())::BIGINT;
$$;

-- Grant execute to service role and anon (API will authenticate via JWT)
GRANT EXECUTE ON FUNCTION get_db_size() TO service_role;
GRANT EXECUTE ON FUNCTION get_db_size() TO anon;
GRANT EXECUTE ON FUNCTION get_db_size() TO authenticated;

-- Function 2: Get table sizes (name, size in bytes, pretty size)
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(table_name TEXT, size_bytes BIGINT, pretty_size TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    relname::TEXT AS table_name,
    pg_total_relation_size(oid)::BIGINT AS size_bytes,
    pg_size_pretty(pg_total_relation_size(oid))::TEXT AS pretty_size
  FROM pg_class
  WHERE relkind = 'r'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ORDER BY size_bytes DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION get_table_sizes() TO service_role;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO anon;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated;
