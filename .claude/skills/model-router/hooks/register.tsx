import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Day, Route, Tier } from '../types'

const route = atom({ plugin: 'model-router', key: 'route' } as const, null)
const today = atom({ plugin: 'model-router', key: 'today' } as const, null)
const lastHelpers = atom({ plugin: 'model-router', key: 'lastHelpers' } as const, '')

const NAME: Record<Tier, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' }

// 100万トークンあたりのドル（2026-10 時点の公開料金）。
// キャッシュ書き込みは入力の1.25倍、Haiku のキャッシュ読み込みは入力の1割で見積もり。
const PRICE: Record<Tier, { input: number; output: number; read: number; write: number }> = {
  opus: { input: 4, output: 20, read: 0.2, write: 5 },
  sonnet: { input: 2, output: 10, read: 0.2, write: 2.5 },
  haiku: { input: 0.1, output: 0.5, read: 0.01, write: 0.125 },
}
const YEN_PER_USD = 150

const LABEL = {
  easy: '簡単（誤字直し・名前の変更・メモ整理・ファイル探し・決まった手順の小さな作業）',
  normal: 'ふつう（調べもの・文章の下書き・画面の小さな修正）',
  hard: '難しい（計画・設計・DBの変更・本番公開・原因の分からない不具合・いくつものファイルにまたがる修正）',
} as const

// 安いモデルに任せない作業：保護者や選手に送る文面・個人情報・本番の DB と公開
const PROTECTED =
  /保護者|選手に送|送る文|文面|LINE|ライン|メール|個人情報|氏名|住所|電話|本番|DB|データベース|Supabase|マイグレーション|migration|enrollments|profiles|公開|デプロイ|マージ|Vercel/i

const OVERRIDE: [RegExp, Tier][] = [
  [/(opus|オーパス)\s*で/i, 'opus'],
  [/(sonnet|ソネット)\s*で/i, 'sonnet'],
  [/(haiku|ハイク)\s*で/i, 'haiku'],
]

const tierOf = (model: string | undefined): Tier | undefined =>
  model === undefined
    ? undefined
    : /haiku/i.test(model)
      ? 'haiku'
      : /sonnet/i.test(model)
        ? 'sonnet'
        : /opus|fable|mythos/i.test(model)
          ? 'opus'
          : undefined

const usd = (tier: Tier, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }) => {
  const p = PRICE[tier]

  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      u.cache_read_input_tokens * p.read +
      u.cache_creation_input_tokens * p.write) /
    1_000_000
  )
}

const dateOf = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 10)

const emptyDay = (date: string): Day => ({
  date,
  turns: { haiku: 0, sonnet: 0, opus: 0 },
  helpers: { haiku: 0, sonnet: 0, opus: 0 },
  actualUsd: 0,
  opusUsd: 0,
})

const CONTEXT: Record<Tier, (why: string) => string> = {
  haiku: why =>
    `[model-router] この依頼は${why}と判定した。実際の作業（読む・探す・直す）は Agent ツールに model: "haiku" を付けて Haiku の助手に任せ、あなたは依頼の受け渡しと結果の確認・報告だけを行うこと。助手の結果に誤りがあれば自分で直してよい。`,
  sonnet: why =>
    `[model-router] この依頼は${why}と判定した。実際の作業（調べる・下書き・修正）は Agent ツールに model: "sonnet" を付けて Sonnet の助手に任せ、あなたは依頼の受け渡しと結果の確認・報告だけを行うこと。助手の結果に誤りがあれば自分で直してよい。`,
  opus: why => `[model-router] この依頼は${why}と判定した。助手に回さず、あなた（Opus）が自分で作業すること。`,
}

async function day($: EngineInterface): Promise<Day> {
  const date = dateOf(await $.clock.now())
  const stored = (await $.store.get(`day:${date}`)) as Day | undefined

  return stored ?? emptyDay(date)
}

async function save($: EngineInterface, d: Day) {
  await $.store.set(`day:${d.date}`, d)
  await update($, today, () => d)
}

export const register: Register = on => {
  const helperTier = new Map<string, Tier>()
  let helpersThisTurn: Tier[] = []

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await update($, today, () => null)
    await save($, await day($))

    return result
  })

  on('prompt.submit', async ($, e, next) => {
    const text = e.text.trim()

    if (e.command !== undefined || e.isMeta === true || text.length < 6) {
      return next(e)
    }

    const forced = OVERRIDE.find(([re]) => re.test(text))
    const isProtected = PROTECTED.test(text)
    let decided: Route

    if (forced !== undefined) {
      decided = { tier: forced[1], why: `「${NAME[forced[1]]}で」の指定どおり${NAME[forced[1]]}`, isProtected: false }
    } else if (isProtected) {
      decided = { tier: 'opus', why: '「安いモデルに任せない作業」（送る文面・個人情報・本番）', isProtected: true }
    } else {
      // 迷ったら上のモデル：判定できなければ Opus
      const label = await $.model.classify(text, [LABEL.easy, LABEL.normal, LABEL.hard], { model: 'haiku' }).catch(() => undefined)
      const tier: Tier = label === LABEL.easy ? 'haiku' : label === LABEL.normal ? 'sonnet' : 'opus'
      const why = label === LABEL.easy ? '「簡単」' : label === LABEL.normal ? '「ふつう」' : label === LABEL.hard ? '「難しい」' : '判定できなかったので「難しい」'
      decided = { tier, why, isProtected: false }
    }

    helpersThisTurn = []
    await update($, route, () => decided)
    $.ui.status(`振り分け：${NAME[decided.tier]}（${decided.why.replace(/[「」]/g, '')}）`)

    return next({ ...e, context: [...(e.context ?? []), CONTEXT[decided.tier](decided.why)] })
  })

  // 助手のモデルをそろえる。任せない作業と「Opusで」のときは安いモデルを使わせない
  on('agent.spawn', async ($, e, next) => {
    if (e.subagentType === 'fork' || e.parentAgentId !== undefined) {
      return next(e)
    }

    const r = await read($, route)
    let model = e.model

    if (r !== null && (r.isProtected || r.tier === 'opus') && tierOf(model) !== undefined && tierOf(model) !== 'opus') {
      model = 'opus'
    } else if (r !== null && r.tier !== 'opus' && model === undefined) {
      model = r.tier
    }

    const result = await next({ ...e, model })
    const tier = tierOf(result.model)

    if (result.agentId !== undefined && tier !== undefined) {
      helperTier.set(result.agentId, tier)
      helpersThisTurn.push(tier)
    }

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const usage = result.usage ?? e.usage

    if (e.agentId !== undefined) {
      const tier = helperTier.get(e.agentId) ?? tierOf(usage?.model)

      if (tier !== undefined && usage !== undefined) {
        const d = await day($)
        d.helpers[tier] += 1
        d.actualUsd += usd(tier, usage)
        d.opusUsd += usd('opus', usage)
        await save($, d)
      }

      return result
    }

    const r = await read($, route)

    if (r !== null) {
      const d = await day($)
      d.turns[r.tier] += 1
      await save($, d)

      const helpers = helpersThisTurn.length === 0
        ? '助手なし（Opus が自分で作業）'
        : (['haiku', 'sonnet', 'opus'] as Tier[])
            .filter(t => helpersThisTurn.includes(t))
            .map(t => `${NAME[t]} の助手 ${helpersThisTurn.filter(x => x === t).length}回`)
            .join('・')
      await update($, lastHelpers, () => helpers)
      $.ui.status(`今回：${helpers}`)
      await update($, route, () => null)
    }

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const d = await read($, today)

    if (e.props.hasSurvey || d === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const r = await read($, route)
    const last = await read($, lastHelpers)
    const saved = Math.max(0, d.opusUsd - d.actualUsd)
    const helperCount = d.helpers.haiku + d.helpers.sonnet + d.helpers.opus

    return (
      <Box flexDirection="column">
        <Text dimColor>
          {r !== null ? `振り分け中：${NAME[r.tier]}` : last !== '' ? `前回：${last}` : '振り分け：待機中'}
        </Text>
        <Text dimColor>
          {`今日：Haiku ${d.turns.haiku}件・Sonnet ${d.turns.sonnet}件・Opus ${d.turns.opus}件／助手 ${helperCount}回／節約 約${Math.round(saved * YEN_PER_USD)}円（$${saved.toFixed(2)}）`}
        </Text>
      </Box>
    )
  })
}
