"use client";

import { useEffect, useRef, useId } from "react";
import gsap from "gsap";

// SVG path 常數：與 oddspot-icon-preview.html makeErrorTl 完全一致
const PATH_OPEN   = "M34 56 C33 48,45 40,58 40 C69 40,77 45,75 52 C73 60,61 66,49 66 C39 66,34 62,34 56Z";
const PATH_DROOPY = "M34 57 C33 53,45 50,58 50 C69 50,77 52,75 55 C73 58,61 60,49 60 C39 60,34 59,34 57Z";

interface ErrorIconProps {
  size?: number;
}

export function ErrorIcon({ size = 160 }: ErrorIconProps) {
  // 目前所有 AppTheme 皆為深色系
  const isDark = true;

  const stroke   = isDark ? "#00e5cc" : "#0d5c4a";
  const iris     = isDark ? "#00e5cc" : "#0d5c4a";
  const pupil    = isDark ? "#013629" : "#e4ede8";
  const tearFill = isDark ? "#00e5cc" : "#0d5c4a";

  // useId() 是 SSR-safe：server 和 client hydration 兩端產生相同的 id
  // Math.random() 在 SSR 和 client 值不同，導致 querySelector 找不到元素
  const reactId = useId();
  const uid = reactId.replace(/:/g, "-"); // useId 回傳 ":r0:" 等格式，冒號不合法於 CSS selector

  const svgRef = useRef<SVGSVGElement>(null);
  const tlRef  = useRef<gsap.core.Timeline | null>(null);

  const height = Math.round(size * (130 / 110));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // 用 ref 直接選取，比字串 selector 更可靠
    const lid  = svg.querySelector<SVGPathElement>(`[data-gsap="${uid}-lid"]`);
    const clip = svg.querySelector<SVGPathElement>(`[data-gsap="${uid}-clip"]`);
    const tear = svg.querySelector<SVGPathElement>(`[data-gsap="${uid}-tear"]`);

    if (!lid || !clip || !tear) return;

    // 完整還原 makeErrorTl 邏輯
    const tl = gsap.timeline({ repeat: -1 });

    tl.set(tear, { y: 0, scaleY: 1, opacity: 0.9, transformOrigin: "50% 0%" });

    // 眼皮下垂（哀傷）
    tl.to([lid, clip], { attr: { d: PATH_DROOPY }, duration: 2.2, ease: "sine.inOut" });

    // 眼淚第一滴：滾落 + 拉長 + 末端消散
    tl.to(tear, { y: 24, scaleY: 1.5, duration: 1.5, ease: "power2.in" }, "-=0.5");
    tl.to(tear, { opacity: 0, duration: 0.5, ease: "sine.out" }, "<+1.0");

    // 重置，重新凝結浮現
    tl.set(tear, { y: 0, scaleY: 1, opacity: 0 });
    tl.to(tear, { opacity: 0.9, duration: 0.4, ease: "sine.in" });
    tl.to({}, { duration: 0.5 });

    // 眼皮微微張開，喘口氣
    tl.to([lid, clip], { attr: { d: PATH_OPEN }, duration: 2.0, ease: "sine.inOut" });
    tl.to({}, { duration: 0.5 });

    // 眼淚第二滴
    tl.to(tear, { y: 24, scaleY: 1.5, transformOrigin: "50% 0%", duration: 1.5, ease: "power2.in" });
    tl.to(tear, { opacity: 0, duration: 0.5, ease: "sine.out" }, "<+1.0");

    // 重置，停頓後循環
    tl.set(tear, { y: 0, scaleY: 1, opacity: 0 });
    tl.to(tear, { opacity: 0.9, duration: 0.3, ease: "sine.in" });
    tl.to({}, { duration: 1.0 });

    tlRef.current = tl;
    return () => { tl.kill(); };
  }, [uid]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={height}
      viewBox="0 0 110 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 身體輪廓 */}
      <path
        d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z"
        stroke={stroke}
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <defs>
        {/* clipPath id 依然需要用 id（CSS clipPath 引用），但 GSAP 目標改用 data-gsap */}
        <clipPath id={`${uid}-clip`}>
          <path
            data-gsap={`${uid}-clip`}
            d={PATH_OPEN}
          />
        </clipPath>
        <clipPath id={`${uid}-iris-clip`}>
          <path d="M56 38 C62 38,66 42,65 47 C64 53,59 57,53 56 C48 56,46 52,47 47 C48 42,51 38,56 38Z" />
        </clipPath>
      </defs>

      {/* 眼皮輪廓（GSAP 動畫目標） */}
      <path
        data-gsap={`${uid}-lid`}
        d={PATH_OPEN}
        stroke={stroke}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 眼球 */}
      <g clipPath={`url(#${uid}-clip)`}>
        <path
          d="M56 42 C62 42,66 46,65 51 C64 57,59 61,53 60 C48 60,46 56,47 51 C48 46,51 42,56 42Z"
          fill={iris}
        />
        <g clipPath={`url(#${uid}-iris-clip)`}>
          <path
            d="M55 47 C58 47,60 49,59 52 C58 55,55 56,53 55 C51 54,50 52,51 50 C52 48,53 47,55 47Z"
            fill={pupil}
          />
          {isDark && (
            <ellipse cx="60.4" cy="45.6" rx="1.5" ry="1.1" fill="white" fillOpacity="0.72" />
          )}
        </g>
      </g>

      {/* 眼淚（GSAP 動畫目標） */}
      <path
        data-gsap={`${uid}-tear`}
        d="M59 72 C61.8 75,63.4 79.3,63 84 C62.6 88.1,60.4 91.6,57.4 91.6 C54.4 91.6,52 88.2,51.7 84 C51.3 79.4,53 75,55.8 72 C56.8 70.9,58 70.9,59 72Z"
        fill={tearFill}
        fillOpacity={isDark ? 0.92 : 1}
      />
    </svg>
  );
}
