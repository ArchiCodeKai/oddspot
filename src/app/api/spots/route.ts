import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ApiResponse } from "@/types/api";
import type { SpotMapPoint } from "@/types/spots";

interface SpotsResponse {
  spots: SpotMapPoint[];
  nextCursor: string | null;
}

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

const MAX_SPOTS = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "5");
  const categories = searchParams.get("categories")?.split(",").filter(Boolean);
  const cursor = searchParams.get("cursor") ?? undefined;

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
      take: MAX_SPOTS,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
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

    const nextCursor = spots.length === MAX_SPOTS ? (spots[spots.length - 1]?.id ?? null) : null;

    return NextResponse.json<{ data: SpotsResponse; success: boolean }>({
      data: { spots: result, nextCursor },
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

// 用戶投稿新景點
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "請先登入才能投稿" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, nameEn, description, category, lat, lng, address, difficulty, recommendedTime, legend, imageUrl } = body as {
      name: string;
      nameEn?: string;
      description?: string;
      category: string;
      lat: number;
      lng: number;
      address?: string;
      difficulty?: string;
      recommendedTime?: string;
      legend?: string;
      imageUrl?: string;
    };

    if (!name || !category || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, success: false, error: "名稱、分類、座標為必填" },
        { status: 400 }
      );
    }

    const images = imageUrl ? JSON.stringify([imageUrl]) : JSON.stringify([]);
    // pending 景點 30 天內未審核自動到期
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const spot = await prisma.spot.create({
      data: {
        name,
        nameEn,
        description,
        category,
        lat,
        lng,
        address,
        difficulty: difficulty ?? "easy",
        recommendedTime,
        legend,
        images,
        status: "pending",
        submittedById: session.user.id,
        expiresAt,
      },
      select: { id: true, name: true, status: true },
    });

    return NextResponse.json<ApiResponse<{ id: string; name: string; status: string }>>(
      { data: spot, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/spots]", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, success: false, error: "投稿失敗" },
      { status: 500 }
    );
  }
}
