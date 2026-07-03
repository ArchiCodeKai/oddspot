import { put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  UPLOAD_DAILY_LIMIT,
  UPLOAD_WINDOW_LIMIT,
  UPLOAD_WINDOW_MS,
  checkRateLimit,
  evaluateDailyLimit,
  formatRetryAfterSeconds,
  getTaipeiDayStart,
} from "@/lib/security/rateLimit";
import type { ApiResponse } from "@/types/api";

export const runtime = "nodejs";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 600_000;

function getExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "請先登入才能上傳照片" },
      { status: 401 },
    );
  }

  const burstLimit = checkRateLimit(
    `spot-upload:${session.user.id}`,
    UPLOAD_WINDOW_LIMIT,
    UPLOAD_WINDOW_MS,
  );
  if (!burstLimit.allowed) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "照片上傳太頻繁，請稍後再試" },
      {
        status: 429,
        headers: { "Retry-After": formatRetryAfterSeconds(burstLimit.resetAt) },
      },
    );
  }

  // 每日上限以 DB 計數，跨 instance 正確（AD-7）
  const uploadedToday = await prisma.uploadLog.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: getTaipeiDayStart() },
    },
  });
  const dailyLimit = evaluateDailyLimit(uploadedToday, UPLOAD_DAILY_LIMIT);
  if (!dailyLimit.allowed) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: `今日照片上傳已達 ${UPLOAD_DAILY_LIMIT} 張上限` },
      { status: 429 },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "尚未設定 BLOB_READ_WRITE_TOKEN" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "缺少照片檔案" },
        { status: 400 },
      );
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "只支援 JPG、PNG 或 WebP 圖片" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "照片壓縮後仍太大，請重新選擇" },
        { status: 400 },
      );
    }

    const extension = getExtension(file.type);
    const pathname = `spots/${session.user.id}/${crypto.randomUUID()}.${extension}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    // 上傳成功才記一筆，供每日上限 DB 計數
    await prisma.uploadLog.create({ data: { userId: session.user.id } });

    return NextResponse.json<ApiResponse<{ url: string; pathname: string }>>({
      data: { url: blob.url, pathname: blob.pathname },
      success: true,
    });
  } catch (error) {
    console.error("[POST /api/uploads/spots]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "照片上傳失敗" },
      { status: 500 },
    );
  }
}

// 清理已上傳但投稿未完成的孤兒圖片（best-effort）
// 只允許刪除路徑屬於 spots/{自己的 userId}/ 的 Blob，避免刪到他人圖片
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "請先登入" },
      { status: 401 },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "尚未設定 BLOB_READ_WRITE_TOKEN" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const urls: unknown = body?.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "缺少要清理的圖片 URL" },
        { status: 400 },
      );
    }

    const ownPrefix = `/spots/${session.user.id}/`;
    const ownedUrls = urls.filter((value): value is string => {
      if (typeof value !== "string") return false;
      try {
        return new URL(value).pathname.startsWith(ownPrefix);
      } catch {
        return false;
      }
    });

    if (ownedUrls.length === 0) {
      return NextResponse.json<ApiResponse<{ deleted: number }>>({
        data: { deleted: 0 },
        success: true,
      });
    }

    const results = await Promise.allSettled(ownedUrls.map((url) => del(url)));
    const deleted = results.filter((r) => r.status === "fulfilled").length;
    if (deleted < ownedUrls.length) {
      console.error(
        `[DELETE /api/uploads/spots] 部分圖片清理失敗：${ownedUrls.length - deleted}/${ownedUrls.length}`,
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: number }>>({
      data: { deleted },
      success: true,
    });
  } catch (error) {
    console.error("[DELETE /api/uploads/spots]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "清理圖片失敗" },
      { status: 500 },
    );
  }
}
