import Link from "next/link";
import Image from "next/image";
import { ROUTES } from "@/lib/constants/routes";
import { AuthButton } from "@/components/auth/AuthButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { RandomSpotButton } from "@/components/landing/RandomSpotButton";
import { prisma } from "@/lib/db";

async function getSpotStats() {
  try {
    const count = await prisma.spot.count({ where: { status: "active" } });
    return count;
  } catch {
    return 0;
  }
}

async function getFeaturedSpots() {
  try {
    const spots = await prisma.spot.findMany({
      where: { status: "active" },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        address: true,
        images: true,
        difficulty: true,
      },
    });
    return spots;
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const [spotCount, featuredSpots] = await Promise.all([
    getSpotStats(),
    getFeaturedSpots(),
  ]);

  return (
    <>
      <style>{`
        @keyframes eye-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 7px #00e5cc) drop-shadow(0 0 22px rgba(0,229,204,0.45));
          }
          50% {
            filter: drop-shadow(0 0 13px #00e5cc) drop-shadow(0 0 38px rgba(0,229,204,0.7));
          }
        }
        @keyframes eye-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          94%, 98%      { transform: scaleY(0.06); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes count-glow {
          0%, 100% { text-shadow: 0 0 18px rgba(0,229,204,0.4); }
          50%      { text-shadow: 0 0 32px rgba(0,229,204,0.75); }
        }
        .eye-pulse  { animation: eye-pulse 3s ease-in-out infinite; }
        .eye-blink  { animation: eye-blink 7s ease-in-out infinite; transform-origin: 55px 44px; }
        .fade-up-1  { animation: fade-up 0.7s ease forwards; animation-delay: 0.15s; opacity: 0; }
        .fade-up-2  { animation: fade-up 0.7s ease forwards; animation-delay: 0.45s; opacity: 0; }
        .fade-up-3  { animation: fade-up 0.7s ease forwards; animation-delay: 0.7s;  opacity: 0; }
        .fade-up-4  { animation: fade-up 0.7s ease forwards; animation-delay: 0.95s; opacity: 0; }
        .fade-up-5  { animation: fade-up 0.7s ease forwards; animation-delay: 1.1s;  opacity: 0; }
        .cursor     { display: inline-block; animation: cursor-blink 1s step-end infinite; }
        .count-num  { animation: count-glow 3s ease-in-out infinite; }
        .neon-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 32px;
          border: 1px solid rgba(0,229,204,0.35);
          border-radius: 2px;
          font-size: 0.78rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #00e5cc;
          text-decoration: none;
          overflow: hidden;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
          box-shadow: 0 0 18px rgba(0,229,204,0.12), inset 0 0 18px rgba(0,229,204,0.04);
        }
        .neon-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(0,229,204,0.08), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .neon-btn:hover {
          border-color: rgba(0,229,204,0.65);
          box-shadow: 0 0 28px rgba(0,229,204,0.22), inset 0 0 24px rgba(0,229,204,0.07);
        }
        .neon-btn:hover::before { transform: translateX(100%); }
        .spot-card {
          position: relative;
          overflow: hidden;
          border-radius: 2px;
          border: 1px solid var(--line);
          background: var(--panel);
          text-decoration: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .spot-card:hover {
          border-color: rgba(0,229,204,0.3);
          box-shadow: 0 0 24px rgba(0,229,204,0.08);
        }
      `}</style>

      <main
        className="relative flex min-h-screen flex-col overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        {/* CRT 掃描線 */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,204,0.006) 3px, rgba(0,229,204,0.006) 4px)",
          }}
        />

        {/* 頂部暈光 */}
        <div
          className="absolute top-0 inset-x-0 h-[55%] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% -6%, rgba(0,229,204,0.17) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[40%] h-[35%] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at bottom left, rgba(0,100,78,0.07) 0%, transparent 60%)",
          }}
        />

        {/* ── 頂部導覽列 ── */}
        <header className="relative z-30 flex items-center justify-between px-5 py-4">
          {/* 左側品牌標記 */}
          <span
            className="text-[10px] tracking-[0.32em] uppercase select-none"
            style={{ color: "rgba(0,229,204,0.35)" }}
          >
            sys://oddspot
          </span>

          {/* 右側：主題切換 + 登入 */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton />
          </div>
        </header>

        {/* ── Hero 區塊 ── */}
        <div className="relative z-20 flex flex-col items-center gap-0 px-6 pt-16 pb-20 text-center">
          {/* 動畫眼睛 */}
          <div className="eye-pulse mb-10">
            <svg
              width="88"
              height="106"
              viewBox="0 0 110 130"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g className="eye-blink">
                <path
                  d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z"
                  stroke="#00e5cc"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d="M33 50 C32 40,44 30,58 30 C69 30,78 36,76 43 C74 52,62 59,50 58 C39 58,33 56,33 50Z"
                  stroke="#00e5cc"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d="M57 36 C62 36,66 40,65 45 C64 51,59 55,54 54 C49 54,47 50,48 45 C49 41,52 36,57 36Z"
                  fill="#00e5cc"
                />
                <path
                  d="M55 42 C58 42,60 44,59 47 C58 50,55 51,53 50 C51 49,50 47,51 45 C52 43,53 42,55 42Z"
                  fill="#013629"
                />
                <ellipse cx="61" cy="40" rx="1.6" ry="1.2" fill="#fff" opacity="0.82" />
              </g>
            </svg>
          </div>

          <p
            className="fade-up-1 text-[10px] tracking-[0.38em] uppercase mb-5"
            style={{ color: "rgba(0,229,204,0.6)" }}
          >
            B 級景點探勘系統<span className="cursor">_</span>
          </p>

          <h1
            className="fade-up-2 font-bold tracking-tight mb-2"
            style={{
              fontSize: "clamp(2.8rem, 8vw, 5rem)",
              color: "#d8f0e9",
              textShadow: "0 0 52px rgba(0,229,204,0.22)",
              letterSpacing: "-0.04em",
            }}
          >
            OddSpot
          </h1>

          <p
            className="fade-up-3 text-sm tracking-widest mb-10"
            style={{ color: "var(--muted)" }}
          >
            發現台灣城市裡那些說不清楚的地方
          </p>

          {/* CTA 按鈕組 */}
          <div className="fade-up-4 flex items-center gap-4 flex-wrap justify-center">
            <Link href={ROUTES.MAP} className="neon-btn">
              探索地圖 <span aria-hidden>→</span>
            </Link>
            <RandomSpotButton />
          </div>
        </div>

        {/* ── 景點數量統計 ── */}
        {spotCount > 0 && (
          <div
            className="relative z-20 fade-up-5 flex flex-col items-center py-10"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <p
              className="text-[10px] tracking-[0.3em] uppercase mb-2"
              style={{ color: "var(--muted)" }}
            >
              資料庫收錄
            </p>
            <p
              className="count-num font-bold"
              style={{
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
                color: "var(--accent)",
                letterSpacing: "-0.02em",
              }}
            >
              {spotCount.toLocaleString()}
            </p>
            <p
              className="text-xs tracking-[0.2em] mt-1"
              style={{ color: "var(--muted)" }}
            >
              個奇異景點已發現
            </p>
          </div>
        )}

        {/* ── 精選景點預覽 ── */}
        {featuredSpots.length > 0 && (
          <div
            className="relative z-20 px-5 pb-16"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <p
              className="text-[10px] tracking-[0.3em] uppercase text-center pt-10 mb-6"
              style={{ color: "rgba(0,229,204,0.45)" }}
            >
              近期發現
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {featuredSpots.map((spot) => {
                let coverImage: string | null = null;
                try {
                  const imgs = JSON.parse(spot.images);
                  coverImage = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null;
                } catch {
                  coverImage = null;
                }

                return (
                  <Link
                    key={spot.id}
                    href={`/spots/${spot.id}`}
                    className="spot-card"
                  >
                    {/* 圖片 */}
                    <div
                      className="w-full aspect-[4/3] relative overflow-hidden"
                      style={{ background: "var(--panel-light)" }}
                    >
                      {coverImage ? (
                        <Image
                          src={coverImage}
                          alt={spot.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted)", opacity: 0.4 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                      {/* difficulty badge */}
                      <span
                        className="absolute top-2 left-2 text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
                        style={{
                          background: "rgba(4,12,10,0.75)",
                          color: "var(--accent)",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {spot.difficulty}
                      </span>
                    </div>

                    {/* 文字 */}
                    <div className="p-3">
                      <p
                        className="text-xs font-bold truncate"
                        style={{ color: "var(--foreground)" }}
                      >
                        {spot.name}
                      </p>
                      <p
                        className="text-[10px] mt-0.5 tracking-wider truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        {spot.address ?? spot.category}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 底部標記 */}
        <p
          className="relative z-20 text-center pb-5 text-[9px] tracking-[0.25em] uppercase"
          style={{ color: "rgba(0,229,204,0.15)" }}
        >
          OddSpot © 2025 — 異常景點探勘系統
        </p>
      </main>
    </>
  );
}
