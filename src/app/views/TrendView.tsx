/**
 * 推移ビュー。選んだ県（または 47 都道府県計）の内訳を年度ごとの積み上げ棒で見る。
 */

import { use, useMemo, useState } from "react";
import { itemsFor, loadEnergy, perCapita, sum, valuesOf, type Group } from "../data/chunks.ts";
import { colorOf } from "../data/colors.ts";
import { Breakdown } from "../components/Breakdown.tsx";
import { Columns, type ColumnSeries, type Mode } from "../components/Columns.tsx";
import { Notes } from "../components/Notes.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { Select } from "../components/Select.tsx";
import { BASES, useBasis, usePref } from "../hooks/controls.ts";
import { useUrlState } from "../hooks/useUrlState.ts";
import { useWidth } from "../hooks/useWidth.ts";

const GROUPS = [
  { value: "sector", label: "部門" },
  { value: "source", label: "エネルギー種" },
] as const satisfies readonly { value: Group; label: string }[];

const MODES = [
  { value: "amount", label: "量" },
  { value: "share", label: "構成比" },
] as const satisfies readonly { value: Mode; label: string }[];

export function TrendView() {
  const data = use(loadEnergy());
  const [basis, setBasis] = useBasis();
  const [pref, setPref] = usePref(data);
  const [group, setGroup] = useUrlState<Group>("group", "sector", (v) => GROUPS.some((g) => g.value === v));
  const [mode, setMode] = useUrlState<Mode>("mode", "amount", (v) => MODES.some((m) => m.value === v));
  const [hoverYear, setHoverYear] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const breakdown = data[group];
  const { items, series } = useMemo(() => {
    const shown = itemsFor(breakdown, basis);
    const byYear = data.years.map((y) => valuesOf(breakdown, basis, pref, y));
    return {
      items: shown.map((k) => breakdown.items[k]!),
      series: shown.map(
        (k): ColumnSeries => ({
          key: breakdown.items[k]!.code,
          color: colorOf(breakdown.items[k]!.code),
          values: byYear.map((v) => v[k]!),
        }),
      ),
    };
  }, [data, breakdown, basis, pref]);

  const year = hoverYear ?? data.years.at(-1)!;
  const yi = data.years.indexOf(year);
  const values = series.map((s) => s.values[yi]!);
  const area = data.areas.find((a) => a.code === pref)!;
  const emphasized = peek ?? pinned;
  const basisLabel = BASES.find((b) => b.value === basis)!.label;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-10 px-6 py-6 max-lg:flex-col">
      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <h2 className="text-[19px] font-semibold tracking-tight">{area.label}の推移</h2>
            <p className="mt-1 text-[12px] text-muted">
              {basisLabel}の{GROUPS.find((g) => g.value === group)!.label}別。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              options={data.areas.map((a) => ({ value: a.code, label: a.label }))}
              value={pref}
              onChange={setPref}
              label="地域"
            />
            <Segmented options={GROUPS} value={group} onChange={setGroup} label="内訳" />
            <Segmented options={BASES} value={basis} onChange={setBasis} label="基準" />
            <Segmented options={MODES} value={mode} onChange={setMode} label="表示" />
          </div>
        </header>

        <div ref={ref} className="min-h-[300px]">
          {width > 0 && (
            <Columns
              years={data.years}
              series={series}
              mode={mode}
              emphasized={emphasized}
              provisional={data.provisional}
              width={width}
              height={width < 640 ? 300 : 400}
              hoverYear={hoverYear}
              onHoverYear={setHoverYear}
              label={`${area.label}の${basisLabel}の推移、${data.years[0]}–${data.years.at(-1)}年度`}
            />
          )}
        </div>
        <p className="pt-1 text-[10.5px] text-faint">
          {mode === "share" ? "各年度の合計を 100% とした構成比" : `単位: ${data.unit}`}
          。斜線の位置（1991〜2004年度）と 2006年度は推計されていない。グラフ上で ← → キーでも年度を動かせる。
        </p>
      </main>

      <aside className="w-[300px] shrink-0 max-lg:w-full">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <p className={`tnum text-[15px] font-semibold ${hoverYear === null ? "text-ink" : "text-accent"}`}>
            {year}年度{Number(year) === data.provisional ? "（暫定）" : ""}
          </p>
          <p className="text-[10.5px] text-faint">構成比 / {data.unit}</p>
        </div>
        <Breakdown
          items={items}
          values={values}
          perCapita={perCapita(data, sum(values), pref, year)}
          unit={data.unit}
          emphasized={emphasized}
          pinned={pinned}
          onPeek={setPeek}
          onToggle={(code) => setPinned((p) => (p === code ? null : code))}
        />
        <Notes
          extra={["2015年度前後は、元になるエネルギー消費統計調査と総合エネルギー統計が推計方法を見直しており、値が段差状に変わることがある。"]}
        />
      </aside>
    </div>
  );
}
