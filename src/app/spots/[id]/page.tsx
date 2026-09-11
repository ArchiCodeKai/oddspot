import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SpotDetailContent } from "@/components/spots/SpotDetailContent";
import { PUBLIC_SPOT_STATUSES, type SpotStatus } from "@/lib/constants/status";

export default async function SpotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const spot = await prisma.spot.findUnique({ where: { id } });
  // pending / rejected 不對外，與「不存在」一律 notFound
  if (!spot || !PUBLIC_SPOT_STATUSES.includes(spot.status as SpotStatus)) notFound();

  const images: string[] = JSON.parse(spot.images || "[]");

  // 只把顯示需要的欄位交給 client；翻譯在 SpotDetailContent 依使用者語系做
  return (
    <SpotDetailContent
      spot={{
        id: spot.id,
        name: spot.name,
        nameEn: spot.nameEn,
        category: spot.category,
        status: spot.status,
        difficulty: spot.difficulty,
        lat: spot.lat,
        lng: spot.lng,
        address: spot.address,
        description: spot.description,
        legend: spot.legend,
        recommendedTime: spot.recommendedTime,
        coverImage: images[0] ?? "",
      }}
    />
  );
}
