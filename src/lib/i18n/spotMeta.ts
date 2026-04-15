import { CATEGORY_VALUES, type SpotCategory } from "@/lib/constants/categories";
import { STATUS_VALUES, type SpotStatus } from "@/lib/constants/status";

type Translator = (key: string) => string;

export function getCategoryLabel(t: Translator, value: SpotCategory | string) {
  if (CATEGORY_VALUES.includes(value as SpotCategory)) {
    return t(`categories.${value}`);
  }
  return value;
}

export function getStatusLabel(t: Translator, value: SpotStatus | string) {
  if (STATUS_VALUES.includes(value as SpotStatus)) {
    return t(`status.${value}`);
  }
  return value;
}

export function getDifficultyLabel(
  t: Translator,
  value: "easy" | "medium" | "hard" | string
) {
  if (value === "easy" || value === "medium" || value === "hard") {
    return t(`difficulty.${value}`);
  }
  return value;
}

export function getCategoryOptions(t: Translator) {
  return CATEGORY_VALUES.map((value) => ({
    value,
    label: getCategoryLabel(t, value),
  }));
}

export function getStatusOptions(t: Translator, includePending = false) {
  const values = includePending ? STATUS_VALUES : STATUS_VALUES.filter((v) => v !== "pending");
  return values.map((value) => ({
    value,
    label: getStatusLabel(t, value),
  }));
}
