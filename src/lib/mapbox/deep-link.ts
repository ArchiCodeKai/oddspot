// 外部地圖 app deep link 產生器。
//
// 規則：
// - iOS：Google Maps app（comgooglemaps://）+ Apple Maps（單點時才出）
// - Android：Google Maps web + geo: scheme 觸發 system picker
// - Desktop：Google Maps web（新分頁）
//
// 多點時：
// - Google Maps 支援 waypoints，完整轉達順序
// - Apple Maps 不支援，在多點規劃時完全隱藏（使用者決策 A）

export interface NavWaypoint {
  lat: number;
  lng: number;
  label: string;
}

export type Platform = "ios" | "android" | "desktop";

export type NavApp = "google-web" | "google-ios" | "apple-maps" | "android-geo";

export interface ExternalNavOption {
  app: NavApp;
  label: string;
  url: string;
  // app scheme 失敗時的 web fallback URL（目前只有 google-ios 會帶）
  fallbackUrl?: string;
}

export interface ExternalNavLinks {
  platform: Platform;
  options: ExternalNavOption[];
}

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function buildGoogleWebUrl(points: NavWaypoint[]): string {
  const origin = points[0];
  const destination = points[points.length - 1];
  const middle = points.slice(1, -1);

  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });

  if (middle.length > 0) {
    params.set(
      "waypoints",
      middle.map((p) => `${p.lat},${p.lng}`).join("|")
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildGoogleIosUrl(points: NavWaypoint[]): string {
  const origin = points[0];
  const destination = points[points.length - 1];
  const middle = points.slice(1, -1);

  // comgooglemaps:// 中間點用 +to: 串接
  const middleSegment =
    middle.length > 0
      ? middle.map((p) => `+to:${p.lat},${p.lng}`).join("")
      : "";

  return `comgooglemaps://?saddr=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}${middleSegment}&directionsmode=driving`;
}

function buildAppleMapsUrl(points: NavWaypoint[]): string {
  // Apple Maps 不支援多點，這個函式只在 points.length === 1 時呼叫
  const destination = points[points.length - 1];
  return `maps://?daddr=${destination.lat},${destination.lng}`;
}

function buildAndroidGeoUrl(points: NavWaypoint[]): string {
  const destination = points[points.length - 1];
  const label = encodeURIComponent(destination.label);
  return `geo:${destination.lat},${destination.lng}?q=${destination.lat},${destination.lng}(${label})`;
}

export function buildExternalNavLinks(points: NavWaypoint[]): ExternalNavLinks {
  if (points.length === 0) {
    return { platform: detectPlatform(), options: [] };
  }

  const platform = detectPlatform();
  const isMultiPoint = points.length > 1;

  if (platform === "ios") {
    const options: ExternalNavOption[] = [
      {
        app: "google-ios",
        label: "Google Maps",
        url: buildGoogleIosUrl(points),
        // 沒裝 Google Maps app 時 fallback 到 web 版（同樣支援 waypoints）
        fallbackUrl: buildGoogleWebUrl(points),
      },
    ];
    // 多點時隱藏 Apple Maps（避免使用者中間點被吞掉）
    if (!isMultiPoint) {
      options.push({
        app: "apple-maps",
        label: "Apple Maps",
        url: buildAppleMapsUrl(points),
      });
    }
    return { platform, options };
  }

  if (platform === "android") {
    return {
      platform,
      options: [
        {
          app: "google-web",
          label: "Google Maps",
          url: buildGoogleWebUrl(points),
        },
        {
          app: "android-geo",
          label: "其他地圖 app",
          url: buildAndroidGeoUrl(points),
        },
      ],
    };
  }

  // desktop
  return {
    platform,
    options: [
      {
        app: "google-web",
        label: "Google Maps（新分頁）",
        url: buildGoogleWebUrl(points),
      },
    ],
  };
}

// 觸發 app scheme，timeoutMs 後若頁面仍 visible 就 fallback 到 web URL。
//
// 原理：
// - 成功跳到 app → 頁面進入 hidden → 瀏覽器 throttle setTimeout
//   → callback 觸發時 elapsed 遠大於 timeoutMs → 條件不成立，不 fallback
// - app scheme 失敗（iOS 沒裝對應 app）→ 頁面保持 visible
//   → elapsed 約等於 timeoutMs → 條件成立 → fallback 到 web URL
//
// 500ms 容差是給主執行緒被卡住造成 callback 微延遲的緩衝。
export function tryAppSchemeWithFallback(
  appSchemeUrl: string,
  webFallbackUrl: string,
  timeoutMs = 2500,
): void {
  if (typeof window === "undefined") return;
  const start = Date.now();
  window.setTimeout(() => {
    const elapsed = Date.now() - start;
    if (
      document.visibilityState === "visible" &&
      elapsed < timeoutMs + 500
    ) {
      window.location.href = webFallbackUrl;
    }
  }, timeoutMs);
  window.location.href = appSchemeUrl;
}
