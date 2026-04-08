import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

export interface Spot {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  lat: number;
  lng: number;
  address?: string;
  category: SpotCategory;
  status: SpotStatus;
  difficulty: "easy" | "medium" | "hard";
  images: string; // JSON string: ["url1", "url2"]
  rating: number;
  visitCount: number;
  lastVerifiedAt?: Date;
  recommendedTime?: string;
  legend?: string;
  googlePlaceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 地圖標記用（輕量化）
export interface SpotMapPoint {
  id: string;
  name: string;
  nameEn?: string;
  category: SpotCategory;
  status: SpotStatus;
  difficulty: "easy" | "medium" | "hard";
  lat: number;
  lng: number;
  coverImage: string;
  distance?: number;
}

// 卡片顯示用
export interface SpotCard {
  id: string;
  name: string;
  nameEn?: string;
  category: SpotCategory;
  status: SpotStatus;
  difficulty: "easy" | "medium" | "hard";
  coverImage: string;
  distance?: number;
}

// 詳情頁用（images 已解析為陣列）
export interface SpotDetail {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  lat: number;
  lng: number;
  address?: string;
  category: SpotCategory;
  status: SpotStatus;
  difficulty: "easy" | "medium" | "hard";
  images: string[];
  rating: number;
  visitCount: number;
  lastVerifiedAt?: string;
  recommendedTime?: string;
  legend?: string;
  googlePlaceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpotFilters {
  radius?: number;
  categories?: SpotCategory[];
  status?: SpotStatus[];
  difficulty?: ("easy" | "medium" | "hard")[];
}

export interface SpotSearchParams {
  lat: number;
  lng: number;
  radius: number;
  filters?: SpotFilters;
}
