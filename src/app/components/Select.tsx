/**
 * 年度や県の選択。項目が多いのでセグメントにせず、ネイティブの select に見た目だけ当てる。
 */

export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none rounded-md border border-rule bg-surface py-1 pr-7 pl-3 text-[12px] font-medium transition-colors duration-150 hover:border-rule-strong"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 6"
        width="9"
        height="6"
        aria-hidden
        className="pointer-events-none absolute right-2.5 fill-none stroke-muted"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 1l4 4 4-4" />
      </svg>
    </label>
  );
}
