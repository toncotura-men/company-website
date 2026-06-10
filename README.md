# company-website

自社コーポレートサイト（健康経営事業・スクール事業・硬式球再生事業）

## PUMPS スクールサイト

スクール事業「PUMPS」の静的サイトです。ビルド不要のプレーンな HTML / CSS / JS で構成しています。

```
.
├── index.html          # トップページ
├── assets/
│   ├── css/style.css   # スタイル
│   └── js/main.js      # ナビ開閉・年表示
└── .github/workflows/deploy.yml  # GitHub Pages 自動デプロイ
```

### デプロイ（GitHub Pages）

`.github/workflows/deploy.yml` により、対象ブランチへの push で GitHub Pages に自動デプロイされます。

初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を
**「GitHub Actions」** に設定してください。

### 素材の差し替え

ロゴ・本文・住所・連絡先などは現在プレースホルダです。`index.html` 内の該当箇所
（`＜...を後で設定＞`、`info@example.com`、`000-0000-0000` など）を実データに差し替えてください。
