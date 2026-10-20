# 引き継ぎメモ

- **【最優先】オーナーに見える文は、必ず全部日本語で書く**（2026-10-19 オーナー指示）。最終報告・途中報告・作業前の宣言・表の見出しまで例外なし。英語の一言報告は禁止
- 敬語。専門用語は避け、使うときは（）で説明する。結論から短く

## 公開先（2026-10-19 確認）

- 本番の住所は **https://haki-pro.com/pumps/** と **https://haki-pro.com/heros-cup/**（2026-10-20 オーナー指示）。
  中身は main に入ると GitHub Pages（toncotura-men.github.io/company-website/）に自動公開され、haki-pro.com（リポジトリ haki-pro-website の vercel.json）がそれを取り込んで表示する
- github.io の住所で開いた人は、各ページの head の小さなスクリプトで haki-pro.com の同じページへ移る（haki-pro.com 経由では動かない）。新しいページを作ったら同じスクリプトを入れる
- `CNAME` の pumps.haki-pro.com は使わない（DNS に記録がない）。オーナーには haki-pro.com の住所で案内する
- クラウドの作業環境からは本番サイトに直接つながらない。開けるかの確認は GitHub Actions 上で curl する
