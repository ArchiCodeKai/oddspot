"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorIcon } from "@/components/ui/ErrorIcon";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[OddSpot Error]", error);
  }, [error]);

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ background: "var(--background)" }}
    >
      {/* 品牌標記 */}
      <p
        className="text-[0.68rem] tracking-[0.22em] uppercase mb-8"
        style={{ color: "var(--accent)" }}
      >
        OddSpot / 500
      </p>

      {/* 哭泣動畫 */}
      <div className="mb-8">
        <ErrorIcon size={120} />
      </div>

      {/* 主標題 */}
      <h1
        className="text-4xl sm:text-6xl font-bold leading-none tracking-tight mb-5"
        style={{ color: "var(--foreground)" }}
      >
        地圖失去
        <br />
        訊號了
      </h1>

      {/* 說明文字 */}
      <p
        className="text-sm leading-relaxed max-w-xs mb-10 font-content"
        style={{ color: "var(--muted)" }}
      >
        訊號和畫面之間出了點問題。
        <br />
        試著重整一次，通常就能回來。
      </p>

      {/* 操作按鈕 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 text-xs tracking-[0.08em] uppercase rounded-full transition-opacity hover:opacity-80 cursor-pointer"
          style={{
            background: "var(--accent)",
            color: "var(--background)",
          }}
        >
          重試
        </button>
        <Link
          href="/map"
          className="inline-flex items-center justify-center px-6 py-3 text-xs tracking-[0.08em] uppercase rounded-full transition-opacity hover:opacity-70"
          style={{
            border: "1px solid var(--line)",
            color: "var(--muted)",
          }}
        >
          回到地圖
        </Link>
      </div>

      {/* digest 為 Next.js 生成的錯誤碼，有助回報問題 */}
      <p
        className="mt-16 text-[0.62rem] tracking-widest uppercase"
        style={{ color: "var(--line)" }}
      >
        {error.digest ? `digest · ${error.digest}` : "error_code · 500 · internal_error"}
      </p>
    </div>
  );
}
