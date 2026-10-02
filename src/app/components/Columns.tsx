/**
 * 年度ごとの積み上げ棒。推計のない年度があるので面ではなく棒にし、年度を詰めない。
 * 1 年だけ抜けた年度は空き枠として残し、長く抜けた区間は切れ目の印 1 つに縮める。
 */

import { useRef, type Dispatch, type KeyboardEvent, type PointerEvent, type SetStateAction } from "react";
import { scaleBand, scaleLinear } from "d3-scale";

export type Mode = "amount" | "share";

export interface ColumnSeries {
  key: string;
  color: string;
  /** years と同じ順序・同じ長さ。 */
  values: number[];
}

type Slot = { kind: "year"; year: string } | { kind: "missing"; year: string } | { kind: "break"; from: number; to: number };

function slotsOf(years: string[]): Slot[] {
  const out: Slot[] = [];
  years.forEach((y, i) => {
    const prev = i === 0 ? null : Number(years[i - 1]);
    const gap = prev === null ? 0 : Number(y) - prev - 1;
    if (gap === 1) out.push({ kind: "missing", year: String(prev! + 1) });
    else if (gap > 1) out.push({ kind: "break", from: prev! + 1, to: Number(y) - 1 });
    out.push({ kind: "year", year: y });
  });
  return out;
}

function keyOf(s: Slot): string {
  return s.kind === "break" ? `break-${s.from}` : s.year;
}

const grouping = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const M = { left: 48, right: 8, top: 18, bottom: 26 };

export function Columns({
  years,
  series,
  mode,
  emphasized,
  provisional,
  width,
  height,
  hoverYear,
  onHoverYear,
  label,
}: {
  years: string[];
  series: ColumnSeries[];
  mode: Mode;
  emphasized: string | null;
  provisional: number;
  width: number;
  height: number;
  hoverYear: string | null;
  onHoverYear: Dispatch<SetStateAction<string | null>>;
  label: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const slots = slotsOf(years);
  const x = scaleBand<string>()
    .domain(slots.map(keyOf))
    .range([M.left, width - M.right])
    .paddingInner(0.22)
    .paddingOuter(0.1);
  const totals = years.map((_, i) => series.reduce((s, x) => s + x.values[i]!, 0));
  const y = scaleLinear()
    .domain([0, mode === "share" ? 1 : Math.max(...totals)])
    .range([height - M.bottom, M.top]);
  if (mode === "amount") y.nice(4);
  const yTicks = mode === "amount" ? y.ticks(4) : [0, 0.25, 0.5, 0.75, 1];
  const last = years.at(-1)!;

  function yearAt(clientX: number): string | null {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect === undefined) return null;
    const px = clientX - rect.left;
    let best: string | null = null;
    let dist = Infinity;
    for (const yr of years) {
      const d = Math.abs(x(yr)! + x.bandwidth() / 2 - px);
      if (d < dist) [best, dist] = [yr, d];
    }
    return best;
  }

  function onMove(e: PointerEvent<SVGSVGElement>) {
    onHoverYear(yearAt(e.clientX));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (step !== 0) {
      e.preventDefault();
      onHoverYear((cur) => {
        const i = years.indexOf(cur ?? last);
        return years[Math.min(years.length - 1, Math.max(0, i + step))]!;
      });
    } else if (e.key === "Escape") {
      onHoverYear(null);
    }
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      tabIndex={0}
      className="block touch-none select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      onPointerMove={onMove}
      onPointerLeave={() => onHoverYear(null)}
      onKeyDown={onKey}
      onBlur={() => onHoverYear(null)}
    >
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} className="stroke-rule" strokeWidth={v === 0 ? 0 : 0.5} />
          <text x={M.left - 8} y={y(v) + 3.5} textAnchor="end" className="tnum fill-faint text-[10px]">
            {mode === "share" ? `${v * 100}%` : grouping.format(v)}
          </text>
        </g>
      ))}

      {years.map((yr, i) => {
        const x0 = x(yr)!;
        const w = x.bandwidth();
        const dim = hoverYear !== null && hoverYear !== yr;
        let base = 0;
        return (
          <g key={yr} className="transition-opacity duration-150" opacity={dim ? 0.55 : 1}>
            {series.map((s) => {
              const v = mode === "share" ? s.values[i]! / totals[i]! : s.values[i]!;
              const y0 = base;
              base += v;
              return (
                <rect
                  key={s.key}
                  x={x0}
                  width={w}
                  y={y(base)}
                  height={Math.max(0, y(y0) - y(base))}
                  fill={s.color}
                  opacity={emphasized === null || emphasized === s.key ? 1 : 0.28}
                  className="transition-opacity duration-150 ease-[var(--ease-out)]"
                />
              );
            })}
            {Number(yr) === provisional && (
              <text x={x0 + w / 2} y={y(base) - 5} textAnchor="middle" className="fill-muted text-[9.5px]">
                暫定
              </text>
            )}
          </g>
        );
      })}

      {slots.map((s) => {
        if (s.kind === "year") return null;
        const cx = x(keyOf(s))! + x.bandwidth() / 2;
        const base = height - M.bottom;
        return s.kind === "missing" ? (
          <text
            key={keyOf(s)}
            transform={`translate(${cx + 3}, ${base - 6}) rotate(-90)`}
            className="fill-faint text-[9.5px]"
          >
            推計なし
          </text>
        ) : (
          <path
            key={keyOf(s)}
            d={`M${cx - 5} ${base + 4} l4 -8 M${cx + 1} ${base + 4} l4 -8`}
            className="stroke-muted"
            strokeWidth={1}
            fill="none"
          />
        );
      })}

      <g transform={`translate(0, ${height - M.bottom})`}>
        <line x1={M.left} x2={width - M.right} className="stroke-rule-strong" strokeWidth={1} />
        {years
          .filter((yr, i) => i === 0 || i === years.length - 1 || Number(yr) % 5 === 0)
          .map((yr) => (
            <text key={yr} x={x(yr)! + x.bandwidth() / 2} y={16} textAnchor="middle" className="tnum fill-muted text-[10px]">
              {yr}
            </text>
          ))}
        {hoverYear !== null && (
          <g className="pointer-events-none">
            <rect x={x(hoverYear)! + x.bandwidth() / 2 - 20} y={3} width={40} height={17} rx={3} className="fill-ink" />
            <text x={x(hoverYear)! + x.bandwidth() / 2} y={16} textAnchor="middle" className="tnum fill-paper text-[10px] font-medium">
              {hoverYear}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
