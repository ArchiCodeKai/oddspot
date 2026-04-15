import Link from "next/link";
import { ErrorIcon } from "@/components/ui/ErrorIcon";

export default function NotFound() {
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
        OddSpot / 404
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
        這個地方
        <br />
        不存在
      </h1>

      {/* 說明文字 */}
      <p
        className="text-sm leading-relaxed max-w-xs mb-10 font-content"
        style={{ color: "var(--muted)" }}
      >
        你找的頁面可能已消失、被移動，
        <br />
        或者從來就不在地圖上。
      </p>

      {/* 操作按鈕 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/map"
          className="inline-flex items-center justify-center px-6 py-3 text-xs tracking-[0.08em] uppercase rounded-full transition-opacity hover:opacity-80"
          style={{
            background: "var(--accent)",
            color: "var(--background)",
          }}
        >
          回到地圖
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-xs tracking-[0.08em] uppercase rounded-full transition-opacity hover:opacity-70"
          style={{
            border: "1px solid var(--line)",
            color: "var(--muted)",
          }}
        >
          回首頁
        </Link>
      </div>

      {/* 底部錯誤碼裝飾 */}
      <p
        className="mt-16 text-[0.62rem] tracking-widest uppercase"
        style={{ color: "var(--line)" }}
      >
        error_code · 404 · not_found
      </p>
    </div>
  );
}
