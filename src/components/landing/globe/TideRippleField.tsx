"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";

// 月球驅動的「事件式表面波紋」— pure data provider
//
// 不再渲染任何 ring geometry / line / halo points
// 只負責：定期在 sub-lunar 點觸發 ripple event，把資料丟給 OceanTideGlow
//   由 ocean particle 自己根據 wave-front 公式變亮 → 視覺上是一片粒子的波動，
//   而不是一條 360° 大圓掃描線
//
// origin 在生成瞬間 snapshot 後固定，不跟著月球移動
// angularRadius 不擴到 π（不再變成大圓掃描），最遠到 ~1.25 rad（局部表面）

const POOL_SIZE = 3;                       // 同時最多 3 個 ripple
const SPAWN_INTERVAL_MIN = 2.8;            // 生成間隔（秒）
const SPAWN_INTERVAL_MAX = 3.6;
const RIPPLE_LIFETIME_MIN = 2.2;
const RIPPLE_LIFETIME_MAX = 3.0;
const MAX_ANGULAR_RADIUS = 1.25;           // 最遠擴散 ~71.6°（不會變成大圓）
const RIPPLE_STRENGTH = 3.5;               // 給 OceanTideGlow 用的亮度倍率

export interface ActiveRipple {
  /** 球面單位向量（earth local frame），ripple 中心 */
  origin: THREE.Vector3;
  /** 生成時間（clock.elapsedTime） */
  startTime: number;
  /** 生命週期（秒） */
  lifetime: number;
  /** 角向擴散速度（rad/s）= maxAngularRadius / lifetime */
  speed: number;
  /** 亮度倍率（給 ocean particle wave-front 公式） */
  strength: number;
}

export interface TideRippleFieldHandle {
  /** 給 OceanTideGlow 用：取得目前活躍的 ripples */
  getActiveRipples: () => ActiveRipple[];
}

interface TideRippleFieldProps {
  moonRef: React.RefObject<THREE.Group | null>;
  earthSpinRef: React.RefObject<THREE.Group | null>;
}

export const TideRippleField = forwardRef<TideRippleFieldHandle, TideRippleFieldProps>(
  function TideRippleField({ moonRef, earthSpinRef }, ref) {
    const ripplesRef = useRef<(ActiveRipple | null)[]>(Array(POOL_SIZE).fill(null));
    const nextSpawnRef = useRef<number>(2.0);

    const tmpMoon = useMemo(() => new THREE.Vector3(), []);

    useImperativeHandle(
      ref,
      () => ({
        getActiveRipples: () => {
          const result: ActiveRipple[] = [];
          for (const r of ripplesRef.current) {
            if (r) result.push(r);
          }
          return result;
        },
      }),
      [],
    );

    useFrame(({ clock }) => {
      const now = clock.elapsedTime;

      // ─── Spawn 新 ripple（只在有空位時觸發） ─────────────────
      if (now >= nextSpawnRef.current) {
        const emptyIdx = ripplesRef.current.findIndex((r) => r === null);
        const moon = moonRef.current;
        const earth = earthSpinRef.current;
        if (emptyIdx !== -1 && moon && earth) {
          // Sub-lunar point 轉到 earth local frame
          moon.getWorldPosition(tmpMoon);
          earth.worldToLocal(tmpMoon);
          tmpMoon.normalize();
          const origin = tmpMoon.clone();

          const lifetime = RIPPLE_LIFETIME_MIN + Math.random() * (RIPPLE_LIFETIME_MAX - RIPPLE_LIFETIME_MIN);
          const speed = MAX_ANGULAR_RADIUS / lifetime; // 在 lifetime 內擴到 MAX_ANGULAR_RADIUS

          ripplesRef.current[emptyIdx] = {
            origin,
            startTime: now,
            lifetime,
            speed,
            strength: RIPPLE_STRENGTH,
          };
        }
        nextSpawnRef.current = now + SPAWN_INTERVAL_MIN
          + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
      }

      // ─── 過期 ripple 清理 ────────────────────────────────────
      for (let s = 0; s < POOL_SIZE; s++) {
        const r = ripplesRef.current[s];
        if (!r) continue;
        if (now - r.startTime >= r.lifetime) {
          ripplesRef.current[s] = null;
        }
      }
    });

    // 純資料層：不渲染任何 geometry
    return null;
  },
);
