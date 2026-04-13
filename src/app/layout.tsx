import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { ClientAuthProvider } from "@/components/auth/ClientAuthProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "OddSpot",
  description: "發現台灣城市裡那些說不清楚的地方",
};

// FOUC 防止：在 React 水合前就套用儲存的主題
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem("oddspot-app");
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.state && parsed.state.theme === "light") {
        document.documentElement.classList.add("light");
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
    <html lang="zh-TW">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${spaceMono.variable} antialiased`}>
        <ThemeProvider />
        <ClientAuthProvider
          userId={session?.user?.id}
          userName={session?.user?.name}
          userEmail={session?.user?.email}
          userImage={session?.user?.image}
        >
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  );
}
