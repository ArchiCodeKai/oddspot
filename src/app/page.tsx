import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingExperience } from "@/components/landing/LandingExperience";

// Landing：首次訪問播 Globe Intro boot 序列 (~6s) → dissolve 到 Acid Landing 版面
// 回訪者透過 localStorage 跳過 boot，直接進 idle state
// CTA 「Start Scanning」點擊後 push 到 /map
// 已登入的使用者不再看 landing，直接進地圖（landing 是給訪客的 pitch 頁）
export default async function RootPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/map");
  }
  return <LandingExperience />;
}
