import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // dev: SQLite，生產環境改成 PostgreSQL URL
    url: "file:./prisma/dev.db",
  },
});
