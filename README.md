# どの県が、何にエネルギーを使っているか

資源エネルギー庁「都道府県別エネルギー消費統計」をもとに、47都道府県のエネルギー消費量・部門・エネルギー種を比べるダッシュボード。
シリーズ「日本の産業は、どう動いてきたか」（ハブは `../japan-industry/`）の1本。

## ビュー

| タブ | 内容 |
| --- | --- |
| 地図 | 1人あたり消費量のタイル地図。合計か部門を選ぶ。農林水産鉱建設業・製造業・業務他は、選ぶと中分類の業種が開く |
| 部門 | 47都道府県の部門構成（農林水産鉱建設業・製造業・業務他・家庭・家庭の乗用車） |
| エネルギー種 | 47都道府県のエネルギー種構成（石炭・石油・ガス・電力・熱など） |
| 推移 | 選んだ県の部門またはエネルギー種の推移（1990, 2005, 2007–2023年度） |

どのビューも、最終消費と電力・熱配分後（発電・熱供給の損失を使った側に割り当てた値）を切り替えられる。
地図で選んだ県・年度・基準は URL に載り、タブを替えても引き継がれる。

## 開発

```bash
npm install
npm run fetch && npm run data && npm run verify
npm run dev   # http://127.0.0.1:5312/
```

| スクリプト | 内容 |
| --- | --- |
| `npm run fetch` | 47 県まとめの zip を `data/raw/` に取得して展開（WAF に弾かれたら手順を表示して止まる） |
| `npm run data` | xlsx から配信用データ（`public/data/energy.json`）を作る。公式の合計・指標と照合する |
| `npm run verify` | 配信データの健全性チェック |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

`npm run data` は Python 3 と openpyxl を使う。初回に `.venv/` を作って `requirements.txt` を入れる。

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## 公開

`.github/workflows/pages.yml` で GitHub Pages にデプロイできる。本番ドメインは未定のため `public/CNAME` は置いていない。
ドメインが決まったら、`src/app/components/Brand.tsx` の `HUB_URL` とハブの `catalog.ts` の `url` を差し替える。
