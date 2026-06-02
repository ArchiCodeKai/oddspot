"use client";

import Lottie from "lottie-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LottieRefCurrentProps } from "lottie-react";
import { rgbStringToLottieColor, tintLottieColors } from "@/lib/lottie/tintLottie";

type DecisionType = "skip" | "save";

interface SwipeDecisionAnimationProps {
  type: DecisionType;
  variant: "edge" | "stamp" | "button";
  className?: string;
}

const assetPath: Record<DecisionType, string> = {
  skip: "/lottie/swipe/cross.json",
  save: "/lottie/swipe/check.json",
};

const animationCache = new Map<DecisionType, unknown>();
const animationPromises = new Map<DecisionType, Promise<unknown>>();

const colorVar: Record<DecisionType, string> = {
  skip: "--muted-rgb",
  save: "--accent-rgb",
};

const alphaByVariant: Record<SwipeDecisionAnimationProps["variant"], number> = {
  edge: 0.72,
  stamp: 0.96,
  button: 0.9,
};

export function SwipeDecisionAnimation({
  type,
  variant,
  className,
}: SwipeDecisionAnimationProps) {
  const reducedMotion = usePrefersReducedMotion();
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const themeColor = useThemeLottieColor(colorVar[type], alphaByVariant[variant]);
  const [animationData, setAnimationData] = useState<unknown>(() => animationCache.get(type) ?? null);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    const cached = animationCache.get(type);

    if (cached) {
      setAnimationData(cached);
      return;
    }

    preloadSwipeDecisionAnimation(type)
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [reducedMotion, type]);

  const tintedAnimationData = useMemo(
    () => (animationData ? tintLottieColors(animationData, themeColor) : null),
    [animationData, themeColor]
  );

  const style = useMemo<CSSProperties>(() => ({
    color: type === "save" ? "var(--accent)" : "var(--muted)",
  }), [type]);

  useEffect(() => {
    lottieRef.current?.setSpeed(1.8);
  }, [tintedAnimationData]);

  if (variant === "edge") {
    return (
      <span
        className={`swipe-decision-animation swipe-decision-animation--${variant} ${className ?? ""}`}
        style={style}
        aria-hidden="true"
      >
        <DecisionStyles />
        <DecisionFallbackIcon type={type} />
      </span>
    );
  }

  return (
    <span
      className={`swipe-decision-animation swipe-decision-animation--${variant} ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    >
      <DecisionStyles />
      {tintedAnimationData && !reducedMotion ? (
        <>
          <span className="swipe-decision-animation__underlay">
            <DecisionFallbackIcon type={type} />
          </span>
          <Lottie
            lottieRef={lottieRef}
            animationData={tintedAnimationData}
            loop={false}
            autoplay
            className="swipe-decision-animation__lottie"
            rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
          />
        </>
      ) : (
        <DecisionFallbackIcon type={type} />
      )}
    </span>
  );
}

function DecisionStyles() {
  return (
    <style>{`
      .swipe-decision-animation {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: currentColor;
        pointer-events: none;
      }
      .swipe-decision-animation--edge {
        width: 66px;
        height: 66px;
        opacity: 0.88;
        filter: saturate(0.78) contrast(1.05);
      }
      .swipe-decision-animation--stamp {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 112px;
        height: 112px;
        transform: translate(-50%, -50%);
        border: 2px solid currentColor;
        border-radius: 2px;
        background:
          linear-gradient(135deg, rgb(var(--foreground-rgb) / 0.05), transparent 44%),
          rgb(var(--background-rgb) / 0.34);
        backdrop-filter: blur(4px);
        box-shadow:
          0 0 22px rgb(var(--background-rgb) / 0.46),
          inset 0 0 18px rgb(var(--accent-rgb) / 0.08);
      }
      .swipe-decision-animation--button {
        width: 30px;
        height: 30px;
      }
      .swipe-decision-animation__lottie {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
      }
      .swipe-decision-animation--stamp .swipe-decision-animation__lottie {
        width: 82%;
        height: 82%;
      }
      .swipe-decision-animation__fallback {
        width: 54%;
        height: 54%;
        color: currentColor;
      }
      .swipe-decision-animation__underlay {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.34;
      }
      @media (prefers-reduced-motion: reduce) {
        .swipe-decision-animation {
          filter: none;
        }
      }
    `}</style>
  );
}

export function preloadSwipeDecisionAnimations() {
  void preloadSwipeDecisionAnimation("skip").catch(() => undefined);
  void preloadSwipeDecisionAnimation("save").catch(() => undefined);
}

function preloadSwipeDecisionAnimation(type: DecisionType) {
  const cached = animationCache.get(type);
  if (cached) return Promise.resolve(cached);

  const pending = animationPromises.get(type);
  if (pending) return pending;

  const promise = fetch(assetPath[type])
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load swipe lottie: ${assetPath[type]}`);
      return response.json();
    })
    .then((data) => {
      animationCache.set(type, data);
      animationPromises.delete(type);
      return data;
    })
    .catch((error) => {
      animationPromises.delete(type);
      throw error;
    });

  animationPromises.set(type, promise);
  return promise;
}

function useThemeLottieColor(cssVarName: string, alpha: number) {
  const [color, setColor] = useState(() => rgbStringToLottieColor("", alpha));

  useEffect(() => {
    const updateColor = () => {
      const rgbValue = getComputedStyle(document.documentElement).getPropertyValue(cssVarName);
      setColor(rgbStringToLottieColor(rgbValue, alpha));
    };

    updateColor();

    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, [alpha, cssVarName]);

  return color;
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function DecisionFallbackIcon({ type }: { type: DecisionType }) {
  if (type === "save") {
    return (
      <svg className="swipe-decision-animation__fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  return (
    <svg className="swipe-decision-animation__fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
