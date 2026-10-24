# model-router（作業の振り分け）

頼まれた文を見て、作業を Haiku・Sonnet・Opus に振り分ける mod（Claude Code の動き方を変える追加の仕組み）。
このフォルダにあるだけで、このリポジトリで開いた作業画面に毎回自動で入る（2026-10-24 確認）。
pumps-tracker-v2・company-website・kenkou-keiei-lp の3つに同じものを置いている。直すときは3つとも同じ中身にする。

## 決まり（2026-10-24 オーナー指示）

| 判定 | 回す先 | 例 |
|---|---|---|
| 簡単 | Haiku の助手 | 誤字直し、名前の変更、メモ整理、ファイル探し |
| ふつう | Sonnet の助手 | 調べもの、文章の下書き、画面の小さな修正 |
| 難しい | Opus が自分で | 計画、DB の変更、本番公開、原因の分からない不具合 |

- 安いモデルに任せない：保護者や選手に送る文面・個人情報・本番の DB や公開。文に「保護者」「LINE」「メール」「本番」「DB」「公開」などがあると Opus のまま。
  助手に Haiku・Sonnet を頼んでも Opus に書き換える（`PROTECTED`）
- 文に「Opusで」「Sonnetで」「Haikuで」とあれば、その通りにする（禁止語より優先）
- 判定は Haiku が行う（`$.model.classify`）。判定できなければ Opus（迷ったら上）。6文字未満の返事（「OK」など）は判定しない
- 会話の相手（本体）は Opus のまま。本体が受け取り、作業を助手（サブエージェント）に回す。mod では本体のモデルは切り替えられない

## 見え方

- 入力欄の上：振り分け中のモデル、前回どの助手が何回作業したか、今日の件数と節約額
- 節約額は「助手の作業を Opus がやっていたら」との差。料金は 2026-10 の公開料金（100万トークンあたり Opus $4/$20、Sonnet $2/$10、Haiku $0.1/$0.5）、
  1ドル150円で計算。キャッシュ書き込みは入力の1.25倍、Haiku のキャッシュ読み込みは入力の1割で見積もり。本体（Opus）の分は含まない
- 毎日の記録は mod の保存場所（`$.store` の `day:YYYY-MM-DD`、日本時間）。作業画面を作り直すと消える

## 直すとき

- 判定の言葉：`hooks/register.tsx` の `LABEL`、任せない語：`PROTECTED`、料金：`PRICE`
- 確認：`claude plugin validate .claude/skills/model-router` と `claude plugin test .claude/skills/model-router`（6件）
