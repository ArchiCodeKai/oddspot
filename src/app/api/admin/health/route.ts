import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getProductionReadiness } from "@/lib/ops/productionChecks";
import type { ApiResponse } from "@/types/api";

export const runtime = "nodejs";

interface HealthResponse {
  readiness: ReturnType<typeof getProductionReadiness>;
  database: {
    ok: boolean;
    error?: string;
  };
}

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "無權限" },
      { status: 403 },
    );
  }

  const database: HealthResponse["database"] = { ok: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database.ok = true;
  } catch (error) {
    database.error = error instanceof Error ? error.message : "資料庫連線失敗";
  }

  return NextResponse.json<ApiResponse<HealthResponse>>({
    data: {
      readiness: getProductionReadiness(),
      database,
    },
    success: true,
  });
}
