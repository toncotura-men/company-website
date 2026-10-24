export type Tier = 'haiku' | 'sonnet' | 'opus'

export type Route = { tier: Tier; why: string; isProtected: boolean }

export type Day = {
  date: string
  turns: Record<Tier, number>
  helpers: Record<Tier, number>
  actualUsd: number
  opusUsd: number
}

declare module 'claude-code' {
  interface PluginState {
    'model-router': { route: Route | null; today: Day | null; lastHelpers: string }
  }
}
