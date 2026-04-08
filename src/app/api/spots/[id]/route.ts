import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types/api";
import type { SpotDetail } from "@/types/spots";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const spot = await prisma.spot.findUnique({ where: { id } });

    if (!spot) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "找不到景點" },
        { status: 404 }
      );
    }

    const images: string[] = JSON.parse(spot.images || "[]");

    const result: SpotDetail = {
      id: spot.id,
      name: spot.name,
      nameEn: spot.nameEn ?? undefined,
      description: spot.description ?? undefined,
      descriptionEn: spot.descriptionEn ?? undefined,
      lat: spot.lat,
      lng: spot.lng,
      address: spot.address ?? undefined,
      category: spot.category as SpotCategory,
      status: spot.status as SpotStatus,
      difficulty: spot.difficulty as SpotDetail["difficulty"],
      images,
      rating: spot.rating,
      visitCount: spot.visitCount,
      lastVerifiedAt: spot.lastVerifiedAt?.toISOString(),
      recommendedTime: spot.recommendedTime ?? undefined,
      legend: spot.legend ?? undefined,
      googlePlaceId: spot.googlePlaceId ?? undefined,
      createdAt: spot.createdAt.toISOString(),
      updatedAt: spot.updatedAt.toISOString(),
    };

    return NextResponse.json<ApiResponse<SpotDetail>>({ data: result, success: true });
  } catch (error) {
    console.error("[GET /api/spots/[id]]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "查詢失敗" },
      { status: 500 }
    );
  }
}
