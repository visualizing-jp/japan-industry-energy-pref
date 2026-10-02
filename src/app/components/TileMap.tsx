/**
 * 都道府県のタイル地図。1 人あたり消費量を升目に書き、47都道府県計に対する比で塗る。
 * 配置は japan-data シリーズの TileMap と同じ。
 */

const LAYOUT = [
  "........................01",
  "........................02",
  "......................0503",
  "......................0604",
  "....................1507..",
  "..............171620100908",
  "..............1821..111312",
  "....3231..2625..23221914..",
  "..35343328272924..........",
  "404438373630..............",
  "4143..39..................",
  "424645....................",
  "..........................",
  "47........................",
];

const COLS = 13;

/**
 * 比の区切り。1 倍を中心に対数で対称（0.8 = 1/1.25）。どの項目でも同じ区切りで塗り、同じ色が同じ比を指すようにする。
 */
const BREAKS = [0.25, 0.5, 0.8, 1.25, 2, 4];
const BREAK_LABELS = ["1/4", "1/2", "0.8", "1.25", "2", "4"];

/** ColorBrewer RdBu 7 段階（d3-scale-chromatic 3.1.0）を、少ない側から並べたもの。 */
const CLASS_COLORS = ["#2166ac", "#67a9cf", "#d1e5f0", "#f7f7f7", "#fddbc7", "#ef8a62", "#b2182b"];
/** 両端の濃い色の上では文字を白にする。 */
const DARK_CLASSES = new Set([0, CLASS_COLORS.length - 1]);

function classOf(ratio: number): number {
  return BREAKS.filter((b) => ratio >= b).length;
}

export interface Tile {
  code: string;
  label: string;
  /** GJ/人。 */
  value: number;
  /** 47都道府県計の 1 人あたりに対する比。 */
  ratio: number;
}

/** タイルは狭いので「都・府・県」を落とす。北海道はそのまま。 */
function short(label: string): string {
  return label.replace(/[都府県]$/, "");
}

const whole = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const tenth = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** GJ/人。中分類では 1 桁の値が多いので、10 未満は小数 1 桁まで出す。 */
export function gj(v: number): string {
  return v < 10 ? tenth.format(v) : whole.format(v);
}

export function TileMap({
  tiles,
  hovered,
  onHover,
  pinned,
  onPin,
}: {
  tiles: Tile[];
  hovered: string | null;
  onHover: (code: string | null) => void;
  pinned: string | null;
  onPin: (code: string | null) => void;
}) {
  const byCode = new Map(tiles.map((t) => [t.code, t]));

  return (
    <div className="mx-[-0.5rem] overflow-x-auto px-2">
      <div
        className="grid aspect-[13/14] max-w-[700px] min-w-[560px] gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${LAYOUT.length}, minmax(0, 1fr))`,
        }}
        onMouseLeave={() => onHover(null)}
      >
        <div className="flex flex-col justify-start pt-1" style={{ gridColumn: "1 / 8", gridRow: "1 / 6" }}>
          <Legend />
        </div>
        {LAYOUT.flatMap((row, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const code = row.slice(c * 2, c * 2 + 2);
            const tile = code === ".." ? undefined : byCode.get(code);
            if (tile === undefined) return null;
            const isPinned = tile.code === pinned;
            const k = classOf(tile.ratio);
            const dark = DARK_CLASSES.has(k);
            return (
              <button
                type="button"
                key={tile.code}
                aria-pressed={isPinned}
                aria-label={`${tile.label} ${gj(tile.value)} GJ/人`}
                onClick={() => onPin(isPinned ? null : tile.code)}
                onMouseEnter={() => onHover(tile.code)}
                onFocus={() => onHover(tile.code)}
                onBlur={() => onHover(null)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-[3px] border transition-[box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97] ${
                  isPinned
                    ? "border-ink shadow-[0_0_0_1.5px_var(--color-ink)]"
                    : tile.code === hovered
                      ? "border-ink"
                      : "border-rule"
                }`}
                style={{ gridColumn: c + 1, gridRow: r + 1, backgroundColor: CLASS_COLORS[k] }}
              >
                <span className={`text-[9.5px] leading-tight ${dark ? "text-white/85" : "text-ink/70"}`}>{short(tile.label)}</span>
                <span className={`tnum text-[11px] leading-tight font-medium ${dark ? "text-white" : ""}`}>{gj(tile.value)}</span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="text-[10.5px] leading-relaxed text-muted">
      <p className="pb-1.5">1人あたり（GJ/人）。色は47都道府県計に対する倍率</p>
      <div className="flex">
        {CLASS_COLORS.map((c) => (
          <span key={c} className="h-[9px] flex-1 border-y border-r border-rule first:border-l" style={{ background: c }} />
        ))}
      </div>
      <div className="relative h-4">
        {BREAK_LABELS.map((label, k) => (
          <span
            key={label}
            className="tnum absolute top-0.5 -translate-x-1/2"
            style={{ left: `${((k + 1) / CLASS_COLORS.length) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
      <p className="flex justify-between text-faint">
        <span>← 少ない</span>
        <span>多い →</span>
      </p>
    </div>
  );
}

if (import.meta.env.DEV) {
  const codes = LAYOUT.flatMap((row) => row.match(/../g) ?? []).filter((s) => s !== "..");
  if (new Set(codes).size !== 47) {
    throw new Error(`タイル配置の県が ${new Set(codes).size} 個しかない`);
  }
  if (LAYOUT.some((row) => row.length !== COLS * 2)) {
    throw new Error(`タイル配置の行の長さが ${COLS * 2} 文字でない`);
  }
}
