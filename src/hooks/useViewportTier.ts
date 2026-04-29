"use client";

import { useEffect, useState } from "react";

export type ViewportTier = "mobile" | "tablet" | "desktop";

const MOBILE_QUERY = "(max-width: 767px)";
const TABLET_QUERY = "(min-width: 768px) and (max-width: 1023px)";

// SSR 預設 desktop，避免 hydration mismatch（伺服器無法測螢幕寬）
function computeTier(): ViewportTier {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia(MOBILE_QUERY).matches) return "mobile";
  if (window.matchMedia(TABLET_QUERY).matches) return "tablet";
  return "desktop";
}

function computeReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 螢幕寬度分級 hook
 * - mobile: <= 767px
 * - tablet: 768-1023px
 * - desktop: >= 1024px
 *
 * 用 matchMedia + change listener，DevTools 切換 viewport 時會即時更新
 */
export function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>("desktop");

  useEffect(() => {
    // mount 後立即更新一次（從 SSR 預設的 desktop 切到實際值）
    setTier(computeTier());

    // 兩個 media query 各自監聽，任一變化都重算
    const mqMobile = window.matchMedia(MOBILE_QUERY);
    const mqTablet = window.matchMedia(TABLET_QUERY);
    const handler = () => setTier(computeTier());

    mqMobile.addEventListener("change", handler);
    mqTablet.addEventListener("change", handler);
    // resize 雙保險（部分瀏覽器 matchMedia change 觸發不穩）
    window.addEventListener("resize", handler);

    return () => {
      mqMobile.removeEventListener("change", handler);
      mqTablet.removeEventListener("change", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return tier;
}

/**
 * 偵測 prefers-reduced-motion
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(computeReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/**
 * 是否該用輕量版 Globe
 * mobile 必走輕量；桌面 + reduced motion 也走輕量
 */
export function useShouldUseLightGlobe(): boolean {
  const tier = useViewportTier();
  const reduced = useReducedMotion();
  return tier === "mobile" || reduced;
}
