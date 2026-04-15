import { useQuery } from "@tanstack/react-query";
import { fetchSpots, type SpotsListResponse } from "@/services/spotsService";

// 台北市中心作為無定位時的預設座標
const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };

interface UseSpotsParams {
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  categories?: string[];
}

export function useSpots({ userLocation, radius, categories }: UseSpotsParams) {
  const lat = userLocation?.lat ?? TAIPEI_CENTER.lat;
  const lng = userLocation?.lng ?? TAIPEI_CENTER.lng;

  return useQuery<SpotsListResponse, Error>({
    queryKey: ["spots", lat, lng, radius, categories ?? []],
    queryFn: () => fetchSpots({ lat, lng, radius, categories }),
    staleTime: 5 * 60 * 1000,
  });
}
