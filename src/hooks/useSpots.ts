import { useQuery } from "@tanstack/react-query";
import { fetchSpots, type SpotsListResponse } from "@/services/spotsService";
import type { Bbox, QueryMode } from "@/store/useMapStore";

// 台北市中心作為無定位時的預設座標
const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };

interface UseSpotsParams {
  mode: QueryMode;
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  bbox: Bbox | null;
  categories?: string[];
}

// 雙模式查詢 hook：
//   - radius 模式：以使用者位置（或台北中心 fallback）+ 半徑查詢
//   - viewport 模式：用當前地圖視窗 bbox 查詢（拖到哪查到哪）
// 兩個模式各自有獨立 queryKey，TanStack Query 會分開快取
export function useSpots({ mode, userLocation, radius, bbox, categories }: UseSpotsParams) {
  const lat = userLocation?.lat ?? TAIPEI_CENTER.lat;
  const lng = userLocation?.lng ?? TAIPEI_CENTER.lng;
  // 排序 categories 讓 queryKey 穩定（避免不同順序產生不同 cache 條目）
  const cats = (categories ?? []).slice().sort();

  // viewport 模式但 bbox 還沒設定（地圖剛 mount 還沒觸發 moveend）→ 用 radius fallback
  const useBboxMode = mode === "viewport" && bbox !== null;

  return useQuery<SpotsListResponse, Error>({
    queryKey: useBboxMode
      ? ["spots", "bbox", bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, cats]
      : ["spots", "radius", lat, lng, radius, cats],
    queryFn: () =>
      fetchSpots(
        useBboxMode
          ? { bbox, categories: cats }
          : { lat, lng, radius, categories: cats },
      ),
    staleTime: 5 * 60 * 1000,
  });
}
