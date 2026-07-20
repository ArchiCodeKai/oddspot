import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminSession } from "@/lib/admin";
import type { ApiResponse } from "@/types/api";

// 過期 pending 清理（admin 手動觸發，不做 cron，見 AD-6）
// GET：回傳將被清理的筆數，給前端顯示與二次確認
// POST：刪除 expiresAt < now 且 status=pending 的 spot，Blob 圖片 best-effort 清理

function expiredPendingWhere(now: Date) {
  return { status: "pending", expiresAt: { lt: now } };
}

function getBlobImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string =>
      typeof value === "string" &&
      (value.startsWith("https://") || value.startsWith("spots/"))
    );
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "無權限" },
      { status: 403 }
    );
  }

  try {
    const count = await prisma.spot.count({ where: expiredPendingWhere(new Date()) });
    return NextResponse.json<ApiResponse<{ count: number }>>({
      data: { count },
      success: true,
    });
  } catch (error) {
    console.error("[GET /api/admin/cleanup]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "查詢失敗" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "無權限" },
      { status: 403 }
    );
  }

  try {
    const now = new Date();
    const expired = await prisma.spot.findMany({
      where: expiredPendingWhere(now),
      select: { id: true, images: true },
    });

    if (expired.length === 0) {
      return NextResponse.json<ApiResponse<{ deleted: number; blobFailed: number }>>({
        data: { deleted: 0, blobFailed: 0 },
        success: true,
      });
    }

    const blobImages = expired.flatMap((spot) => getBlobImages(spot.images));

    // 先刪 DB（權威記錄），Blob 再 best-effort 清理，比照 reject 現行模式
    const result = await prisma.spot.deleteMany({
      where: { id: { in: expired.map((spot) => spot.id) } },
    });

    let blobFailed = 0;
    if (blobImages.length > 0) {
      const deleteResults = await Promise.allSettled(blobImages.map((image) => del(image)));
      blobFailed = deleteResults.filter((r) => r.status === "rejected").length;
      if (blobFailed > 0) {
        console.error(
          `[POST /api/admin/cleanup] Blob 清理部分失敗：${blobFailed}/${blobImages.length}（DB 已刪除，殘留圖片待後續清理）`
        );
      }
    }

    return NextResponse.json<ApiResponse<{ deleted: number; blobFailed: number }>>({
      data: { deleted: result.count, blobFailed },
      success: true,
    });
  } catch (error) {
    console.error("[POST /api/admin/cleanup]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "清理失敗" },
      { status: 500 }
    );
  }
}
