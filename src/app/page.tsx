import { LandingExperience } from "@/components/landing/LandingExperience";

// Landing：首次訪問播 Globe Intro boot 序列 (~6s) → dissolve 到 Acid Landing 版面
// 回訪者透過 localStorage 跳過 boot，直接進 idle state
// CTA 「Start Scanning」點擊後 push 到 /map
export default function RootPage() {
  return <LandingExperience />;
}
