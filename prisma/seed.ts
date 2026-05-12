import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 26 個真實台灣 quirky spots，來源：波波黛莉文章 + 使用者補充
// 8 個分類：religious-site / peculiar-place / giant-object / modern-ruins /
//          urban-legend / curiosity-shop / graffiti / living-landmark
// 座標來源：✅ = Google Maps 短連結精確值；🔵 = 從地址估算（誤差 50-200m，使用者之後可在 Google Maps 點地址校正）
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
  // ─── giant-object：巨型物體 ──────────────────────────────
  {
    name: "超好躺的消波塊",
    nameEn: "Comfy Wave Breakers",
    description: "台東海濱的消波塊像天然戶外沙發，吹海風躺一下都很值得",
    descriptionEn: "Wave-breaker blocks on Taitung's coast that locals use as outdoor sofas, perfect for catching the sea breeze",
    lat: 22.7600,
    lng: 121.1550,
    address: "950 臺東縣台東市",
    category: "giant-object",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "超好躺ㄉ俗頭。擂臺戰",
    nameEn: "Comfy Stone Arena (Hualien)",
    description: "花蓮南濱公園長堤上的一顆大石頭，被居民拿來當「躺得最爽」擂臺",
    descriptionEn: "A laying-sized stone on Hualien's South Beach promenade, turned into a local \"who-lies-best\" arena",
    lat: 23.9665,
    lng: 121.6175,
    address: "970 花蓮縣花蓮市（花蓮南濱公園長堤）",
    category: "giant-object",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "勾北勾北紀念碑",
    nameEn: "Gou-Bei Memorial",
    description: "高雄三民區從迷因影片演變來的諷刺紀念碑",
    descriptionEn: "A satirical \"memorial\" in Sanmin, Kaohsiung, born from an internet meme video",
    lat: 22.6492,
    lng: 120.2998,
    address: "807 高雄市三民區正宗路",
    category: "giant-object",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "虱目魚小子",
    nameEn: "Milkfish Boy",
    description: "台南北門巷弄裡奇怪又可愛的虱目魚造型存在",
    descriptionEn: "A peculiar, oddly cute milkfish figure tucked into a back alley in Beimen, Tainan",
    lat: 23.2683,
    lng: 120.1373,
    address: "727 臺南市北門區",
    category: "giant-object",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "卡皮巴拉石",
    nameEn: "Capybara Stone",
    description: "形狀像卡皮巴拉（水豚）的天然石頭",
    descriptionEn: "A natural stone shaped like a capybara",
    lat: 25.2890875,
    lng: 121.5095954,
    address: "新北市汐止區附近",
    category: "giant-object",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "超好躺俗頭",
    nameEn: "Comfy Stone (Xinyi)",
    description: "信義區松仁路 A13 前的躺臥用大石頭",
    descriptionEn: "A laying-sized stone in front of A13, Songren Rd, Xinyi",
    lat: 25.0356,
    lng: 121.5685,
    address: "110 臺北市信義區松仁路（A13 前）",
    category: "giant-object",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },

  // ─── peculiar-place：特殊場域 ──────────────────────────────
  {
    name: "一群流浪的木頭",
    nameEn: "Wandering Wood Pile",
    description: "台東大同路上不知為何堆著一群「流浪木頭」，路人忍不住停下來想像它們的故事",
    descriptionEn: "A pile of seemingly aimless wood on Datong Rd, Taitung — passersby can't help but invent stories for them",
    lat: 22.7560,
    lng: 121.1457,
    address: "950 臺東縣台東市大同路 86 號",
    category: "peculiar-place",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "冷氣室外機奇觀",
    nameEn: "AC Unit Tableau",
    description: "台北雙連街巷子裡一整排室外機，意外排成像藝術裝置，是台灣街景特有的感性",
    descriptionEn: "A row of AC outdoor units in a Shuanglian alley, accidentally arranged like an art installation — peak Taiwan streetscape",
    lat: 25.0585,
    lng: 121.5208,
    address: "103 臺北市大同區雙連街 1 巷 20 號",
    category: "peculiar-place",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "How Sweet 平交道",
    nameEn: "How Sweet Crossing",
    description: "NewJeans《How Sweet》MV 取景的礁溪平交道，從鐵軌瞬間變成迷因景點",
    descriptionEn: "The Jiaoxi railway crossing used in NewJeans' \"How Sweet\" MV, turned overnight into a meme spot",
    lat: 24.8255,
    lng: 121.7755,
    address: "262 宜蘭縣礁溪鄉中山路二段 136 巷 21-9 號",
    category: "peculiar-place",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "台東最小的房子",
    nameEn: "Smallest House of Taitung",
    description: "台東鹿野鄉聯絡道路上小到讓人懷疑「真的能住嗎」的微型房子",
    descriptionEn: "A house so tiny on a Luye backroad that visitors wonder if anyone could actually live inside",
    lat: 22.9050,
    lng: 121.1280,
    address: "955 臺東縣鹿野鄉瑞和至瑞源聯絡道路",
    category: "peculiar-place",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "花蓮迪士尼",
    nameEn: "Hualien Disneyland",
    description: "花蓮市新興路上被居民戲稱「花蓮迪士尼」的奇異建築群",
    descriptionEn: "A cluster of peculiar buildings on Xinxing Rd in Hualien, ironically dubbed \"Hualien Disneyland\"",
    lat: 23.9755,
    lng: 121.6075,
    address: "970 花蓮縣花蓮市新興路 38 號",
    category: "peculiar-place",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "雀石",
    nameEn: "Sparrow Stone",
    description: "士林環河快速道路旁的奇異石頭",
    descriptionEn: "A peculiar stone alongside the riverside expressway in Shilin",
    lat: 25.0905,
    lng: 121.4895,
    address: "111 臺北市士林區社新里環河快速道路 133 號",
    category: "peculiar-place",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "貓咪水族箱",
    nameEn: "Cat Aquarium",
    description: "中山區錦州街上的貓咪主題水族箱",
    descriptionEn: "A cat-themed aquarium display on Jinzhou St, Zhongshan",
    lat: 25.0625,
    lng: 121.5430,
    address: "10491 臺北市中山區新生里錦州街 232 號",
    category: "peculiar-place",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },

  // ─── living-landmark：活體地標 ──────────────────────────────
  {
    name: "路霸芒果樹",
    nameEn: "Mango Tree Roadblock",
    description: "高雄苓雅一棵直接霸佔巷口的芒果樹，居民笑稱「車子進不來」",
    descriptionEn: "A mango tree blocking an entire alley entrance in Lingya, Kaohsiung; locals joke it keeps cars out",
    lat: 22.6175,
    lng: 120.3145,
    address: "802 高雄市苓雅區民權一路 91 巷 4 號",
    category: "living-landmark",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "海苔肉鬆",
    nameEn: "Seaweed Pork Floss (Cat)",
    description: "台北羅斯福路四段巷子裡毛色像海苔肉鬆的貓咪，常駐巷弄",
    descriptionEn: "A neighborhood cat on Roosevelt Rd, Taipei, whose fur looks exactly like seaweed pork floss",
    lat: 25.0143,
    lng: 121.5389,
    address: "100 臺北市中正區羅斯福路四段 40 巷",
    category: "living-landmark",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "來看牛牛-東部版",
    nameEn: "Cow Watching Spot (East)",
    description: "台東東河鄉的牛牛觀賞點，享受田園悠閒氛圍",
    descriptionEn: "A pastoral cow-watching spot in Donghe, Taitung — slow-paced rural healing",
    lat: 22.9810,
    lng: 121.3060,
    address: "959 臺東縣東河鄉",
    category: "living-landmark",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "好肥的魚",
    nameEn: "Plump Fish Pond",
    description: "水池裡聚集一群超胖的魚，看起來都被餵得很好",
    descriptionEn: "A pond of overfed fish gathered together, clearly well-fed",
    lat: 25.0132,
    lng: 121.5041,
    address: "臺北市萬華區（25°00'47.5\"N 121°30'14.9\"E）",
    category: "living-landmark",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "林口扁扁樹",
    nameEn: "Linkou Flat Tree",
    description: "林口街邊長成「扁扁」造型的樹，被環境壓出獨特形狀",
    descriptionEn: "A roadside tree in Linkou that grew into an unusually flat shape",
    lat: 25.0758,
    lng: 121.3725,
    address: "244 新北市林口區文化三路二段 158 號",
    category: "living-landmark",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },

  // ─── graffiti：塗鴉標記 ──────────────────────────────
  {
    name: "松江長安路口貓咪",
    nameEn: "Songjiang Cat Mural",
    description: "台北松江長安路口牆上的貓咪塗鴉，偶爾出現吉伊卡哇陪伴",
    descriptionEn: "A cat mural at the Songjiang-Chang'an intersection in Taipei, occasionally joined by Chiikawa friends",
    lat: 25.0490,
    lng: 121.5333,
    address: "10491 臺北市中山區松江路 59 號",
    category: "graffiti",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "昆陽迷因牆",
    nameEn: "Kunyang Meme Wall",
    description: "台北南港昆陽站附近的迷因主題塗鴉牆（OIIA ST.）",
    descriptionEn: "A meme-themed graffiti wall near Kunyang Station in Nangang, Taipei (OIIA ST.)",
    lat: 25.050164,
    lng: 121.5940722,
    address: "115 臺北市南港區（昆陽站附近）",
    category: "graffiti",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },

  // ─── curiosity-shop：珍奇商家 ──────────────────────────────
  {
    name: "心碎小狗收容中心 永和二店",
    nameEn: "Heartbroken Puppy Shelter (Yonghe 2)",
    description: "新北永和秀朗路一家命名超荒謬的店，實際是美術品專賣店",
    descriptionEn: "A shop on Xiulang Rd, Yonghe, with an absurd \"Heartbroken Puppy Shelter\" name — actually an art supply store",
    lat: 25.0010,
    lng: 121.5215,
    address: "234 新北市永和區秀朗路二段 8 號",
    category: "curiosity-shop",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
  {
    name: "離婚 500",
    nameEn: "Divorce 500",
    description: "台南府前路上一家命名超直接的店，命名跟離婚有關",
    descriptionEn: "A shop on Fuqian Rd in Tainan with a bluntly named \"Divorce 500\" storefront",
    lat: 22.9870,
    lng: 120.2010,
    address: "700 臺南市中西區府前路一段",
    category: "curiosity-shop",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },

  // ─── urban-legend：都市傳說 ──────────────────────────────
  {
    name: "鴕鳥大逃亡",
    nameEn: "Ostrich Escape",
    description: "網路上流傳的鴕鳥逃跑事件地，地圖迷因景點",
    descriptionEn: "A spot tied to an internet legend of escaped ostriches, a meme-driven landmark",
    lat: 24.054117,
    lng: 120.6480756,
    address: "台中市（鴕鳥記者在這）",
    category: "urban-legend",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },

  // ─── modern-ruins：現代廢墟 ──────────────────────────────
  {
    name: "白水湖馬桶駐在所",
    nameEn: "Baishuihu Toilet Outpost",
    description: "嘉義布袋白水湖海邊的廢棄日治時期駐在所，因外型被叫「馬桶」",
    descriptionEn: "An abandoned colonial-era outpost in Baishuihu, Chiayi, locally nicknamed for its distinctive form",
    lat: 23.4044751,
    lng: 120.1516838,
    address: "625 嘉義縣布袋鎮白水湖",
    category: "modern-ruins",
    status: "active",
    difficulty: "medium",
    images: JSON.stringify([]),
  },
  {
    name: "翡翠灣太空玲瓏屋",
    nameEn: "Feicui Bay Space Pod House",
    description: "新北萬里翡翠灣那組廢棄的太空艙造型度假屋遺跡",
    descriptionEn: "The abandoned UFO-shaped vacation pods at Feicui Bay, Wanli, New Taipei",
    lat: 25.187194,
    lng: 121.686181,
    address: "207 新北市萬里區翡翠灣",
    category: "modern-ruins",
    status: "active",
    difficulty: "medium",
    images: JSON.stringify([]),
  },

  // ─── religious-site：宗教建築 ──────────────────────────────
  {
    name: "石門貝殼廟",
    nameEn: "Shimen Shell Temple",
    description: "新北石門海岸上用珊瑚與貝殼打造的奇異廟宇（台灣珊瑚貝殼廟新廟）",
    descriptionEn: "A peculiar temple on Shimen's coast built from coral and seashells (Taiwan Coral & Shell Temple)",
    lat: 25.2698953,
    lng: 121.535392,
    address: "253 新北市石門區",
    category: "religious-site",
    status: "active",
    difficulty: "easy",
    images: JSON.stringify([]),
  },
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
        googlePlaceId: `seed-${spot.nameEn?.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
      },
      update: {},
      create: {
        ...spot,
        googlePlaceId: `seed-${spot.nameEn?.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
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
