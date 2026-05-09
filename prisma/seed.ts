import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Categories 重構（v3）：8 個新分類
//   religious-site / peculiar-place / giant-object / modern-ruins
//   urban-legend   / curiosity-shop / graffiti     / living-landmark
// 範例 seed data 已清空，等使用者填入真實景點。
// 加入新景點時範本：見檔案底部註解。
const spots: Array<{
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  lat: number;
  lng: number;
  address: string;
  category: string;
  status: string;
  difficulty: string;
  images: string;
  recommendedTime?: string;
  legend?: string;
}> = [
  // 範本（複製貼上後填值）：
  // {
  //   name: "中文名稱",
  //   nameEn: "English Name",
  //   description: "中文 1-2 句描述",
  //   descriptionEn: "English 1-2 sentence description",
  //   lat: 25.0478,
  //   lng: 121.5319,
  //   address: "完整地址",
  //   category: "religious-site", // religious-site / peculiar-place / giant-object / modern-ruins / urban-legend / curiosity-shop / graffiti / living-landmark
  //   status: "active",            // active / uncertain / disappeared
  //   difficulty: "easy",          // easy / medium / hard
  //   images: JSON.stringify([]),  // 暫無圖片就 [] — UI 會自動顯示 glyph fallback
  //   recommendedTime: "下午兩點後", // 可省略
  //   legend: "傳說或註記",          // 可省略
  // },
];

async function main() {
  console.log("開始寫入 seed data...");

  if (spots.length === 0) {
    console.log("(spots array 是空的，沒有資料要寫入)");
    return;
  }

  for (const spot of spots) {
    await prisma.spot.upsert({
      where: {
        googlePlaceId: `seed-${spot.nameEn?.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        ...spot,
        googlePlaceId: `seed-${spot.nameEn?.toLowerCase().replace(/\s+/g, "-")}`,
      },
    });
  }

  console.log(`完成，共寫入 ${spots.length} 筆景點。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
