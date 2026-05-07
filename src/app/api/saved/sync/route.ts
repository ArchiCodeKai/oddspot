import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { syncSavedSchema, formatZodError } from "@/lib/validation";

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
    const parsed = syncSavedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, success: false, error: `輸入驗證失敗：${formatZodError(parsed.error)}` },
        { status: 400 }
      );
    }
    const { spotIds } = parsed.data;

    // 使用 upsert 處理每個景點，避免重複
    let syncedCount = 0;
    for (const spotId of spotIds) {
      try {
        await prisma.savedSpot.upsert({
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
        syncedCount++;
      } catch (error) {
        console.error(`同步景點 ${spotId} 失敗:`, error);
      }
    }

    return NextResponse.json({
      data: { synced: syncedCount },
      success: true,
    });
  } catch (error) {
    console.error("同步收藏失敗:", error);
    return NextResponse.json(
      { data: null, success: false, error: "同步失敗" },
      { status: 500 }
    );
  }
}
