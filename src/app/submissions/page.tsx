import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/db";
import type { SpotStatus } from "@/lib/constants/status";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function SubmissionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/map");
  }

  const t = await getTranslations("submissionsPage");
  const submissions = await prisma.spot.findMany({
    where: { submittedById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      nameEn: true,
      status: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
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
          <Link
            href="/submit"
            className="ml-auto text-xs tracking-[0.18em]"
            style={{ color: "var(--accent)" }}
          >
            + {t("newSubmission")}
          </Link>
        </div>

        <h1 className="font-content text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {t("description")}
        </p>

        {submissions.length === 0 ? (
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
            {submissions.map((spot) => {
              const status = spot.status as SpotStatus;
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
                  <div className="flex flex-wrap items-start gap-2">
                    <StatusBadge status={status} />
                    <span
                      className="ml-auto text-[10px] tracking-[0.16em]"
                      style={{ color: "var(--muted)" }}
                    >
                      {formatDate(spot.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-3 font-content text-base font-bold">{spot.name}</h2>
                  {spot.nameEn && (
                    <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                      {spot.nameEn}
                    </p>
                  )}
                  {spot.address && (
                    <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                      {spot.address}
                    </p>
                  )}
                  {status === "active" ? (
                    <Link
                      href={`/spots/${spot.id}`}
                      className="mt-3 inline-block text-xs tracking-[0.16em]"
                      style={{ color: "var(--accent)" }}
                    >
                      {t("viewSpot")} →
                    </Link>
                  ) : (
                    <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                      {status === "pending"
                        ? t("pendingHint")
                        : status === "rejected"
                          ? t("rejectedHint")
                          : t("closedHint")}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
