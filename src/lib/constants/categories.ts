export type SpotCategory =
  | "weird-temple"
  | "abandoned"
  | "giant-object"
  | "kitsch"
  | "marginal-architecture"
  | "urban-legend"
  | "absurd-landscape"
  | "odd-shopfront";

export const CATEGORY_OPTIONS: { value: SpotCategory; label: string }[] = [
  { value: "weird-temple", label: "詭異廟宇" },
  { value: "abandoned", label: "廢棄場所" },
  { value: "giant-object", label: "巨型物體" },
  { value: "kitsch", label: "俗豔裝置" },
  { value: "marginal-architecture", label: "邊緣建築" },
  { value: "urban-legend", label: "都市傳說" },
  { value: "absurd-landscape", label: "荒謬景觀" },
  { value: "odd-shopfront", label: "奇異店面" },
];
