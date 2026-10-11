import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Card } from '../types'

const PLUGIN = 'concept-cards'
const TOOL = 'explain_concept'
const PANE = 'concept'
const cards = atom({ plugin: 'concept-cards', key: 'cards' } as const, [])
const index = atom({ plugin: 'concept-cards', key: 'index' } as const, 0)

const CATEGORIES = [
  'design-pattern',
  'architecture',
  'principle',
  'algorithm',
  'data-structure',
  'technique',
] as const

type Concept = {
  name: string
  category: (typeof CATEGORIES)[number]
  aliases?: string[]
  origin: string
  purpose: string
  pros: string[]
  cons: string[]
  useWhen: string
  avoidWhen?: string
  here?: string
  related?: string[]
}

const RULE = `# Concept cards

The user is learning the names behind the techniques used in their work. Whenever you name, propose or apply a recognised industry concept — a design pattern (Strategy, Observer, Adapter), an architecture style (hexagonal, CQRS, event sourcing), a principle (SOLID, DRY, YAGNI, Law of Demeter), an algorithm or data structure (debounce, LRU cache, topological sort, trie), or a named technique (optimistic update, idempotency key, feature flag) — call the \`mcp__${PLUGIN}__${TOOL}\` tool once for it. This applies in coding sessions, grilling sessions and Wayfinder ticket work alike, and also when you use a concept without naming it: name it in the card.

- One call per concept per session; skip generic words (function, class, API) and anything already carded this session.
- Fill \`origin\` with who introduced or popularised it, where and roughly when; say so plainly when the origin is folk or disputed rather than inventing one.
- Keep every field short: this is a quick card, not an essay. \`here\` is one sentence on how it applies to the current work.
- Do not repeat the card's contents in your reply; the tool shows it to the user in a popup. Carry on with the task.`

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'concept'

const today = () => new Date().toISOString().slice(0, 10)

const stripFrontmatter = (text: string) =>
  text.startsWith('---\n') ? text.slice(text.indexOf('\n---\n', 4) + 5).trimStart() : text

const bullets = (items: readonly string[] | undefined) =>
  (items ?? []).map(item => `- ${item}`).join('\n') || '- —'

const seenLine = (project: string, here: string | undefined) =>
  `- ${today()} — ${project}${here ? `: ${here}` : ''}`

const cardFile = (c: Concept, project: string) =>
  `---
name: ${JSON.stringify(c.name)}
category: ${c.category}
aliases: ${JSON.stringify(c.aliases ?? [])}
related: ${JSON.stringify(c.related ?? [])}
first_seen: ${today()}
---

# ${c.name}

**Origin:** ${c.origin}

## Purpose

${c.purpose}

## Pros

${bullets(c.pros)}

## Cons

${bullets(c.cons)}

## When to use

${c.useWhen}
${c.avoidWhen ? `\n## When not to use\n\n${c.avoidWhen}\n` : ''}${
    c.related?.length ? `\n## Related\n\n${bullets(c.related)}\n` : ''
  }
## Seen in

${seenLine(project, c.here)}
`

async function folderOf($: EngineInterface, options: { folder?: unknown }) {
  const raw = typeof options.folder === 'string' && options.folder ? options.folder : '~/concept-wiki'
  if (!raw.startsWith('~')) return raw.replace(/\/$/, '')
  const home = (await $.env.get('HOME')) ?? ''

  return `${home}${raw.slice(1)}`.replace(/\/$/, '')
}

async function writeIndex($: EngineInterface, folder: string) {
  const sections: string[] = []
  const dirs = (await $.fs.list(folder)).filter(entry => entry.kind === 'dir' && !entry.name.startsWith('.'))
  for (const dir of [...dirs].sort((a, b) => a.name.localeCompare(b.name))) {
    const files = (await $.fs.list(`${folder}/${dir.name}`)).filter(f => f.kind === 'file' && f.name.endsWith('.md'))
    const rows: string[] = []
    for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
      const text = await $.fs.read(`${folder}/${dir.name}/${file.name}`)
      const title = /^# (.+)$/m.exec(text)?.[1] ?? file.name.replace(/\.md$/, '')
      rows.push(`- [${title}](${dir.name}/${file.name})`)
    }
    if (rows.length) sections.push(`## ${dir.name}\n\n${rows.join('\n')}`)
  }
  await $.fs.write(
    `${folder}/README.md`,
    `# Concept wiki\n\nCards saved by the concept-cards mod whenever a named pattern, principle or algorithm came up in a session. One file per concept, grouped by category; "Seen in" records each time it came up.\n\n${sections.join('\n\n')}\n`,
  )
}

async function show($: EngineInterface, card: Card) {
  await update($, cards, list => [...list.filter(one => one.slug !== card.slug), card])
  const list = await read($, cards)
  await update($, index, () => list.length - 1)
  const opened = await $.ui.open({
    id: PANE,
    title: 'Concept card',
    focus: true,
    closeOnEscape: true,
    holdToasts: true,
  })
  if (!opened.isPlaced) $.ui.toast(`Concept card: ${card.name} (/concepts to open)`)
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: TOOL,
      description:
        'Shows the user a short wiki card for a named design pattern, architecture style, principle, algorithm, data structure or technique you just used or proposed, and saves it to their concept wiki. Call once per concept per session.',
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Canonical name, e.g. "Strategy pattern"' },
          category: { type: 'string', enum: [...CATEGORIES] },
          aliases: { type: 'array', items: { type: 'string' } },
          origin: { type: 'string', description: 'Who introduced or popularised it, where, roughly when' },
          purpose: { type: 'string', description: 'The problem it was made to solve, 1-2 sentences' },
          pros: { type: 'array', items: { type: 'string' }, description: '2-4 short bullets' },
          cons: { type: 'array', items: { type: 'string' }, description: '2-4 short bullets' },
          useWhen: { type: 'string', description: 'The ideal situation to reach for it' },
          avoidWhen: { type: 'string', description: 'When it is the wrong tool' },
          here: { type: 'string', description: 'One sentence: how it applies to the current work' },
          related: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'category', 'origin', 'purpose', 'pros', 'cons', 'useWhen'],
      },
    })
    await $.command.register({
      name: 'concepts',
      description: 'Open the concept card popup, or look one up: /concepts <name>',
    })

    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return {
      sections: [...composed.sections, { id: `${PLUGIN}:rule`, text: RULE, scope: 'session' as const }],
    }
  })

  on('tool.call', { tool: 'mcp__concept-cards__explain_concept' }, async ($, e) => {
    const concept = e as unknown as Concept
    const slug = slugOf(concept.name)
    const category = CATEGORIES.includes(concept.category) ? concept.category : 'technique'
    if ((await read($, cards)).some(card => card.slug === slug)) {
      return { result: `"${concept.name}" was already carded this session; nothing shown.` }
    }

    const folder = await folderOf($, options)
    const path = `${folder}/${category}/${slug}.md`
    const root = await $.session.root()
    const project = root.split('/').filter(Boolean).pop() ?? root
    const isNew = !(await $.fs.exists(path))
    let text: string
    if (isNew) {
      text = cardFile({ ...concept, category }, project)
    } else {
      text = `${(await $.fs.read(path)).trimEnd()}\n${seenLine(project, concept.here)}\n`
    }
    await $.fs.write(path, text)
    await writeIndex($, folder)
    await show($, { slug, name: concept.name, markdown: stripFrontmatter(text) })

    return {
      result: isNew
        ? `Card for "${concept.name}" shown to the user and saved to ${path}.`
        : `"${concept.name}" was already in the wiki; shown again and this session added under "Seen in" (${path}).`,
    }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `The concept card could not be saved or shown (${next.error.kind}: ${next.error.message ?? 'no message'}).` }))

  on('command.run', { command: 'concepts' }, async ($, e) => {
    const query = e.args.trim()
    if (!query) {
      if ((await read($, cards)).length === 0) {
        return { text: 'No concept cards yet this session. Try /concepts <name> to open a saved one.' }
      }
      await $.ui.open({ id: PANE, title: 'Concept card', focus: true, closeOnEscape: true, holdToasts: true })

      return { text: 'Concept card opened.' }
    }

    const folder = await folderOf($, options)
    const slug = slugOf(query)
    for (const category of CATEGORIES) {
      const path = `${folder}/${category}/${slug}.md`
      if (await $.fs.exists(path)) {
        const text = await $.fs.read(path)
        const name = /^# (.+)$/m.exec(text)?.[1] ?? query
        await show($, { slug, name, markdown: stripFrontmatter(text) })

        return { text: `Opened ${name}.` }
      }
    }

    return { text: `No card named "${query}" in ${folder}.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const list = await read($, cards)
    const at = Math.min(await read($, index), list.length - 1)
    const card = list[at]
    if (!card) return <Text dimColor>No concept cards yet.</Text>
    const go = (step: number) => update($, index, n => Math.max(0, Math.min(list.length - 1, n + step)))

    return (
      <Box flexDirection="column">
        <Markdown text={card.markdown} />
        <Box flexDirection="row" gap={2}>
          <Button label="Prev" hotkey="p" onPress={() => go(-1)} />
          <Text dimColor>
            {at + 1}/{list.length}
          </Text>
          <Button label="Next" hotkey="n" onPress={() => go(1)} />
          <Button label="Close" role="dismiss" autoFocus onPress={() => $.ui.close({ id: PANE })} />
          <Text dimColor>saved to your concept wiki</Text>
        </Box>
      </Box>
    )
  })
}
