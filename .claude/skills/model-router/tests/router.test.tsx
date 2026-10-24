import { expect, mock, test } from 'claude-code/testing'

const EASY = '簡単（誤字直し・名前の変更・メモ整理・ファイル探し・決まった手順の小さな作業）'
const NORMAL = 'ふつう（調べもの・文章の下書き・画面の小さな修正）'
const HARD = '難しい（計画・設計・DBの変更・本番公開・原因の分からない不具合・いくつものファイルにまたがる修正）'

const BAND = {
  plugin: 'model-router',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, columns: 80 },
} as const

const USAGE = { input_tokens: 100_000, output_tokens: 10_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// 下に敷く「エンジンの代わり」：判定は文に応じて、助手は頼まれたモデルで起動
function engine(on: any, label: string) {
  const spawned: (string | undefined)[] = []
  mock.clock(on)
  mock.store(on)
  on('ui.status', () => ({ value: undefined }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('model.classify', () => ({ value: label }))
  on('prompt.submit', (_: unknown, e: any) => ({ text: e.text, context: e.context }))
  on('agent.spawn', (_: unknown, e: any) => {
    spawned.push(e.model)
    return { model: e.model ?? e.parentModel, agentId: `a${spawned.length}` }
  })
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer, usage: e.usage }))
  return spawned
}

const SPAWN = { tool_use_id: 't1', description: 'work', subagentType: 'general-purpose', provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', isBackground: false }

for (const [name, text, label, tier] of [
  ['簡単', 'メモの誤字を直して', EASY, 'haiku'],
  ['ふつう', 'ストレッチの記事を調べて下書きして', NORMAL, 'sonnet'],
  ['難しい', 'ログインが切れる原因を調べて直す計画を立てて', HARD, 'opus'],
] as const) {
  test(`${name}の依頼は ${tier} に回る`, async ($, on) => {
    const spawned = engine(on, label)
    await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true } as any)

    const r: any = await $.prompt.submit({ text, wait: false, origin: { kind: 'user' } } as any)
    expect(r.context?.[0]).toContain(tier === 'opus' ? '自分で作業' : `model: "${tier}"`)

    if (tier !== 'opus') {
      // 助手の model を書き忘れても、判定どおりのモデルになる
      await $.agent.spawn({ ...SPAWN, prompt: text } as any)
      expect(spawned[0]).toBe(tier)
      await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 'h', agentId: 'a1', reason: 'answer', usage: { ...USAGE, model: `claude-${tier}-5-5` } } as any)
    }

    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 'm', reason: 'answer' } as any)

    const ui = await $.ui.mount({ ...BAND, surface: 'mobile' } as any)
    const line = await ui.find({ type: 'Text', text: /今日/ })
    expect(line?.text).toContain(`${tier === 'haiku' ? 'Haiku' : tier === 'sonnet' ? 'Sonnet' : 'Opus'} 1件`)
    // Haiku：Opus なら $0.60、Haiku なら $0.015 → 約88円節約。Sonnet：$0.60 と $0.30 → 45円
    if (tier === 'haiku') expect(line?.text).toContain('節約 約88円')
    if (tier === 'sonnet') expect(line?.text).toContain('節約 約45円')
    if (tier === 'opus') expect(line?.text).toContain('節約 約0円')
    await ui.unmount()
  })
}

test('保護者に送る文面は Opus のまま。助手に Haiku を頼んでも Opus にする', async ($, on) => {
  const spawned = engine(on, EASY)
  await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true } as any)

  const r: any = await $.prompt.submit({ text: '保護者に送るLINEの文面を整えて', wait: false, origin: { kind: 'user' } } as any)
  expect(r.context?.[0]).toContain('安いモデルに任せない作業')

  await $.agent.spawn({ ...SPAWN, prompt: 'x', model: 'haiku' } as any)
  expect(spawned[0]).toBe('opus')
})

test('「Haikuで」と書けば、その通りにする', async ($, on) => {
  engine(on, HARD)
  await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true } as any)

  const r: any = await $.prompt.submit({ text: 'Haikuでこの設計を見直して', wait: false, origin: { kind: 'user' } } as any)
  expect(r.context?.[0]).toContain('model: "haiku"')
})

test('判定に失敗したら上のモデル（Opus）にする', async ($, on) => {
  engine(on, '関係ない答え')
  await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true } as any)

  const r: any = await $.prompt.submit({ text: 'これをいい感じにしておいて', wait: false, origin: { kind: 'user' } } as any)
  expect(r.context?.[0]).toContain('自分で作業')
})
