import { z } from "zod";
import { CATEGORY_VALUES, type SpotCategory } from "./constants/categories";

// CUID（Prisma 預設）：c + 24 字 lowercase a-z 0-9
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, "無效 ID 格式");

export const categorySchema = z.enum(
  CATEGORY_VALUES as [SpotCategory, ...SpotCategory[]],
);

export const difficultySchema = z.enum(["easy", "medium", "hard"]);

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

// GET /api/spots query
// searchParams 拿到的都是 string，用 z.coerce 自動轉 number
// categories 是 "a,b,c" 字串，先 split 再驗
export const spotsQuerySchema = z.object({
  lat: z.coerce.number().pipe(latSchema),
  lng: z.coerce.number().pipe(lngSchema),
  radius: z.coerce.number().positive().max(500).optional().default(5),
  categories: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(categorySchema)),
  cursor: cuidSchema.optional(),
});

// POST /api/spots body（用戶投稿）
// 字串長度上限參考 OddSpot 內容性質（短描述為主）
export const createSpotSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  category: categorySchema,
  lat: latSchema,
  lng: lngSchema,
  address: z.string().trim().max(255).optional(),
  difficulty: difficultySchema.optional().default("easy"),
  recommendedTime: z.string().trim().max(100).optional(),
  legend: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().max(500).optional(),
});

// POST /api/saved body（單筆收藏）
export const saveSpotSchema = z.object({
  spotId: cuidSchema,
});

// POST /api/saved/sync body（guest → user 收藏同步）
// 上限 500 防一次塞爆 transaction
export const syncSavedSchema = z.object({
  spotIds: z.array(cuidSchema).max(500),
});

// PATCH /api/admin/spots/[id] body
export const adminActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

// 把 zod 錯誤組成簡明訊息，回給 client（不洩漏內部細節）
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.join(".") || "root";
      return `${path}: ${i.message}`;
    })
    .join("; ");
}
