import { Suspense, type ReactNode } from "react";
import { MapView } from "./views/MapView.tsx";
import { BarsView } from "./views/BarsView.tsx";
import { TrendView } from "./views/TrendView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";
import { SeriesBar, SeriesFooter } from "./components/Brand.tsx";

const VIEWS: readonly { id: string; label: string; hint: string; render: () => ReactNode }[] = [
  { id: "map", label: "地図", hint: "1人あたり", render: () => <MapView /> },
  {
    id: "sector",
    label: "部門",
    hint: "どこで使うか",
    render: () => (
      <BarsView
        spec={{
          group: "sector",
          title: "部門の構成",
          lead: "工場か、オフィスや店か、家庭か。県のエネルギー消費を、使った部門で分ける。",
          notes: [
            "業務他は第三次産業（商業・サービス・公務など）。家庭の乗用車は家計が使う自家用車の燃料で、営業用の自動車は含まない。",
          ],
        }}
      />
    ),
  },
  {
    id: "source",
    label: "エネルギー種",
    hint: "何で使うか",
    render: () => (
      <BarsView
        spec={{
          group: "source",
          title: "エネルギー種の構成",
          lead: "電気か、都市ガスか、石油か。県のエネルギー消費を、使った形で分ける。",
          notes: [
            "電力・熱配分後では、発電と熱供給で失われた分を「発電・熱供給の損失（配分）」として別に示す。",
            "電力は一般用・特定用・外部用、都市ガスは一般ガス・簡易ガス、熱は産業蒸気・熱供給の合計。",
          ],
        }}
      />
    ),
  },
  { id: "trend", label: "推移", hint: "県を選ぶ", render: () => <TrendView /> },
];

export function App() {
  const [view, setView] = useUrlState<string>("view", "map", (v) => VIEWS.some((x) => x.id === v));
  const current = VIEWS.find((v) => v.id === view)!;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <SeriesBar />
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">どの県が、何にエネルギーを使っているか</h1>
            <p className="text-[11px] text-muted">資源エネルギー庁「都道府県別エネルギー消費統計」</p>
          </div>
          <nav className="-mb-px flex gap-1" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] transition-colors duration-150 ${
                  view === v.id
                    ? "border-accent font-semibold text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint max-sm:hidden">{v.hint}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense key={view} fallback={<Loading />}>
        {current.render()}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        出典: 資源エネルギー庁「都道府県別エネルギー消費統計」（2023年度暫定値・2022年度公表、2026年1月16日訂正版）。
        単位は PJ（ペタジュール、10の15乗ジュール）と GJ/人。
        <SeriesFooter />
      </footer>
    </div>
  );
}

function Loading() {
  return <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">読み込み中</div>;
}
