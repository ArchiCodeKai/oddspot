import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const authButtonSource = readFileSync("src/components/auth/AuthButton.tsx", "utf8");
const routeSheetSource = readFileSync("src/components/map/RouteSheet.tsx", "utf8");

test("auth dropdown routes users to saved spots and submission status pages", () => {
  assert.match(authButtonSource, /useRouter/);
  assert.match(authButtonSource, /router\.push\("\/saved"\)/);
  assert.match(authButtonSource, /router\.push\("\/submissions"\)/);
  assert.match(authButtonSource, /t\("submissions"\)/);
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
