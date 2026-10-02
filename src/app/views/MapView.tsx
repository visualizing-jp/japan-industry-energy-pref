/**
 * 地図ビュー。選んだ部門（または中分類）の 1 人あたり消費量を、47 都道府県のタイルで比べる。
 * 中分類は、親の部門かその子を選んでいるときだけ親の下に開く。
 */

import { use, useState } from "react";
import { loadEnergy, perCapita, sum, TOTAL_AREA, valuesOf } from "../data/chunks.ts";
import { colorOf } from "../data/colors.ts";
import { gj, TileMap, type Tile } from "../components/TileMap.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { Select } from "../components/Select.tsx";
import { Notes } from "../components/Notes.tsx";
import { BASES, useBasis, usePref, useYear, yearOptions } from "../hooks/controls.ts";
import { useUrlState } from "../hooks/useUrlState.ts";

const TOTAL = "total";

const two = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function MapView() {
  const data = use(loadEnergy());
  const { sector, industry, areas } = data;
  const [basis, setBasis] = useBasis();
  const [year, setYear] = useYear(data);
  const [pref, setPref] = usePref(data);
  const [pick, setPick] = useUrlState<string>(
    "sector",
    TOTAL,
    (v) => v === TOTAL || sector.items.some((i) => i.code === v) || industry.items.some((i) => i.code === v),
  );
  const [hovered, setHovered] = useState<string | null>(null);

  /** 選んだ項目の PJ。合計・部門・中分類のどれでも引ける。 */
  const pjOf = (area: string, code: string) => {
    if (code === TOTAL) return sum(valuesOf(sector, basis, area, year));
    const b = sector.items.some((i) => i.code === code) ? sector : industry;
    return b.cube.at("value", { basis, area, year, item: code }) ?? 0;
  };
  const valueOf = (area: string) => perCapita(data, pjOf(area, pick), area, year);

  const openParent = industry.items.find((i) => i.code === pick)?.parent ?? pick;
  const of = (code: string, label: string, depth: number) => ({
    code,
    label,
    depth,
    color: colorOf(depth === 0 ? code : industry.items.find((i) => i.code === code)!.parent!),
    value: perCapita(data, pjOf(TOTAL_AREA, code), TOTAL_AREA, year),
  });
  const options = [
    { ...of(TOTAL, "合計", 0), color: "var(--color-ink)" },
    ...sector.items.flatMap((s) => [
      of(s.code, s.label, 0),
      ...(s.code === openParent ? industry.items.filter((i) => i.parent === s.code).map((i) => of(i.code, i.label, 1)) : []),
    ]),
  ];

  const national = options.find((o) => o.code === pick)!;
  const tiles: Tile[] = areas
    .filter((a) => a.code !== TOTAL_AREA)
    .map((a) => {
      const value = valueOf(a.code);
      return { code: a.code, label: a.label, value, ratio: value / national.value };
    });
  const ranked = [...tiles].sort((a, b) => b.value - a.value);
  const rankOf = new Map(ranked.map((t, i) => [t.code, i + 1]));

  const focusCode = hovered ?? (pref === TOTAL_AREA ? null : pref);
  const focus = tiles.find((t) => t.code === focusCode);
  const basisLabel = BASES.find((b) => b.value === basis)!.label;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full">
        <h2 className="flex items-baseline justify-between px-1 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          <span>部門</span>
          <span className="font-normal">47都道府県計 GJ/人</span>
        </h2>
        <ul>
          {options.map((o) => {
            const selected = o.code === pick;
            return (
              <li key={o.code}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPick(o.code)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[4px] py-1.5 pr-1 text-left transition-[background-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.99] ${
                    o.depth === 0 ? "pl-1 text-[12.5px]" : "pl-5 text-[12px] text-muted"
                  } ${selected ? "bg-ink/[0.06] font-semibold text-ink" : "hover:bg-ink/[0.04]"}`}
                >
                  <span
                    aria-hidden
                    className={`shrink-0 rounded-[2px] ${o.depth === 0 ? "h-2.5 w-2.5" : "h-1.5 w-1.5 opacity-70"}`}
                    style={{ background: o.color }}
                  />
                  <span className="min-w-0 grow truncate">{o.label}</span>
                  <span className="tnum text-right">{gj(o.value)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Notes
          extra={[
            "1人あたりは、統計表の指標シートと同じく各年度の都道府県人口で割った値。",
            "工場の多い県は製造業の消費が大きく、人口で割ると値が跳ね上がる。とくに最終消費では、石油化学の原料（ナフサなど）が上乗せされる。",
          ]}
        />
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <h2 className="text-[19px] font-semibold tracking-tight">
              1人あたりの{national.label === "合計" ? "エネルギー消費" : national.label}
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              {basisLabel}、{year}年度。47都道府県計は {gj(national.value)} GJ/人。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select options={yearOptions(data)} value={year} onChange={setYear} label="年度" />
            <Segmented options={BASES} value={basis} onChange={setBasis} label="基準" />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          {focus !== undefined ? (
            <>
              <span className="font-semibold">{focus.label}</span>
              <span className="text-muted">
                {` ${gj(focus.value)} GJ/人 · 47都道府県計の${two.format(focus.ratio)}倍 · 47県中${rankOf.get(focus.code)}位`}
              </span>
            </>
          ) : (
            <span className="text-muted">
              最も多い <span className="font-semibold text-ink">{ranked[0]!.label} {gj(ranked[0]!.value)}</span>
              {"  ／  最も少ない "}
              <span className="font-semibold text-ink">
                {ranked.at(-1)!.label} {gj(ranked.at(-1)!.value)}
              </span>
            </span>
          )}
        </p>

        <TileMap
          tiles={tiles}
          hovered={hovered}
          onHover={setHovered}
          pinned={pref === TOTAL_AREA ? null : pref}
          onPin={(code) => setPref(code ?? TOTAL_AREA)}
        />
        <p className="mt-3 text-[11px] text-faint">地図は模式図。県を押すと固定し、部門・エネルギー種・推移のタブでもその県を選んだ状態になる。</p>
      </main>
    </div>
  );
}
