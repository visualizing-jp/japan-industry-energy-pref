/**
 * ビューをまたいで共有する選択。URL に載せるので、タブを替えても同じ基準・年度・県のまま見られる。
 */

import { TOTAL_AREA, type Basis, type EnergyData } from "../data/chunks.ts";
import { useUrlState } from "./useUrlState.ts";

export const BASES = [
  { value: "final", label: "最終消費" },
  { value: "allocated", label: "電力・熱配分後" },
] as const satisfies readonly { value: Basis; label: string }[];

export function useBasis() {
  return useUrlState<Basis>("basis", "final", (v) => BASES.some((b) => b.value === v));
}

export function useYear(data: EnergyData) {
  return useUrlState<string>("year", data.years.at(-1)!, (v) => data.years.includes(v));
}

export function usePref(data: EnergyData) {
  return useUrlState<string>("pref", TOTAL_AREA, (v) => data.areas.some((a) => a.code === v));
}

export function yearOptions(data: EnergyData) {
  return data.years.map((y) => ({
    value: y,
    label: `${y}年度${Number(y) === data.provisional ? "（暫定）" : ""}`,
  }));
}
