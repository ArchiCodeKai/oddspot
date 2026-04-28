import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCategoryLabel, getDifficultyLabel } from "@/lib/i18n/spotMeta";
import { SpotActionBar } from "@/components/spots/SpotActionBar";
import { SpotDetailShell } from "@/components/spots/SpotDetailShell";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

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

  const category = spot.category as SpotCategory;
  const Glyph = CATEGORY_GLYPHS[category];
  const categoryLabel = getCategoryLabel(tMeta, category);

  return (
    <SpotDetailShell backLabel={tDetail("back")}>
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Hero 圖片 */}
      <div
        className="relative w-full h-[55vh] overflow-hidden"
        style={{ background: "var(--panel-light)" }}
      >
        {coverImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImage})` }}
          />
        ) : (
          // 無圖：用 category glyph 作為主視覺（v3 monochrome placeholder）
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              color: "var(--accent)",
              opacity: 0.5,
              filter: "drop-shadow(0 0 30px rgb(var(--accent-rgb) / 0.4))",
            }}
          >
            <Glyph size={140} />
          </div>
        )}

        {/* CRT scanlines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgb(var(--accent-rgb) / 0.03) 3px, rgb(var(--accent-rgb) / 0.03) 4px)",
          }}
        />

        {/* 漸層遮罩（過渡到內容區） */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgb(var(--background-rgb) / 0.4) 0%, transparent 30%, transparent 70%, rgb(var(--panel-rgb)) 100%)",
          }}
        />
      </div>

      {/* 內容區（v3：sharp corners 12px） */}
      <div
        className="relative -mt-6 px-5 pt-6 pb-32"
        style={{
          background: "var(--panel)",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderTop: "1px solid var(--line)",
        }}
      >
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={category} label={categoryLabel} size="md" />
          <StatusBadge status={spot.status as SpotStatus} size="md" />
          <span
            className="text-xs uppercase"
            style={{
              color: "var(--muted)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.18em",
            }}
          >
            {getDifficultyLabel(tMeta, spot.difficulty)}
          </span>
        </div>

        {/* 名稱 */}
        <h1
          className="text-2xl font-bold mt-3 leading-tight font-content"
          style={{ color: "var(--foreground)" }}
        >
          {spot.name}
        </h1>
        {spot.nameEn && (
          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--muted)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.04em",
            }}
          >
            {spot.nameEn}
          </p>
        )}

        {/* 地址 */}
        {spot.address && (
          <p
            className="text-sm mt-3 font-content"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            {tDetail("addressPrefix")} {spot.address}
          </p>
        )}

        {/* 描述 */}
        {spot.description && (
          <p
            className="text-sm mt-4 leading-relaxed font-content"
            style={{ color: "var(--foreground)", opacity: 0.85 }}
          >
            {spot.description}
          </p>
        )}

        {/* 傳說 */}
        {spot.legend && (
          <div
            className="mt-5 pt-5"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{
                color: "var(--muted)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.18em",
              }}
            >
              {tDetail("legend")}
            </p>
            <p
              className="text-sm leading-relaxed font-content"
              style={{ color: "var(--foreground)", opacity: 0.85 }}
            >
              {spot.legend}
            </p>
          </div>
        )}

        {/* 推薦到訪時段 */}
        {spot.recommendedTime && (
          <div className="mt-5">
            <p
              className="text-xs uppercase tracking-widest mb-1"
              style={{
                color: "var(--muted)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.18em",
              }}
            >
              {tDetail("recommendedTime")}
            </p>
            <p
              className="text-sm font-content"
              style={{ color: "var(--foreground)", opacity: 0.85 }}
            >
              {spot.recommendedTime}
            </p>
          </div>
        )}
      </div>

      <SpotActionBar lat={spot.lat} lng={spot.lng} spotId={spot.id} />
    </div>
    </SpotDetailShell>
  );
}
