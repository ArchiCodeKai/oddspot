export const ROUTES = {
  HOME: "/",
  MAP: "/map",
  SPOT_DETAIL: (id: string) => `/spots/${id}`,
  PROFILE: "/profile",
} as const;
