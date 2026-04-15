import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ROUTES } from "@/lib/constants/routes";
import { getCategoryLabel, getDifficultyLabel, getStatusLabel } from "@/lib/i18n/spotMeta";
import { SpotActionBar } from "@/components/spots/SpotActionBar";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

const CATEGORY_COLORS: Record<SpotCategory, string> = {
  "weird-temple": "#f97316",
  "abandoned": "#6b7280",
  "giant-object": "#3b82f6",
  "kitsch": "#ec4899",
  "marginal-architecture": "#14b8a6",
  "urban-legend": "#8b5cf6",
  "absurd-landscape": "#22c55e",
  "odd-shopfront": "#eab308",
};

const STATUS_COLORS_DARK: Record<SpotStatus, string> = {
  active: "bg-green-500/15 text-green-400",
  uncertain: "bg-yellow-500/15 text-yellow-400",
  disappeared: "bg-zinc-700 text-zinc-400",
  pending: "bg-blue-500/15 text-blue-400",
};

export default async function SpotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const spot = await prisma.spot.findUnique({ where: { id } });
  if (!spot) notFound();
  const tMeta = await getTranslations("spotMeta");
  const tDetail = await getTranslations("spotDetail");

  const images: string[] = JSON.parse(spot.images || "[]");
  const coverImage = images[0] ?? "";

  const categoryLabel = getCategoryLabel(tMeta, spot.category as SpotCategory);
  const statusLabel = getStatusLabel(tMeta, spot.status as SpotStatus);
  const statusColor = STATUS_COLORS_DARK[spot.status as SpotStatus] ?? "bg-zinc-700 text-zinc-400";
  const categoryColor = CATEGORY_COLORS[spot.category as SpotCategory] ?? "#6b7280";

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero 圖片 */}
      <div className="relative w-full h-[55vh] bg-zinc-800">
        {coverImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImage})` }}
          />
        )}
        {/* 漸層遮罩，讓返回按鈕更易讀 */}
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-transparent" />

        {/* 返回按鈕 */}
        <Link
          href={ROUTES.MAP}
          className="absolute top-12 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-white text-lg"
          aria-label={tDetail("back")}
        >
          ←
        </Link>
      </div>

      {/* 內容區 */}
      <div className="relative bg-zinc-900 rounded-t-3xl -mt-6 px-5 pt-6 pb-32">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${categoryColor}20`,
              color: categoryColor,
            }}
          >
            {categoryLabel}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="text-xs text-zinc-500">
            {getDifficultyLabel(tMeta, spot.difficulty)}
          </span>
        </div>

        {/* 名稱 */}
        <h1 className="text-2xl font-bold text-white mt-3 leading-tight">
          {spot.name}
        </h1>
        {spot.nameEn && (
          <p className="text-sm text-zinc-500 font-mono mt-0.5">{spot.nameEn}</p>
        )}

        {/* 地址 */}
        {spot.address && (
          <p className="text-sm text-zinc-400 mt-3">
            {tDetail("addressPrefix")} {spot.address}
          </p>
        )}

        {/* 描述 */}
        {spot.description && (
          <p className="text-sm text-zinc-300 mt-4 leading-relaxed">
            {spot.description}
          </p>
        )}

        {/* 傳說 */}
        {spot.legend && (
          <>
            <div className="border-t border-zinc-800 mt-5 pt-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{tDetail("legend")}</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{spot.legend}</p>
            </div>
          </>
        )}

        {/* 推薦到訪時段 */}
        {spot.recommendedTime && (
          <div className="mt-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{tDetail("recommendedTime")}</p>
            <p className="text-sm text-zinc-300">{spot.recommendedTime}</p>
          </div>
        )}
      </div>

      <SpotActionBar lat={spot.lat} lng={spot.lng} spotId={spot.id} />
    </div>
  );
}
