import type { Metadata } from "next";
import { Space_Mono, Noto_Sans_TC, Noto_Sans_JP, VT323, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { ClientAuthProvider } from "@/components/auth/ClientAuthProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PageTransition } from "@/components/providers/PageTransition";
import { MagneticCursor } from "@/components/ui/MagneticCursor";
import { MapClickEffect } from "@/components/map/MapClickEffect";

// 品牌字體：UI 標籤、英文、數字、系統文字
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// 內容字體：中文景點名稱、描述、正文
const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Display 字體 v2：英文 hero / section 標題（VT323 低像素感）
const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Brand 字體 v2：英文 UI / body / meta（JetBrains Mono）
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// 日文字體：平假名 / 片假名 / 日式漢字（顏文字多數字符也包含在內）
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OddSpot",
  description: "發現台灣城市裡那些說不清楚的地方",
};

// FOUC 防止：在 React 水合前同步套用主題與語言設定
// v3：4 主題（terminal/blueprint/caution/midnight）走 data-theme attribute
const initScript = `
(function() {
  try {
    var validThemes = ["terminal", "blueprint", "caution", "midnight"];
    var theme = "terminal";
    var appStore = localStorage.getItem("oddspot-app");
    if (appStore) {
      var app = JSON.parse(appStore);
      var t = app && app.state && app.state.theme;
      if (validThemes.indexOf(t) !== -1) theme = t;
    }
    document.documentElement.setAttribute("data-theme", theme);
    // 語言
    var localeStore = localStorage.getItem("oddspot-locale");
    if (localeStore) {
      var loc = JSON.parse(localeStore);
      if (loc && loc.state && loc.state.locale) {
        document.documentElement.setAttribute("lang", loc.state.locale);
      }
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="zh-TW"
      data-theme="terminal"
      className={`${spaceMono.variable} ${notoSansTC.variable} ${vt323.variable} ${jetbrainsMono.variable} ${notoSansJP.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider />
        <LocaleProvider>
          <QueryProvider>
            <ClientAuthProvider
              userId={session?.user?.id}
              userName={session?.user?.name}
              userEmail={session?.user?.email}
              userImage={session?.user?.image}
            >
              <PageTransition>
                {children}
              </PageTransition>
            </ClientAuthProvider>
          </QueryProvider>
        </LocaleProvider>
        {/* 游標系統：獨立於頁面內容之外，不受任何 transform 影響 */}
        <MagneticCursor />
        {/* 地圖點擊箭頭效果：position:fixed 必須在所有 transform 祖先之外 */}
        <MapClickEffect />
      </body>
    </html>
  );
}
