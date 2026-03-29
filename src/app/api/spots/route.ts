import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types/api";
import type { SpotMapPoint } from "@/types/spots";

// 根據經緯度和半徑（公里）計算 bounding box
function getBoundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "5");
  const categories = searchParams.get("categories")?.split(",").filter(Boolean);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "lat 和 lng 為必填參數" },
      { status: 400 }
    );
  }

  try {
    const box = getBoundingBox(lat, lng, radius);

    const spots = await prisma.spot.findMany({
      where: {
        lat: { gte: box.minLat, lte: box.maxLat },
        lng: { gte: box.minLng, lte: box.maxLng },
        ...(categories && categories.length > 0
          ? { category: { in: categories } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        nameEn: true,
        category: true,
        status: true,
        difficulty: true,
        images: true,
        lat: true,
        lng: true,
      },
    });

    const result: SpotMapPoint[] = spots.map((spot) => {
      const images: string[] = JSON.parse(spot.images || "[]");
      return {
        id: spot.id,
        name: spot.name,
        nameEn: spot.nameEn ?? undefined,
        category: spot.category as SpotMapPoint["category"],
        status: spot.status as SpotMapPoint["status"],
        difficulty: spot.difficulty as SpotMapPoint["difficulty"],
        lat: spot.lat,
        lng: spot.lng,
        coverImage: images[0] ?? "",
      };
    });

    return NextResponse.json<ApiResponse<SpotMapPoint[]>>({
      data: result,
      success: true,
    });
  } catch (error) {
    console.error("[GET /api/spots]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "查詢失敗" },
      { status: 500 }
    );
  }
}
