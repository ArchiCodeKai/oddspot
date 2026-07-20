import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { cuidSchema, adminActionSchema, formatZodError } from "@/lib/validation";
import { isAdminSession } from "@/lib/admin";
import type { ApiResponse } from "@/types/api";

// reject 未填原因時的預設文案
const DEFAULT_REJECT_REASON = "未符合收錄標準";

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

// 審核景點：approve（通過）或 reject（拒絕並清掉 Blob 圖片）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!isAdminSession(session)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "無權限" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const idCheck = cuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "無效 ID 格式" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = adminActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: `輸入驗證失敗：${formatZodError(parsed.error)}` },
        { status: 400 }
      );
    }
    const { action, rejectReason } = parsed.data;

    if (action === "approve") {
      const spot = await prisma.spot.update({
        where: { id },
        data: { status: "active", expiresAt: null },
        select: { id: true, name: true, status: true },
      });
      return NextResponse.json<ApiResponse<typeof spot>>({ data: spot, success: true });
    }

    // 走到這裡 action 必為 "reject"（zod 已限定 enum）
    const existing = await prisma.spot.findUnique({
      where: { id },
      select: { id: true, name: true, images: true },
    });
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "找不到景點" },
        { status: 404 }
      );
    }

    // 先記下要清的圖片，因為等下 DB 會把 images 清空
    const blobImages = getBlobImages(existing.images);

    // 先更新權威記錄（DB）：若這步失敗，照片尚未刪除、景點維持原狀，
    // admin 可安全重試，不會留下破圖或 DB / Blob 不一致。
    const spot = await prisma.spot.update({
      where: { id },
      data: {
        status: "rejected",
        rejectReason: rejectReason || DEFAULT_REJECT_REASON,
        images: JSON.stringify([]),
        expiresAt: null,
      },
      select: { id: true, name: true, status: true },
    });

    // DB 已標記 rejected 後，Blob 清理採 best-effort；
    // 即使部分失敗，也只是留下可由後續清理任務回收的孤兒，DB 不會謊報引用。
    if (blobImages.length > 0) {
      const deleteResults = await Promise.allSettled(
        blobImages.map((image) => del(image))
      );
      const failedDeletes = deleteResults.filter(
        (result) => result.status === "rejected"
      ).length;
      if (failedDeletes > 0) {
        console.error(
          `[PATCH /api/admin/spots/${id}] Blob 清理部分失敗：${failedDeletes}/${blobImages.length}（DB 已標記 rejected，殘留圖片待後續清理）`
        );
      }
    }

    return NextResponse.json<ApiResponse<typeof spot>>({
      data: spot,
      success: true,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/spots/[id]]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "操作失敗" },
      { status: 500 }
    );
  }
}
