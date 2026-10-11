export type Card = { slug: string; name: string; markdown: string }

declare module 'claude-code' {
  interface PluginState {
    'concept-cards': { cards: Card[]; index: number }
  }
}
