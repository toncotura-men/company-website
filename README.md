# company-website

株式会社PUMPS コーポレートサイト
（健康経営事業・野球スクール事業・硬式球再生事業）

> コンセプト：**打つ・投げる・走る、その先へ** — 野球の循環をデザインする。

## 概要

ビルド不要の静的サイト（HTML / CSS / Vanilla JS）。ダーク基調・モノスペースのテック系デザイン。

### 主な技術要素

| 要素 | 実装 |
| --- | --- |
| Three.js 硬式球 | `assets/js/baseball.js` — 手続き的な縫い目テクスチャ。カーソル/タッチのドラッグで360度回転 |
| Three.js 地球儀 | `assets/js/earth.js` — ワイヤーフレーム＋ドット大陸のテック系グローブ |
| GSAP ScrollTrigger | `assets/js/main.js` — セクションのreveal、再生プロセスをピン留めしスクロールでボール回転＋全工程表示 |
| requestAnimationFrame | `assets/js/main.js` — ヒーローに浮遊する野球シルエット |
| ブループリント風グリッド | `assets/css/style.css` の `.blueprint`（CSS背景グリッド） |
| CSS grid auto-fit | パートナーロゴを画面幅に応じ均等配置（`.partner-grid`） |
| Monospace font | JetBrains Mono / Space Mono |

### 画像（自作SVG）

- `assets/img/silhouette-bat.svg` … 打つ（黒シルエット）
- `assets/img/silhouette-throw.svg` … 投げる（黒シルエット）
- `assets/img/silhouette-run.svg` … 走る（黒シルエット）
- `assets/img/logo.svg` … HAKI pro ロゴ（背景透過で再現作成）

外部ライブラリ（Three.js / GSAP）は CDN から読み込みます。

```
.
├── index.html
├── assets/
│   ├── css/style.css
│   ├── js/{baseball,earth,main}.js
│   └── img/{silhouette-bat,throw,run, logo}.svg
└── .github/workflows/deploy.yml
```

## デプロイ（GitHub Pages）

`.github/workflows/deploy.yml` により、対象ブランチへの push で自動デプロイされます。

> **初回のみ手動設定が必要**：リポジトリの
> **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」** に設定してください。
> 設定後、ワークフローを再実行すると公開されます。

## 素材の差し替え

`index.html` 内のプレースホルダ（`＜...を後で設定＞`、`info@example.com`、`000-0000-0000`、パートナーロゴ等）を実データに差し替えてください。
