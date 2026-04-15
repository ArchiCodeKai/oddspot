import { redirect } from "next/navigation";

// Option A：首頁直接進 App（地圖），吉祥物眼睛在 OnboardingOverlay 展示
export default function RootPage() {
  redirect("/map");
}
