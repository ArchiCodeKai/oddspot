import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { SavedSpotActions } from "@/components/saved/SavedSpotActions";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/db";
import { getCategoryLabel } from "@/lib/i18n/spotMeta";
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

  const t = await getTranslations("savedPage");
  const tMeta = await getTranslations("spotMeta");
  const savedSpots = await prisma.savedSpot.findMany({
    where: {
      userId: session.user.id,
      spot: { status: { in: SAVED_PUBLIC_STATUSES } },
    },
    include: { spot: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main
      className="min-h-screen px-4 py-5"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/map"
            className="text-xs tracking-[0.18em]"
            style={{ color: "var(--muted)" }}
          >
            ← {t("back")}
          </Link>
          <span
            className="ml-auto text-xs tracking-[0.18em]"
            style={{ color: "var(--muted)" }}
          >
            {t("count", { count: savedSpots.length })}
          </span>
        </div>

        <h1 className="font-content text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {t("description")}
        </p>

        {savedSpots.length === 0 ? (
          <div
            className="mt-8 p-5 text-sm"
            style={{
              border: "1px dashed var(--line-strong)",
              color: "var(--muted)",
              borderRadius: 2,
            }}
          >
            {t("empty")}
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {savedSpots.map(({ spot }) => {
              const images = parseImages(spot.images);
              const category = spot.category as SpotCategory;
              const status = spot.status as SpotStatus;
              const spotPoint: SpotMapPoint = {
                id: spot.id,
                name: spot.name,
                nameEn: spot.nameEn ?? undefined,
                category,
                status,
                difficulty: spot.difficulty as SpotMapPoint["difficulty"],
                lat: spot.lat,
                lng: spot.lng,
                address: spot.address ?? undefined,
                coverImage: images[0] ?? "",
                images: images.slice(0, 3),
                visitCount: spot.visitCount,
                recommendedTime: spot.recommendedTime ?? undefined,
              };

              return (
                <article
                  key={spot.id}
                  className="p-4"
                  style={{
                    background: "var(--panel-glass)",
                    border: "1px solid var(--line)",
                    borderRadius: 2,
                  }}
                >
                  <div className="flex gap-3">
                    <Link
                      href={`/spots/${spot.id}`}
                      className="h-20 w-20 flex-shrink-0 overflow-hidden"
                      style={{ background: "var(--panel-light)", borderRadius: 2 }}
                    >
                      {images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images[0]}
                          alt={spot.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs">
                          NO IMG
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <CategoryBadge
                          category={category}
                          label={getCategoryLabel(tMeta, category)}
                        />
                        <StatusBadge status={status} />
                      </div>
                      <Link href={`/spots/${spot.id}`} className="font-content text-base font-bold">
                        {spot.name}
                      </Link>
                      {spot.nameEn && (
                        <p
                          className="mt-1 truncate text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {spot.nameEn}
                        </p>
                      )}
                      {spot.address && (
                        <p
                          className="mt-2 line-clamp-1 text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {spot.address}
                        </p>
                      )}
                      <SavedSpotActions spot={spotPoint} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
