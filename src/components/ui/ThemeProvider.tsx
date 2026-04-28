"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function ThemeProvider() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    // v3：用 data-theme 屬性切換 4 主題（terminal / blueprint / caution / midnight）
    root.setAttribute("data-theme", theme);
    // 清掉舊 .light class（migration safety）
    root.classList.remove("light");
  }, [theme]);

  return null;
}
