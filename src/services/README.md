# services/

API 呼叫封裝層。

| File | 用途 |
|---|---|
| `spotsService.ts` | 封裝 `/api/spots` 呼叫，搭配 `useSpots` hook 用 React Query 快取 |

注意：未來新增 service 時考慮是否移到 `src/lib/api/`，避免 `services/` 跟 `lib/` 邊界模糊。
