#!/usr/bin/env bash
# 都道府県別エネルギー消費統計の「まとめてダウンロード」zip を data/raw に置き、47 県の xlsx を data/raw/xlsx に展開する。
# enecho.meti.go.jp は AWS WAF の JavaScript チャレンジを返すことがあり、そのとき curl は zip ではなく HTML を受け取る。
# その場合はブラウザで落として同じパスに置き、もう一度このスクリプトを実行する（展開だけ行う）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/data/raw"
FILE="20260116_all.zip"
URL="https://www.enecho.meti.go.jp/statistics/energy_consumption/ec002/xls/$FILE"
mkdir -p "$RAW"

if [[ ! -s "$RAW/$FILE" ]]; then
  echo "fetch $FILE"
  curl -sSL -A "Mozilla/5.0" -o "$RAW/$FILE.tmp" "$URL" || true
  # zip の先頭2バイトは PK。
  if [[ -s "$RAW/$FILE.tmp" && "$(head -c 2 "$RAW/$FILE.tmp")" == "PK" ]]; then
    mv "$RAW/$FILE.tmp" "$RAW/$FILE"
  else
    rm -f "$RAW/$FILE.tmp"
    cat >&2 <<EOF
取得できませんでした（WAF のチャレンジで zip が返っていません）。
ブラウザで次の URL を開いてダウンロードし、data/raw/$FILE に置いてから再実行してください。
  $URL
掲載ページ: https://www.enecho.meti.go.jp/statistics/energy_consumption/ec002/results.html
EOF
    exit 1
  fi
fi

rm -rf "$RAW/xlsx"
unzip -q "$RAW/$FILE" -d "$RAW/xlsx"
echo "done: $(ls "$RAW/xlsx" | wc -l | tr -d ' ') files"
