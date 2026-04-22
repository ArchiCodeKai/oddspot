"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

// 景點詳情頁路由判斷
const SPOT_DETAIL_RE = /^\/spots\//;

// 依路由決定進場動畫參數
// 注意：App Router 用 startTransition 換路由，exit 動畫來不及執行會造成閃爍
// 所以只做進場動畫，key 改變時 Framer Motion 自動把新元素當全新元件播入場
function getEnterProps(pathname: string) {
  if (SPOT_DETAIL_RE.test(pathname)) {
    // 景點詳情：從下方升起（掀開隱藏地點的感覺）
    return {
      initial:    { opacity: 0, y: 56, scale: 0.98 },
      animate:    { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0.38, ease: [0.32, 0.72, 0, 1] as const },
    };
  }
  // 其他頁面：淡入 + 上滑
  return {
    initial:    { opacity: 0, y: 28 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const },
  };
}

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      style={{ width: "100%" }}
      {...getEnterProps(pathname)}
    >
      {children}
    </motion.div>
  );
}
