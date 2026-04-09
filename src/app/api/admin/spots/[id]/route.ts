import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

function isAdmin(email: string | null | undefined) {
  return email && email === process.env.ADMIN_EMAIL;
}

// 審核景點：approve（通過）或 reject（拒絕刪除）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "無權限" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: "approve" | "reject" };

    if (action === "approve") {
      const spot = await prisma.spot.update({
        where: { id },
        data: { status: "active", expiresAt: null },
        select: { id: true, name: true, status: true },
      });
      return NextResponse.json<ApiResponse<typeof spot>>({ data: spot, success: true });
    }

    if (action === "reject") {
      await prisma.spot.delete({ where: { id } });
      return NextResponse.json<ApiResponse<{ id: string }>>({
        data: { id },
        success: true,
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "action 必須是 approve 或 reject" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[PATCH /api/admin/spots/[id]]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "操作失敗" },
      { status: 500 }
    );
  }
}
