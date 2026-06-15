import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { cuidSchema, adminActionSchema, formatZodError } from "@/lib/validation";
import { isAdminSession } from "@/lib/admin";
import type { ApiResponse } from "@/types/api";

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
    const { action } = parsed.data;

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

    const blobImages = getBlobImages(existing.images);
    const deleteResults = await Promise.allSettled(
      blobImages.map((image) => del(image))
    );
    const failedDeletes = deleteResults.filter((result) => result.status === "rejected").length;
    if (failedDeletes > 0) {
      console.error(`[PATCH /api/admin/spots/${id}] Blob cleanup failed: ${failedDeletes}`);
    }

    const spot = await prisma.spot.update({
      where: { id },
      data: {
        status: "rejected",
        images: JSON.stringify([]),
        expiresAt: null,
      },
      select: { id: true, name: true, status: true },
    });

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
