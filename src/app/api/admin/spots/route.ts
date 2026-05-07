import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminSession } from "@/lib/admin";
import type { ApiResponse } from "@/types/api";

// 取得所有待審核景點
export async function GET() {
  const session = await auth();

  if (!isAdminSession(session)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "無權限" },
      { status: 403 }
    );
  }

  try {
    const spots = await prisma.spot.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        nameEn: true,
        category: true,
        lat: true,
        lng: true,
        address: true,
        description: true,
        difficulty: true,
        images: true,
        submittedById: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json<ApiResponse<typeof spots>>({ data: spots, success: true });
  } catch (error) {
    console.error("[GET /api/admin/spots]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "查詢失敗" },
      { status: 500 }
    );
  }
}
