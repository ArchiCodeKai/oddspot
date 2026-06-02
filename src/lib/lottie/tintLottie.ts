type LottieColor = [number, number, number, number];

export function rgbStringToLottieColor(rgbValue: string, alpha = 1): LottieColor {
  const channels = rgbValue
    .trim()
    .split(/[\s,]+/)
    .map((channel) => Number(channel))
    .filter((channel) => Number.isFinite(channel));

  const [red = 214, green = 214, blue = 220] = channels;
  return [red / 255, green / 255, blue / 255, alpha];
}

export function tintLottieColors<T>(animationData: T, color: LottieColor): T {
  return tintNode(animationData, color) as T;
}

function tintNode(value: unknown, color: LottieColor, key?: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => tintNode(item, color));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (key === "c" && isTintableColor(value)) {
    return {
      ...value,
      k: color,
    };
  }

  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = tintNode(child, color, key);
  }

  return next;
}

function isTintableColor(value: object): value is { k: unknown } {
  return "k" in value && isStaticColorValue(value.k);
}

function isStaticColorValue(value: unknown): value is LottieColor {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.length <= 4 &&
    value.every((channel) => typeof channel === "number" && channel >= 0 && channel <= 1)
  );
}
