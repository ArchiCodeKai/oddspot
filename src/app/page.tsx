import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950">
      {/* 背景暗色疊層 */}
      <div className="absolute inset-0 bg-linear-to-b from-zinc-950/60 via-zinc-950/40 to-zinc-950/80" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white">
          OddSpot
        </h1>
        <p className="max-w-sm text-lg leading-relaxed text-zinc-400">
          發現台灣城市裡那些說不清楚的地方
        </p>
        <Link
          href={ROUTES.MAP}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
        >
          開始探索 →
        </Link>
      </div>
    </main>
  );
}
