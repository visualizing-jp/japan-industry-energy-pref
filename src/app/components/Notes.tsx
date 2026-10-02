/**
 * どのビューでも読ませたい前提。ビュー固有の注記はその前に並べる。
 */

const COMMON = [
  "対象は企業・事業所、家庭、家庭の乗用車。発電・石油精製などの転換と、貨物・鉄道・バス・タクシーなどの運輸は含まない。",
  "最終消費はナフサなど原料としての使用（非エネルギー利用）を含む。電力・熱配分後はそれを含まず、発電や熱供給で失われた分を電気・熱を使った側に割り当てる。",
  "47都道府県計は県の和。総合エネルギー統計の全国値とは一致しない。",
  "1991〜2004年度と2006年度は推計されていない。2023年度は暫定値。2022年度の公表時に1990年度まで遡って改訂されている。",
];

export function Notes({ extra = [] }: { extra?: readonly string[] }) {
  return (
    <section className="mt-6 border-t border-rule pt-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-faint">注記</h3>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {[...extra, ...COMMON].map((n) => (
          <li key={n} className="text-[11px] leading-relaxed text-muted">
            {n}
          </li>
        ))}
      </ul>
    </section>
  );
}
