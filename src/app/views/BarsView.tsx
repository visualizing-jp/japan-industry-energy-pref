/**
 * 構成ビュー。47 都道府県の内訳（部門またはエネルギー種）を横の積み上げ棒で並べる。
 * 凡例の項目を押すと、その項目の大きい順に並べ替えて強調する。県の行を押すとその県を固定する。
 */

import { use, useMemo, useState } from "react";
import { itemsFor, loadEnergy, perCapita, sum, TOTAL_AREA, valuesOf, type Group } from "../data/chunks.ts";
import { colorOf } from "../data/colors.ts";
import { Breakdown } from "../components/Breakdown.tsx";
import { Notes } from "../components/Notes.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { Select } from "../components/Select.tsx";
import { BASES, useBasis, usePref, useYear, yearOptions } from "../hooks/controls.ts";
import { useUrlState } from "../hooks/useUrlState.ts";

type Mode = "share" | "perCapita";

const MODES = [
  { value: "share", label: "構成比" },
  { value: "perCapita", label: "1人あたり" },
] as const satisfies readonly { value: Mode; label: string }[];

const NO_SORT = "";

const pct = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });

export interface BarsSpec {
  group: Group;
  title: string;
  lead: string;
  notes: readonly string[];
}

export function BarsView({ spec }: { spec: BarsSpec }) {
  const data = use(loadEnergy());
  const breakdown = data[spec.group];
  const [basis, setBasis] = useBasis();
  const [year, setYear] = useYear(data);
  const [pref, setPref] = usePref(data);
  const [mode, setMode] = useUrlState<Mode>("mode", "share", (v) => MODES.some((m) => m.value === v));
  const [sort, setSort] = useUrlState<string>("sort", NO_SORT, (v) => breakdown.items.some((i) => i.code === v));
  const [peek, setPeek] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const { items, rows } = useMemo(() => {
    const shown = itemsFor(breakdown, basis);
    return {
      items: shown.map((k) => breakdown.items[k]!),
      rows: data.areas.map((a) => {
        const all = valuesOf(breakdown, basis, a.code, year);
        const values = shown.map((k) => all[k]!);
        const total = sum(values);
        const toPerCapita = (pj: number) => perCapita(data, pj, a.code, year);
        return { code: a.code, label: a.label, values, total, perCapita: values.map(toPerCapita), totalPerCapita: toPerCapita(total) };
      }),
    };
  }, [data, breakdown, basis, year]);
  const sortKey = items.some((i) => i.code === sort) ? sort : NO_SORT;
  const emphasized = peek ?? (sortKey === NO_SORT ? null : sortKey);

  const sortIndex = items.findIndex((i) => i.code === sortKey);
  const metric = (r: (typeof rows)[number]) =>
    sortIndex < 0 ? 0 : mode === "share" ? r.values[sortIndex]! / r.total : r.perCapita[sortIndex]!;
  const [national, ...prefs] = rows;
  const ordered = sortIndex < 0 ? prefs : [...prefs].sort((a, b) => metric(b) - metric(a));
  const max = Math.max(...rows.map((r) => r.totalPerCapita));
  // 並べ替えた項目は棒の左端に寄せ、県どうしで長さを比べられるようにする。
  const barOrder = sortIndex < 0 ? items.map((_, k) => k) : [sortIndex, ...items.flatMap((_, k) => (k === sortIndex ? [] : [k]))];

  const focus = rows.find((r) => r.code === (hovered ?? pref)) ?? national!;
  const label = (r: (typeof rows)[number]) => {
    if (sortIndex < 0) return mode === "share" ? "" : whole.format(r.totalPerCapita);
    return mode === "share" ? `${pct.format(metric(r) * 100)}%` : whole.format(metric(r));
  };

  const row = (r: (typeof rows)[number]) => {
    const pinned = r.code === pref;
    return (
      <li key={r.code}>
        <button
          type="button"
          aria-pressed={pinned}
          onClick={() => setPref(pinned ? TOTAL_AREA : r.code)}
          onPointerEnter={() => setHovered(r.code)}
          onFocus={() => setHovered(r.code)}
          onBlur={() => setHovered(null)}
          className={`grid w-full cursor-pointer grid-cols-[7.4em_minmax(0,1fr)_3.6em] items-center gap-2 rounded-[3px] px-1 py-[2px] text-left text-[11.5px] transition-[background-color] duration-150 ${
            pinned ? "bg-ink/[0.08]" : r.code === hovered ? "bg-ink/[0.04]" : ""
          }`}
        >
          <span className={`truncate ${pinned ? "font-semibold" : ""}`}>{r.label}</span>
          <span className="flex h-[12px] overflow-hidden rounded-[2px]">
            <span
              className="flex h-full"
              style={{ width: mode === "share" ? "100%" : `${(r.totalPerCapita / max) * 100}%` }}
            >
              {barOrder.map((k) => (
                <span
                  key={items[k]!.code}
                  className="h-full transition-opacity duration-150 ease-[var(--ease-out)]"
                  style={{
                    width: `${(r.values[k]! / r.total) * 100}%`,
                    background: colorOf(items[k]!.code),
                    opacity: emphasized === null || emphasized === items[k]!.code ? 1 : 0.28,
                  }}
                />
              ))}
            </span>
          </span>
          <span className="tnum text-right text-muted">{label(r)}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-10 px-6 py-6 max-lg:flex-col">
      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <h2 className="text-[19px] font-semibold tracking-tight">{spec.title}</h2>
            <p className="mt-1 max-w-[60ch] text-[12px] leading-relaxed text-muted">{spec.lead}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select options={yearOptions(data)} value={year} onChange={setYear} label="年度" />
            <Segmented options={BASES} value={basis} onChange={setBasis} label="基準" />
            <Segmented options={MODES} value={mode} onChange={setMode} label="表示" />
          </div>
        </header>

        <div className="flex flex-wrap gap-1 pb-2" onPointerLeave={() => setPeek(null)}>
          {items.map((item) => {
            const active = item.code === sortKey;
            return (
              <button
                key={item.code}
                type="button"
                aria-pressed={active}
                onPointerEnter={() => setPeek(item.code)}
                onFocus={() => setPeek(item.code)}
                onBlur={() => setPeek(null)}
                onClick={() => setSort(active ? NO_SORT : item.code)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97] ${
                  active ? "border-ink bg-ink/[0.06] font-semibold" : "border-rule hover:border-rule-strong"
                }`}
              >
                <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: colorOf(item.code) }} />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="pb-2 text-[10.5px] text-faint">
          {sortIndex < 0
            ? "並びは地域順。項目を押すと、その項目の大きい順に並べ替える。"
            : `並びは${items[sortIndex]!.label}の${mode === "share" ? "構成比" : "1人あたり"}の大きい順。もう一度押すと地域順に戻る。`}
          {mode === "perCapita" && " 棒の長さは合計の1人あたり（GJ/人）。"}
        </p>

        <ul onPointerLeave={() => setHovered(null)}>
          {row(national!)}
          <li aria-hidden className="my-1 border-t border-rule" />
          {ordered.map(row)}
        </ul>
      </main>

      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <p className={`text-[15px] font-semibold ${hovered !== null && hovered !== pref ? "text-accent" : "text-ink"}`}>
            {focus.label}
          </p>
          <p className="tnum text-[10.5px] text-faint">
            {year}年度 · 構成比 / {data.unit}
          </p>
        </div>
        <Breakdown
          items={items}
          values={focus.values}
          perCapita={focus.totalPerCapita}
          unit={data.unit}
          emphasized={emphasized}
          pinned={sortKey === NO_SORT ? null : sortKey}
          onPeek={setPeek}
          onToggle={(code) => setSort((s) => (s === code ? NO_SORT : code))}
        />
        <Notes extra={spec.notes} />
      </aside>
    </div>
  );
}
