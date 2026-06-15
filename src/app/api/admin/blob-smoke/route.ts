import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin";
import type { ApiResponse } from "@/types/api";

export const runtime = "nodejs";

interface BlobSmokeResponse {
  uploaded: boolean;
  deleted: boolean;
  pathname: string;
}

export async function POST() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "無權限" },
      { status: 403 },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "尚未設定 BLOB_READ_WRITE_TOKEN" },
      { status: 500 },
    );
  }

  const pathname = `health/blob-smoke-${crypto.randomUUID()}.txt`;
  const blob = await put(pathname, "oddspot blob smoke ok", {
    access: "public",
    addRandomSuffix: false,
    contentType: "text/plain",
  });
  await del(blob.pathname);

  return NextResponse.json<ApiResponse<BlobSmokeResponse>>({
    data: {
      uploaded: true,
      deleted: true,
      pathname: blob.pathname,
    },
    success: true,
  });
}
