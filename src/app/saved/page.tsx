import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SavedList } from "@/components/saved/SavedList";
import { prisma } from "@/lib/db";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";
import type { SpotMapPoint } from "@/types/spots";

const SAVED_PUBLIC_STATUSES: SpotStatus[] = ["active", "uncertain", "disappeared"];

function parseImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/map");
  }

  const savedSpots = await prisma.savedSpot.findMany({
    where: {
      userId: session.user.id,
      spot: { status: { in: SAVED_PUBLIC_STATUSES } },
    },
    include: { spot: true },
    orderBy: { createdAt: "desc" },
  });

  const spots: SpotMapPoint[] = savedSpots.map(({ spot }) => {
    const images = parseImages(spot.images);
    return {
      id: spot.id,
      name: spot.name,
      nameEn: spot.nameEn ?? undefined,
      category: spot.category as SpotCategory,
      status: spot.status as SpotStatus,
      difficulty: spot.difficulty as SpotMapPoint["difficulty"],
      lat: spot.lat,
      lng: spot.lng,
      address: spot.address ?? undefined,
      coverImage: images[0] ?? "",
      images: images.slice(0, 3),
      visitCount: spot.visitCount,
      recommendedTime: spot.recommendedTime ?? undefined,
    };
  });

  return (
    <main
      className="min-h-screen px-4 py-5"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <SavedList spots={spots} />
      </div>
    </main>
  );
}
