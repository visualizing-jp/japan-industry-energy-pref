/**
 * 配信データの取得と、ビューが使う読み出し。
 */

import { CubeView, type DictEntry, type EnergyJson } from "./cube.ts";

export type Basis = "final" | "allocated";
export type Group = "sector" | "source";

export const TOTAL_AREA = "00";

export interface Breakdown {
  items: DictEntry[];
  cube: CubeView;
}

export interface EnergyData {
  unit: string;
  provisional: number;
  bases: DictEntry[];
  areas: DictEntry[];
  years: string[];
  population: CubeView;
  sector: Breakdown;
  source: Breakdown;
  industry: Breakdown;
}

let cache: Promise<EnergyData> | undefined;

export function loadEnergy(): Promise<EnergyData> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/energy.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`energy.json の取得に失敗しました (${r.status})`);
      return r.json() as Promise<EnergyJson>;
    })
    .then((raw) => {
      const sector = new CubeView(raw.sector);
      return {
        unit: raw.unit,
        provisional: raw.provisional,
        bases: raw.bases,
        areas: raw.areas,
        years: sector.codes("year"),
        population: new CubeView(raw.population),
        sector: { items: raw.sector.items, cube: sector },
        source: { items: raw.source.items, cube: new CubeView(raw.source) },
        industry: { items: raw.industry.items, cube: new CubeView(raw.industry) },
      };
    });
  return cache;
}

/** 項目ごとの値（PJ）。並びは items と同じ。 */
export function valuesOf(b: Breakdown, basis: Basis, area: string, year: string): number[] {
  return b.items.map((i) => b.cube.at("value", { basis, area, year, item: i.code }) ?? 0);
}

export function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

/** PJ を人口で割って GJ/人 にする。 */
export function perCapita(data: EnergyData, pj: number, area: string, year: string): number {
  return (pj * 1e6) / data.population.at("value", { area, year })!;
}

/** 内訳の並び。配分後だけに現れる損失は、最終消費では出さない。 */
export function itemsFor(b: Breakdown, basis: Basis): number[] {
  return b.items.flatMap((i, k) => (basis === "final" && i.code === "loss" ? [] : [k]));
}
