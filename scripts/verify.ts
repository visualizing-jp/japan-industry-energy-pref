/**
 * 配信 cube の健全性チェック。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CubeView, type BreakdownJson, type EnergyJson } from "../src/app/data/cube.ts";

const FILE = resolve(import.meta.dirname, "../public/data/energy.json");
const YEARS = [1990, 2005, ...Array.from({ length: 17 }, (_, i) => 2007 + i)];
const TOTAL = "00";

let failed = 0;

function ok(label: string, cond: boolean, detail = ""): void {
  console.log(`${cond ? "OK" : "NG"}  ${label}${detail ? `: ${detail}` : ""}`);
  if (!cond) failed += 1;
}

const raw = JSON.parse(await readFile(FILE, "utf8")) as EnergyJson;
const areas = raw.areas.map((a) => a.code);
const prefs = areas.filter((a) => a !== TOTAL);
const pop = new CubeView(raw.population);

ok("地域は 47都道府県計 + 47", areas.length === 48 && areas[0] === TOTAL);
ok("県名は正式名", raw.areas.slice(1).every((a) => /[都道府県]$/.test(a.label)) && raw.areas[13]?.label === "東京都");
ok("暫定値は 2023 年度", raw.provisional === 2023);
ok("人口: 欠測なし・正", raw.population.measures.value!.every((v) => v !== null && v > 0));

function sum(cube: CubeView, items: BreakdownJson["items"], coords: Record<string, string>): number {
  return items.reduce((s, i) => s + (cube.at("value", { ...coords, item: i.code }) ?? 0), 0);
}

const cubes = { sector: raw.sector, source: raw.source, industry: raw.industry } as const;
for (const [name, json] of Object.entries(cubes)) {
  const cube = new CubeView(json);
  const values = json.measures.value!;
  const years = cube.codes("year").map(Number);
  ok(`${name}: 年度は 1990, 2005, 2007–2023`, years.join() === YEARS.join(), `${years.length}年度`);
  ok(`${name}: 値の数 = 基準 × 地域 × 年度 × 項目`, values.length === 2 * 48 * years.length * json.items.length);
  ok(`${name}: 欠測なし`, values.every((v) => v !== null));
  // 配分後の燃料別は「最終 − 非エネルギー利用」なので、四捨五入の幅でわずかに負になりうる。
  ok(`${name}: 非負（丸め幅を除く）`, values.every((v) => v! >= -0.001));

  let worst = 0;
  for (const basis of ["final", "allocated"]) {
    for (const year of cube.codes("year")) {
      const total = sum(cube, json.items, { basis, area: TOTAL, year });
      const parts = prefs.reduce((s, area) => s + sum(cube, json.items, { basis, area, year }), 0);
      worst = Math.max(worst, Math.abs(total - parts));
    }
  }
  ok(`${name}: 47都道府県計 = 県の和`, worst < 0.05, `最大差 ${worst.toFixed(4)} PJ`);
}

const sector = new CubeView(raw.sector);
const industry = new CubeView(raw.industry);
let childGap = 0;
for (const parent of new Set(raw.industry.items.map((i) => i.parent!))) {
  const children = raw.industry.items.filter((i) => i.parent === parent);
  for (const basis of ["final", "allocated"]) {
    for (const area of areas) {
      for (const year of industry.codes("year")) {
        const total = sector.at("value", { basis, area, year, item: parent })!;
        childGap = Math.max(childGap, Math.abs(sum(industry, children, { basis, area, year }) - total));
      }
    }
  }
}
ok("中分類の親はすべて部門の項目", raw.industry.items.every((i) => raw.sector.items.some((s) => s.code === i.parent)));
ok("中分類の和 = 親の部門", childGap < 0.05, `最大差 ${childGap.toFixed(4)} PJ`);
const source = new CubeView(raw.source);
let gap = 0;
for (const basis of ["final", "allocated"]) {
  for (const area of areas) {
    for (const year of sector.codes("year")) {
      const coords = { basis, area, year };
      gap = Math.max(gap, Math.abs(sum(sector, raw.sector.items, coords) - sum(source, raw.source.items, coords)));
    }
  }
}
ok("部門の和 = エネルギー種の和", gap < 0.01, `最大差 ${gap.toFixed(4)} PJ`);

const loss = raw.source.items.find((i) => i.code === "loss")!;
ok(
  "最終消費では損失（配分）が 0",
  areas.every((area) => sector.codes("year").every((year) => source.at("value", { basis: "final", area, year, item: loss.code }) === 0)),
);

// 東京都 2023 年度の 1 人あたり（電力・熱配分後）は指標シートで 67 GJ/人。
const tokyo = sum(sector, raw.sector.items, { basis: "allocated", area: "13", year: "2023" });
const perCapita = (tokyo * 1e6) / pop.at("value", { area: "13", year: "2023" })!;
ok("東京都 2023 配分後 ≈ 67 GJ/人", Math.abs(perCapita - 66.66) < 0.05, perCapita.toFixed(2));

if (failed > 0) {
  console.error(`\n${failed} 件 NG`);
  process.exit(1);
}
console.log("\nすべて OK");
