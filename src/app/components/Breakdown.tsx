/**
 * 1 つの県・年度の内訳。構成比と量（PJ）を並べ、合計と 1 人あたりで締める。
 * 行に触れるとその項目をグラフで強調し、押すと固定する。
 */

import type { DictEntry } from "../data/cube.ts";
import { colorOf } from "../data/colors.ts";

const pct = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const tenth = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function amount(v: number): string {
  return Math.abs(v) < 100 ? tenth.format(v) : whole.format(v);
}

export function Breakdown({
  items,
  values,
  perCapita,
  unit,
  emphasized,
  pinned,
  onPeek,
  onToggle,
}: {
  items: DictEntry[];
  values: number[];
  /** 合計の GJ/人。 */
  perCapita: number;
  unit: string;
  emphasized: string | null;
  pinned: string | null;
  onPeek: (code: string | null) => void;
  onToggle: (code: string) => void;
}) {
  const total = values.reduce((s, v) => s + v, 0);
  return (
    <div>
      <ul onPointerLeave={() => onPeek(null)}>
        {items.map((item, i) => {
          const active = emphasized === item.code;
          return (
            <li key={item.code}>
              <button
                type="button"
                aria-pressed={pinned === item.code}
                onPointerEnter={() => onPeek(item.code)}
                onFocus={() => onPeek(item.code)}
                onBlur={() => onPeek(null)}
                onClick={() => onToggle(item.code)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[4px] px-1 py-1.5 text-left text-[12.5px] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.99] ${
                  active ? "bg-ink/[0.06]" : "hover:bg-ink/[0.04]"
                }`}
              >
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: colorOf(item.code) }} />
                <span className={`min-w-0 grow truncate text-ink ${active ? "font-semibold" : ""}`}>{item.label}</span>
                <span className={`tnum w-[3.6em] text-right text-ink ${active ? "font-semibold" : ""}`}>
                  {pct.format((values[i]! / total) * 100)}%
                </span>
                <span className="tnum w-[4.4em] text-right text-[11px] text-muted">{amount(values[i]!)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between border-t border-rule-strong pt-2 text-[12px]">
        <span className="font-semibold">合計</span>
        <span className="tnum font-semibold">
          {amount(total)}
          <span className="ml-1 text-[10.5px] font-normal text-faint">{unit}</span>
        </span>
      </div>
      <div className="flex items-baseline justify-between pt-1 text-[12px] text-muted">
        <span>1人あたり</span>
        <span className="tnum">
          {whole.format(perCapita)}
          <span className="ml-1 text-[10.5px] text-faint">GJ/人</span>
        </span>
      </div>
    </div>
  );
}
