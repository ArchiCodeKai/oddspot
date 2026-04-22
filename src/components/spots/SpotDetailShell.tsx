"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { ROUTES } from "@/lib/constants/routes";

interface SpotDetailShellProps {
  children: React.ReactNode;
  backLabel: string;
}

// 景點詳情頁的 client 外殼
// 按鈕必須在 pageControls motion.div 外部：
// CSS opacity 會被父元素繼承，若按鈕在內部，父 opacity:0 會讓按鈕的 slide 動畫失效
export function SpotDetailShell({ children, backLabel }: SpotDetailShellProps) {
  const pageControls = useAnimationControls();
  const btnControls = useAnimationControls();
  const router = useRouter();
  const navTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const handleBack = () => {
    // 按鈕向左淡出（比頁面快一點，先行離場）
    btnControls.start({
      opacity: 0,
      x: -20,
      transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
    });

    // 頁面向下滑出 + 淡出
    pageControls.start({
      opacity: 0,
      y: 52,
      transition: { duration: 0.26, ease: [0.32, 0.72, 0, 1] },
    });

    // 在動畫接近尾聲時提前導航（200ms < 260ms）
    // 讓 Next.js 提前準備新頁面，消除 exit→enter 之間的白光閃爍
    navTimer.current = setTimeout(() => {
      router.push(ROUTES.MAP);
    }, 200);
  };

  return (
    <>
      {/* 返回按鈕：Fragment 兄弟節點，不受 pageControls opacity 影響 */}
      <motion.button
        animate={btnControls}
        initial={false}
        onClick={handleBack}
        whileTap={{ scale: 0.92 }}
        className="fixed top-12 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md border text-lg"
        style={{
          background: "rgba(0,0,0,0.35)",
          borderColor: "rgba(255,255,255,0.15)",
          color: "#fff",
        }}
        aria-label={backLabel}
      >
        ←
      </motion.button>

      {/* 頁面內容：由 pageControls 控制離場 */}
      <motion.div animate={pageControls}>
        {children}
      </motion.div>
    </>
  );
}
