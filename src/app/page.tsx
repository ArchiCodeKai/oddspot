import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950">
      {/* 背景氛圍光暈：使用分類色系在角落製造神秘感 */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "#8b5cf620" }}
      />
      <div
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "#f9731618" }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "#3b82f612" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white">
          OddSpot
        </h1>
        <p className="max-w-sm text-lg leading-relaxed text-zinc-400">
          B級景點搜尋器
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
