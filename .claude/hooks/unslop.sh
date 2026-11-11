#!/bin/bash
# メッセージを送るたびに動く。ホームページ・LP・アプリ・サイト・画面を作る／直す依頼なら、unslop スキルを使うよう Claude に伝える（2026-11-11 オーナー指示）
prompt=$(python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("prompt",""))
except Exception: pass' 2>/dev/null)
[ -n "$prompt" ] || exit 0
if echo "$prompt" | grep -qiE 'unslop' || { echo "$prompt" | grep -qiE 'ホームページ|ＨＰ|HP|LP|ランディング|サイト|アプリ|画面|ページ|UI|デザイン|見た目|ダッシュボード|バナー' && echo "$prompt" | grep -qiE '作|直|リニューアル|良く|よく|整え|改善|かっこ|ダサ|きれい|綺麗|AIっぽ|仕上げ'; }; then
  echo "ホームページ・LP・アプリ・サイト・画面を作る／直す依頼です。.claude/skills/unslop/SKILL.md（AIっぽい見た目をなくすスキル）を読み、点検（references/signs.md）と9つの仕上げ（余白→色→アイコン→文言→文字→配置→細部→絵→動き）を必ず通してから渡すこと。ただし CLAUDE.md と homepage-seisaku のオーナーの決まり（日本語・本物の写真だけ・黒背景にしない・角の丸み・書体・決めた動き）が unslop より優先。方向性の確認で止まらず、1回目から仕上げて出す。"
fi
exit 0
