import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma config 執行時 process.env 不會自動載入 .env，直接寫死 dev 路徑
    // 生產環境部署時再改成 PostgreSQL URL
    url: "file:./prisma/dev.db",
  },
});
