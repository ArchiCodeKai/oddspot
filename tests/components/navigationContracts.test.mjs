import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const authButtonSource = readFileSync("src/components/auth/AuthButton.tsx", "utf8");
const topRightClusterSource = readFileSync("src/components/map/TopRightCluster.tsx", "utf8");
const routeSheetSource = readFileSync("src/components/map/RouteSheet.tsx", "utf8");

test("top-right cluster shows login for guests and avatar menu after login", () => {
  // 訪客：登入按鈕 + globe（語言/主題）；登入後：頭像取代 globe
  assert.match(topRightClusterSource, /\{!user && <GuestLoginButton \/>\}/);
  assert.match(topRightClusterSource, /<UserAvatar size=\{36\} \/>/);
  assert.match(topRightClusterSource, /WireframeGlobe/);
  // 頭像選單順序：身分列 → 帳號捷徑 → 語言 → 主題 → 登出
  assert.match(
    topRightClusterSource,
    /<UserMenuIdentity \/>[\s\S]*<AccountShortcutLinks \/>[\s\S]*<LangToggle \/>[\s\S]*<ThemeToggle \/>[\s\S]*<LogoutMenuItem \/>/,
  );

  assert.match(authButtonSource, /export function GuestLoginButton/);
  assert.match(authButtonSource, /export function UserMenuIdentity/);
  assert.match(authButtonSource, /export function LogoutMenuItem/);
  assert.match(authButtonSource, /export function AccountShortcutLinks/);
  assert.match(authButtonSource, /signOut/);
  assert.match(authButtonSource, /router\.push\("\/saved"\)/);
  assert.match(authButtonSource, /router\.push\("\/submissions"\)/);
  // 已收藏/今日行程捷徑只在手機顯示（桌機頂列已有入口）；投稿狀態桌機手機都在
  assert.match(authButtonSource, /className="md:hidden"/);
});

test("map top bar exposes saved and trip quick entries on md+ screens", () => {
  const mapPageSource = readFileSync("src/app/map/page.tsx", "utf8");
  assert.match(mapPageSource, /map-quick-entries hidden md:flex/);
  assert.match(mapPageSource, /quickSaved/);
  assert.match(mapPageSource, /quickTrip/);
  // 訪客點已收藏 → 登入提示，不做無聲 redirect
  assert.match(mapPageSource, /user \? router\.push\("\/saved"\) : openLoginPrompt\(\)/);
  // 一頁式：地圖頁 root 夾掉 overflow，隱藏視圖的 y 位移不再撐出捲動
  assert.match(mapPageSource, /overflow-hidden/);
});

test("saved page closes the saved flow with remove and add-to-trip actions", () => {
  const pagePath = "src/app/saved/page.tsx";
  const listPath = "src/components/saved/SavedList.tsx";
  assert.equal(existsSync(pagePath), true);
  assert.equal(existsSync(listPath), true);

  const pageSource = readFileSync(pagePath, "utf8");
  const listSource = readFileSync(listPath, "utf8");
  assert.match(pageSource, /prisma\.savedSpot\.findMany/);
  assert.match(pageSource, /SavedList/);
  assert.match(listSource, /useRoutePlannerStore/);
  assert.match(listSource, /addSpot/);
  // 移除走 useSavedStore 樂觀更新（背景同步後端），不做 blocking fetch + refresh
  assert.match(listSource, /useSavedStore/);
  assert.match(listSource, /removeSave/);
  assert.doesNotMatch(listSource, /router\.refresh/);
  // 移除時的像素溶解動畫 + 顯眼的回地圖入口
  assert.match(listSource, /saved-card-dissolve/);
  assert.match(listSource, /saved-back-button/);
});

test("submissions page shows a user's own review statuses", () => {
  const pagePath = "src/app/submissions/page.tsx";
  assert.equal(existsSync(pagePath), true);

  const pageSource = readFileSync(pagePath, "utf8");
  assert.match(pageSource, /submittedById/);
  assert.match(pageSource, /status/);
  assert.match(pageSource, /pending/);
  assert.match(pageSource, /rejected/);
});

test("route sheet keeps the five-point limit and saved picker empty states visible", () => {
  assert.match(routeSheetSource, /MAX_WAYPOINTS = 5/);
  assert.match(routeSheetSource, /disabled=\{atLimit\}/);
  assert.match(routeSheetSource, /limitReached/);
  assert.match(routeSheetSource, /noSavedInArea/);
});

test("route sheet keeps footer actions reachable at every viewport size", () => {
  // 高度由內容決定 + 上下限；不可回到用選點數估算的魔術公式
  // （footer 會因為規劃後才出現的「開始導航」按鈕長高，估算一定少算）
  assert.match(routeSheetSource, /height: "auto"/);
  assert.match(routeSheetSource, /ROUTE_SHEET_MAX_HEIGHT = "86dvh"/);
  assert.doesNotMatch(routeSheetSource, /getRouteSheetHeight/);

  // 中段是唯一可捲區：flex-auto（basis:auto）而非 flex-1（basis:0，auto 高度下會塌陷）
  assert.match(routeSheetSource, /className="px-4 py-3 flex-auto min-h-0"/);
  assert.match(routeSheetSource, /overflowY: "auto"/);
  assert.match(routeSheetSource, /overscrollBehavior: "contain"/);

  // footer 固定不縮，且保留 iOS home indicator 安全區
  assert.match(routeSheetSource, /className="px-4 pt-3 flex-shrink-0"/);
  assert.match(routeSheetSource, /env\(safe-area-inset-bottom\)/);
});
