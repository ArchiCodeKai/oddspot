import type { Metadata } from "next";
import { Space_Mono, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { ClientAuthProvider } from "@/components/auth/ClientAuthProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";

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

export const metadata: Metadata = {
  title: "OddSpot",
  description: "發現台灣城市裡那些說不清楚的地方",
};

// FOUC 防止：在 React 水合前同步套用主題與語言設定
const initScript = `
(function() {
  try {
    // 主題
    var appStore = localStorage.getItem("oddspot-app");
    if (appStore) {
      var app = JSON.parse(appStore);
      if (app && app.state && app.state.theme === "light") {
        document.documentElement.classList.add("light");
      }
    }
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
    <html lang="zh-TW" className={`${spaceMono.variable} ${notoSansTC.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider />
        <LocaleProvider>
          <ClientAuthProvider
            userId={session?.user?.id}
            userName={session?.user?.name}
            userEmail={session?.user?.email}
            userImage={session?.user?.image}
          >
            {children}
          </ClientAuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
