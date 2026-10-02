/**
 * 構成の色。paper 上で区別できる、彩度を抑えた色。
 * エネルギー種はシリーズの総合エネルギー統計と同じコードに同じ色を当てる。
 */

const COLORS: Record<string, string> = {
  coal: "#3f4247",
  oil: "#8a6a4f",
  gas: "#6f8796",
  citygas: "#a3b5c2",
  renewable: "#5f8a5a",
  electricity: "#c47a3a",
  heat: "#d9ab84",
  loss: "#ddd3c4",

  agriculture: "#a59a6a",
  manufacturing: "#5c6b7a",
  commercial: "#97a8b8",
  household: "#c47a3a",
  car: "#3d7a6a",
};

export function colorOf(code: string): string {
  return COLORS[code] ?? "#a8a299";
}
