import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// 載入順序（後面覆蓋前面）：
//   1. .env       — CI / production defaults
//   2. .env.local — local secrets (Next.js 慣例的 git-ignored 檔)
loadEnv();
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
