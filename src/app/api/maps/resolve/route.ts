import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  checkRateLimit,
  formatRetryAfterSeconds,
} from "@/lib/security/rateLimit";
import { resolveGoogleMapsShortUrl } from "@/lib/submit/googleMapsResolve";
import type { ApiResponse } from "@/types/api";

export const runtime = "nodejs";

const MAPS_RESOLVE_WINDOW_LIMIT = 20;
const MAPS_RESOLVE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "請先登入才能解析 Google Maps 連結" },
      { status: 401 },
    );
  }

  const limit = checkRateLimit(
    `maps-resolve:${session.user.id}`,
    MAPS_RESOLVE_WINDOW_LIMIT,
    MAPS_RESOLVE_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "Google Maps 連結解析太頻繁，請稍後再試" },
      {
        status: 429,
        headers: { "Retry-After": formatRetryAfterSeconds(limit.resetAt) },
      },
    );
  }

  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url : "";

    const coordinates = await resolveGoogleMapsShortUrl(url);

    return NextResponse.json<ApiResponse<typeof coordinates>>({
      data: coordinates,
      success: true,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : "Google Maps 連結解析失敗",
      },
      { status: 422 },
    );
  }
}
