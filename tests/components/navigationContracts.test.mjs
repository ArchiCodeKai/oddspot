import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const authButtonSource = readFileSync("src/components/auth/AuthButton.tsx", "utf8");
const topRightClusterSource = readFileSync("src/components/map/TopRightCluster.tsx", "utf8");
const routeSheetSource = readFileSync("src/components/map/RouteSheet.tsx", "utf8");

test("top-right settings promotes account shortcuts to the first popover level", () => {
  assert.match(topRightClusterSource, /AccountShortcutLinks/);
  assert.match(topRightClusterSource, /<AccountShortcutLinks \/>[\s\S]*<LangToggle \/>[\s\S]*<ThemeToggle \/>[\s\S]*<AuthButton \/>/);

  assert.match(authButtonSource, /useRouter/);
  assert.match(authButtonSource, /router\.push\("\/saved"\)/);
  assert.match(authButtonSource, /router\.push\("\/submissions"\)/);
  assert.match(authButtonSource, /t\("submissions"\)/);
  assert.match(authButtonSource, /export function AccountShortcutLinks/);
  assert.match(authButtonSource, /function AccountShortcutItem/);
  assert.match(authButtonSource, /export function AuthButton/);
  assert.match(authButtonSource, /signOut/);
  assert.doesNotMatch(authButtonSource, /router\.push\("\/saved"\)[\s\S]{0,120}setOpen\(false\)/);
  assert.doesNotMatch(authButtonSource, /router\.push\("\/submissions"\)[\s\S]{0,120}setOpen\(false\)/);
});

test("saved page closes the saved flow with remove and add-to-trip actions", () => {
  const pagePath = "src/app/saved/page.tsx";
  const actionsPath = "src/components/saved/SavedSpotActions.tsx";
  assert.equal(existsSync(pagePath), true);
  assert.equal(existsSync(actionsPath), true);

  const pageSource = readFileSync(pagePath, "utf8");
  const actionsSource = readFileSync(actionsPath, "utf8");
  assert.match(pageSource, /prisma\.savedSpot\.findMany/);
  assert.match(pageSource, /SavedSpotActions/);
  assert.match(actionsSource, /useRoutePlannerStore/);
  assert.match(actionsSource, /addSpot/);
  assert.match(actionsSource, /fetch\(`\/api\/saved\/\$\{spot\.id\}`/);
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
