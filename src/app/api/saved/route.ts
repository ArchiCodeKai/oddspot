import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// 取得目前用戶的收藏清單
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, success: false, error: "未登入" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    const savedSpots = await prisma.savedSpot.findMany({
      where: { userId },
      select: {
        spotId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: savedSpots.map((s) => ({ spotId: s.spotId, savedAt: s.createdAt })),
      success: true,
    });
  } catch (error) {
    console.error("取得收藏失敗:", error);
    return NextResponse.json(
      { data: null, success: false, error: "取得收藏失敗" },
      { status: 500 }
    );
  }
}

// 新增收藏
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, success: false, error: "未登入" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { spotId } = body as { spotId: string };

    if (!spotId) {
      return NextResponse.json(
        { data: null, success: false, error: "spotId 必填" },
        { status: 400 }
      );
    }

    // 使用 upsert 避免重複收藏報錯
    const savedSpot = await prisma.savedSpot.upsert({
      where: {
        userId_spotId: {
          userId,
          spotId,
        },
      },
      update: {},
      create: {
        userId,
        spotId,
      },
    });

    return NextResponse.json({
      data: { id: savedSpot.id },
      success: true,
    });
  } catch (error) {
    console.error("新增收藏失敗:", error);
    return NextResponse.json(
      { data: null, success: false, error: "新增收藏失敗" },
      { status: 500 }
    );
  }
}
