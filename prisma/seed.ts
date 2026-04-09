import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const spots = [
  {
    name: "萬華艋舺地下廟",
    nameEn: "Wanhua Underground Temple",
    description: "隱藏在停車場地下室的百年廟宇，供奉著說不清楚來歷的神明。",
    descriptionEn: "A century-old temple hidden beneath a parking garage, housing deities of uncertain origin.",
    lat: 25.0367,
    lng: 121.4988,
    address: "台北市萬華區",
    category: "weird-temple",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify(["/spots/wanhua-temple-01.jpg"]),
    recommendedTime: "平日下午",
    legend: "據說廟裡的神明會在深夜獨自移動位置，隔天早上永遠不在原來的地方。",
  },
  {
    name: "松山菸廠廢棄倉庫群",
    nameEn: "Abandoned Songshan Tobacco Warehouse",
    description: "文創園區外圍仍有未對外開放的廢棄廠房，斑駁牆面覆滿苔蘚與塗鴉。",
    descriptionEn: "Abandoned factory buildings outside the cultural park, walls covered in moss and graffiti.",
    lat: 25.0447,
    lng: 121.5594,
    address: "台北市信義區光復南路",
    category: "abandoned",
    status: "uncertain",
    difficulty: "medium",
    images: JSON.stringify(["/spots/songshan-warehouse-01.jpg"]),
    recommendedTime: "傍晚",
  },
  {
    name: "大稻埕碼頭守護神像",
    nameEn: "Dadaocheng Wharf Guardian Statue",
    description: "碼頭旁矗立的巨型神明立牌，身高近五層樓，日落時分映著河光格外震撼。",
    descriptionEn: "A giant deity figure standing five stories tall beside the wharf, stunning at sunset.",
    lat: 25.0607,
    lng: 121.5100,
    address: "台北市大同區大稻埕碼頭",
    category: "giant-object",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify(["/spots/dadaocheng-statue-01.jpg"]),
    recommendedTime: "日落前後",
  },
  {
    name: "北投地熱谷鬼湖",
    nameEn: "Beitou Hell Valley",
    description: "冒著硫磺蒸氣的藍綠色溫泉池，舊稱「地獄谷」，水溫常年超過攝氏九十度。",
    descriptionEn: "A blue-green sulfuric hot spring pool nicknamed 'Hell Valley', perpetually at 90°C.",
    lat: 25.1368,
    lng: 121.5093,
    address: "台北市北投區中山路",
    category: "urban-legend",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify(["/spots/beitou-hell-01.jpg"]),
    recommendedTime: "早晨霧氣最重",
    legend: "日治時代曾有人在此失蹤，當地人說每逢起霧就能聽到奇怪的哭聲。",
  },
  {
    name: "永和頂溪彩虹地下道",
    nameEn: "Yonghe Rainbow Underpass",
    description: "用高飽和色彩覆蓋整個地下道，每隔一段時間配色都會改變，沒有任何說明牌。",
    descriptionEn: "A fully painted underpass with saturated rainbow colors that changes periodically, no signage.",
    lat: 25.0118,
    lng: 121.5143,
    address: "新北市永和區頂溪站附近",
    category: "kitsch",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify(["/spots/yonghe-rainbow-01.jpg"]),
    recommendedTime: "任何時間",
  },
  {
    name: "南港廢棄火力發電廠煙囪",
    nameEn: "Abandoned Nangang Power Plant Chimney",
    description: "三根高聳的廢棄煙囪矗立在廠房廢墟中，是老台北人記憶裡的城市地標。",
    descriptionEn: "Three towering abandoned chimneys stand among factory ruins, a fading landmark of old Taipei.",
    lat: 25.0548,
    lng: 121.6055,
    address: "台北市南港區",
    category: "abandoned",
    status: "uncertain",
    difficulty: "hard",
    images: JSON.stringify(["/spots/nangang-chimney-01.jpg"]),
    recommendedTime: "晴天下午",
  },
  {
    name: "行天宮地下街命理巷",
    nameEn: "Xingtian Temple Fortune Teller Alley",
    description: "地下街裡密集排列的算命攤，每間都貼滿奇異符咒，氣氛宛如另一個世界。",
    descriptionEn: "A dense row of fortune teller stalls in the underground mall, covered in mysterious talismans.",
    lat: 25.0626,
    lng: 121.5349,
    address: "台北市中山區行天宮地下街",
    category: "weird-temple",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify(["/spots/xingtian-alley-01.jpg"]),
    recommendedTime: "下午兩點後",
  },
  {
    name: "信義區廢棄溜冰場",
    nameEn: "Abandoned Xinyi Ice Rink",
    description: "曾經熱鬧的室內溜冰場已荒廢多年，冰面融化後露出下方奇特的格狀地板結構。",
    descriptionEn: "A once-popular ice rink abandoned for years, the melted ice revealing a strange grid floor beneath.",
    lat: 25.0330,
    lng: 121.5641,
    address: "台北市信義區",
    category: "abandoned",
    status: "disappeared",
    difficulty: "hard",
    images: JSON.stringify(["/spots/xinyi-icerink-01.jpg"]),
    recommendedTime: "需提前確認是否仍可進入",
  },
  {
    name: "劍潭公園外星人雕像",
    nameEn: "Jiantan Park Alien Sculpture",
    description: "公園角落佇立著一組造型詭異的人形雕像，姿態奇特，創作者不明，設置年份不可考。",
    descriptionEn: "A cluster of bizarre humanoid sculptures in a park corner — creator unknown, date uncertain.",
    lat: 25.0847,
    lng: 121.5200,
    address: "台北市士林區劍潭公園",
    category: "absurd-landscape",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify(["/spots/jiantan-sculpture-01.jpg"]),
    recommendedTime: "夜晚打燈時更有氣氛",
  },
  {
    name: "西門町三層夾娃娃機迷宮",
    nameEn: "Ximending Multi-Floor Claw Machine Maze",
    description: "整棟樓三層樓全部都是夾娃娃機，走道蜿蜒複雜，有些角落已無人管理，機台自行運轉。",
    descriptionEn: "Three floors entirely filled with claw machines, winding aisles, some corners unmanned and running.",
    lat: 25.0421,
    lng: 121.5077,
    address: "台北市萬華區西門町",
    category: "odd-shopfront",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify(["/spots/ximending-claw-01.jpg"]),
    recommendedTime: "夜晚人潮散去後",
  },
];

async function main() {
  console.log("開始寫入 seed data...");

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
