import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { cuidSchema } from "@/lib/validation";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, success: false, error: "未登入" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    const { spotId } = await params;

    const idCheck = cuidSchema.safeParse(spotId);
    if (!idCheck.success) {
      return NextResponse.json(
        { data: null, success: false, error: "無效 ID 格式" },
        { status: 400 }
      );
    }

    await prisma.savedSpot.deleteMany({
      where: {
        userId,
        spotId,
      },
    });

    return NextResponse.json({
      data: { removed: true },
      success: true,
    });
  } catch (error) {
    console.error("移除收藏失敗:", error);
    return NextResponse.json(
      { data: null, success: false, error: "移除收藏失敗" },
      { status: 500 }
    );
  }
}
