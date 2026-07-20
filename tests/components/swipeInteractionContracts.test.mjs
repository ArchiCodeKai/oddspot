import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cardSource = readFileSync("src/components/swipe/SwipeCard.tsx", "utf8");
const actionBarSource = readFileSync("src/components/swipe/SwipeActionBar.tsx", "utf8");
const viewSource = readFileSync("src/components/swipe/SwipeView.tsx", "utf8");
const mapPageSource = readFileSync("src/app/map/page.tsx", "utf8");
const topRightClusterSource = readFileSync("src/components/map/TopRightCluster.tsx", "utf8");
const apiSource = readFileSync("src/app/api/spots/route.ts", "utf8");
const typesSource = readFileSync("src/types/spots.ts", "utf8");

test("swipe decision feedback uses theme-aware lottie assets without replacing button shells", () => {
  const decisionAnimationSource = readFileSync("src/components/swipe/SwipeDecisionAnimation.tsx", "utf8");
  const lottieTintSource = readFileSync("src/lib/lottie/tintLottie.ts", "utf8");
  const crossLottie = readFileSync("public/lottie/swipe/cross.json", "utf8");
  const checkLottie = readFileSync("public/lottie/swipe/check.json", "utf8");

  assert.match(crossLottie, /"nm":"blink"/);
  assert.match(checkLottie, /"nm":"success"/);
  assert.match(decisionAnimationSource, /lottie-react/);
  assert.match(decisionAnimationSource, /preloadSwipeDecisionAnimations/);
  assert.match(decisionAnimationSource, /SwipeDecisionAnimation/);
  assert.match(decisionAnimationSource, /variant: "edge" \| "stamp" \| "button"/);
  assert.match(decisionAnimationSource, /--accent-rgb/);
  assert.match(decisionAnimationSource, /--muted-rgb/);
  assert.match(decisionAnimationSource, /prefers-reduced-motion/);
  assert.match(decisionAnimationSource, /variant === "edge"/);
  assert.match(decisionAnimationSource, /setSpeed\(1\.8\)/);
  assert.match(lottieTintSource, /tintLottieColors/);
  assert.match(lottieTintSource, /key === "c"/);
  assert.match(lottieTintSource, /isStaticColorValue\(value\.k\)/);
  assert.doesNotMatch(lottieTintSource, /Array\.isArray\(value\.k\) && value\.k\.length >= 3/);
  assert.match(cardSource, /SwipeDecisionAnimation/);
  assert.match(cardSource, /preloadSwipeDecisionAnimations/);
  assert.match(cardSource, /SWIPE_FEEDBACK_DURATION_MS = 1100/);
  assert.match(cardSource, /SWIPE_ADVANCE_DELAY_MS = 620/);
  assert.match(cardSource, /isInteractiveSwipeTarget/);
  assert.match(cardSource, /handlePointerMove/);
  assert.match(cardSource, /pointerDraggingRef/);
  assert.match(cardSource, /setSwipeScrollLock/);
  assert.match(cardSource, /onPointerDownCapture=\{handlePointerDown\}/);
  assert.match(cardSource, /touchAction: "pan-y"/);
  assert.match(cardSource, /event\.preventDefault\(\)/);
  assert.match(cardSource, /window\.setTimeout\(advance, SWIPE_ADVANCE_DELAY_MS\)/);
  assert.doesNotMatch(cardSource, /drag="x"/);
  assert.doesNotMatch(cardSource, /onDragEnd/);
  assert.match(cardSource, /variant="edge"/);
  assert.match(cardSource, /variant="stamp"/);
  assert.match(decisionAnimationSource, /swipe-decision-animation__underlay/);
  assert.match(decisionAnimationSource, /tintedAnimationData && !reducedMotion/);
  assert.match(actionBarSource, /swipe-action-button/);
  assert.doesNotMatch(actionBarSource, /lottie-react/);
  assert.doesNotMatch(decisionAnimationSource, /setAnimationData\(null\)[\s\S]{0,120}fetch\(assetPath\[type\]\)/);
});

test("swipe action buttons use press feedback and text tooltips instead of decorative lift", () => {
  assert.match(actionBarSource, /swipe-action-tooltip/);
  assert.match(actionBarSource, /transform: translateY\(2px\)/);
  assert.doesNotMatch(actionBarSource, /translateY\(-4px\)/);
  assert.doesNotMatch(actionBarSource, /swipe-action-button::after/);
  assert.doesNotMatch(actionBarSource, /swipe-action-button::before/);
});

test("swipe card uses internal scroll details and google maps navigation instead of detail link", () => {
  assert.match(cardSource, /acid-card-scroll/);
  assert.match(cardSource, /google\.com\/maps\/dir/);
  assert.match(cardSource, /target="_blank"/);
  assert.match(cardSource, /visitCount/);
  assert.match(cardSource, /slice\(0, 3\)/);
  assert.match(cardSource, /swipe-card-feedback/);
  assert.match(cardSource, /swipe-card-trip-folder/);
  assert.doesNotMatch(cardSource, /ROUTES\.SPOT_DETAIL/);
  assert.doesNotMatch(cardSource, /viewDetail/);
});

test("mobile swipe card keeps action buttons at the bottom and uses edge decision hints", () => {
  assert.match(cardSource, /swipe-mobile-actions/);
  assert.match(cardSource, /md:hidden/);
  assert.match(cardSource, /swipe-edge-hint/);
  assert.match(cardSource, /leftEdgeOpacity/);
  assert.match(cardSource, /rightEdgeOpacity/);
  assert.doesNotMatch(cardSource, /@media \(max-width: 767px\)\s*{\s*\.swipe-edge-hint/);
  assert.match(cardSource, /onCollectToTrip/);
  assert.match(cardSource, /tripCount/);
  assert.match(cardSource, /showTripFlash/);
});

test("swipe view centers mobile cards and keeps trip controls visible on narrow screens", () => {
  assert.match(viewSource, /swipe-view-shell/);
  assert.match(viewSource, /swipe-toolbar/);
  assert.match(viewSource, /swipe-card-frame/);
  assert.match(viewSource, /width: min\(100%, calc\(100vw - 32px\)\)/);
  assert.match(viewSource, /@media \(max-width: 767px\)/);
  assert.match(viewSource, /margin-top: 12px/);
  assert.match(viewSource, /margin-bottom: 14px/);
  assert.doesNotMatch(viewSource, /pr-20/);
});

test("swipe toolbar uses a compact centered group across responsive breakpoints", () => {
  assert.match(viewSource, /grid-template-columns: auto auto/);
  assert.match(viewSource, /width: min\(100%, 30rem\)/);
  assert.match(viewSource, /margin-inline: auto/);
  assert.match(viewSource, /justify-content: center/);
  assert.match(viewSource, /transform: translateX\(-24px\)/);
  assert.match(viewSource, /swipe-toolbar-actions[\s\S]*transform: translateX\(-88px\)/);
  assert.match(viewSource, /width: 37px/);
  assert.match(viewSource, /height: 37px/);
});

test("tablet swipe layout enlarges the card and positions the toolbar between nav and card", () => {
  assert.match(viewSource, /@media \(min-width: 768px\) and \(max-width: 1279px\)/);
  assert.match(viewSource, /width: clamp\(34rem, 72vw, 48rem\)/);
  assert.match(viewSource, /max-width: calc\(100vw - 72px\)/);
  assert.match(viewSource, /height: min\(820px, 74vh\)/);
  assert.match(viewSource, /width: min\(calc\(100vw - 180px\), 36rem\)/);
  assert.match(viewSource, /margin-top: 58px/);
  assert.match(viewSource, /margin-bottom: 30px/);
  assert.match(viewSource, /swipe-undo-button/);
  assert.match(viewSource, /swipe-undo-tooltip/);
  assert.match(viewSource, /border-radius: 999px/);
  assert.match(viewSource, /width: 48px/);
  assert.doesNotMatch(viewSource, /setShowFilter/);
  assert.doesNotMatch(viewSource, /t\("filter"\)/);
  assert.match(mapPageSource, /map-top-controls/);
  assert.match(mapPageSource, /map-filter-trigger/);
  assert.match(mapPageSource, /@media \(min-width: 768px\) and \(max-width: 1279px\)/);
  assert.match(mapPageSource, /max-width: calc\(100vw - 148px\)/);
});

test("collecting to trip uses a folder target and card intake animation before advancing", () => {
  assert.match(cardSource, /swipe-card-intake/);
  assert.match(cardSource, /swipe-card-trip-folder/);
  assert.match(cardSource, /collectTargetX/);
  assert.match(cardSource, /collectTargetY/);
  assert.match(cardSource, /setFeedback\("trip"\)/);
  assert.match(cardSource, /animate\(scale, 0\.18/);
});

test("check action adds to saved and trip while plus action only saves", () => {
  assert.match(viewSource, /const handleSaveOnly = useCallback/);
  assert.match(viewSource, /const handleSaveAndAddToTrip = useCallback/);
  assert.match(viewSource, /onSwipeRight=\{handleSaveAndAddToTrip\}/);
  assert.match(viewSource, /onCollectToTrip=\{handleSaveOnly\}/);
  assert.match(viewSource, /onSave=\{\(\) => cardRef\.current\?\.collectToTrip\(\) \?\? handleSaveOnly\(\)\}/);
  assert.match(viewSource, /onSaveAndAddToTrip=\{\(\) => cardRef\.current\?\.flyOut\("right"\)\}/);
  assert.match(actionBarSource, /onSaveAndAddToTrip/);
  assert.match(actionBarSource, /aria-label=\{t\("addToTrip"\)\}/);
  assert.match(actionBarSource, /aria-label=\{t\("save"\)\}/);
});

test("top right settings popover uses an opaque high layer on mobile", () => {
  assert.match(topRightClusterSource, /top-right-cluster/);
  assert.match(topRightClusterSource, /top-right-popover/);
  // 高層級由 map page 的 .map-top-right 容器提供（cluster 定位交給父層）
  assert.match(mapPageSource, /map-top-right absolute top-4 right-4 z-50/);
  assert.match(topRightClusterSource, /--panel-solid/);
  assert.match(topRightClusterSource, /@media \(max-width: 767px\)/);
  assert.match(topRightClusterSource, /background: var\(--panel-solid\)/);
  assert.match(topRightClusterSource, /backdrop-filter: none/);
});

test("spots list API provides card detail fields needed by swipe browsing", () => {
  assert.match(typesSource, /images\?: string\[\]/);
  assert.match(typesSource, /address\?: string/);
  assert.match(typesSource, /visitCount\?: number/);
  assert.match(apiSource, /address: true/);
  assert.match(apiSource, /visitCount: true/);
  assert.match(apiSource, /images\.slice\(0, 3\)/);
});
