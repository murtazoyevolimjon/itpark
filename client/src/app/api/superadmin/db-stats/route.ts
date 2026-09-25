import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminAuth } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Supabase Free plan: 500 MB database limit
    const FREE_PLAN_LIMIT_BYTES = 500 * 1024 * 1024;

    let totalBytes = 0;
    let tableSizes: Array<{ table: string; sizeBytes: number; prettySize: string }> = [];

    // Attempt 1: Try RPC functions (requires migration 03 to be applied)
    try {
      const { data: dbSizeData, error: dbSizeError } = await supabase.rpc('get_db_size' as any);
      if (!dbSizeError && dbSizeData != null) {
        totalBytes = Number(dbSizeData) || 0;
      }
    } catch (_) {
      // RPC not available yet — will use fallback below
    }

    try {
      const { data: tableSizeData, error: tableSizeError } = await supabase.rpc('get_table_sizes' as any);
      if (!tableSizeError && Array.isArray(tableSizeData)) {
        tableSizes = (tableSizeData as any[]).map((row: any) => ({
          table: row.table_name,
          sizeBytes: Number(row.size_bytes) || 0,
          prettySize: row.pretty_size || '0 bytes',
        }));
      }
    } catch (_) {
      // RPC not available yet
    }

    // Get row counts for main tables
    const tableNames = ['users', 'centers', 'teachers', 'students', 'groups', 'attendance', 'payments', 'expenses'];
    const rowCounts: Record<string, number> = {};

    await Promise.all(
      tableNames.map(async (tableName) => {
        try {
          const { count } = await supabase
            .from(tableName as any)
            .select('*', { count: 'exact', head: true });
          rowCounts[tableName] = count || 0;
        } catch (_) {
          rowCounts[tableName] = 0;
        }
      })
    );

    // Fallback size estimation when RPC not yet available:
    // Supabase stores ~400–800 bytes per row depending on table
    if (totalBytes === 0) {
      const sizeWeights: Record<string, number> = {
        students: 600,
        attendance: 300,
        payments: 500,
        groups: 400,
        teachers: 550,
        users: 500,
        expenses: 450,
        centers: 800,
      };
      let estimated = 0;
      for (const [table, count] of Object.entries(rowCounts)) {
        estimated += count * (sizeWeights[table] || 400);
      }
      // Add ~5 MB base for system tables, indexes, etc.
      totalBytes = estimated + 5 * 1024 * 1024;
    }

    const usedMB = totalBytes / (1024 * 1024);
    const limitMB = FREE_PLAN_LIMIT_BYTES / (1024 * 1024);
    const usagePercent = Math.min((totalBytes / FREE_PLAN_LIMIT_BYTES) * 100, 100);

    return NextResponse.json({
      totalBytes,
      usedMB: parseFloat(usedMB.toFixed(2)),
      limitMB,
      usagePercent: parseFloat(usagePercent.toFixed(1)),
      tableSizes,
      rowCounts,
      plan: 'Free',
      planLimitBytes: FREE_PLAN_LIMIT_BYTES,
      rpcAvailable: tableSizes.length > 0,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
