import { expect, mock, test } from 'claude-code/testing'

const TOOL = 'mcp__concept-cards__explain_concept'
const STRATEGY = {
  name: 'Strategy pattern',
  category: 'design-pattern',
  origin: 'Gang of Four, Design Patterns (1994)',
  purpose: 'Swap one algorithm for another behind a shared interface.',
  pros: ['Open for extension', 'Easy to test each strategy'],
  cons: ['More small types'],
  useWhen: 'Several interchangeable behaviours chosen at run time.',
  here: 'Picking a model provider per Chat.',
}

test('a card is saved, indexed, popped up, and a second call is skipped', async ($, on) => {
  const files = new Map<string, string>()
  const opened: string[] = []
  mock.env(on, { HOME: '/home/u' })
  on('session.root', async () => ({ value: '/home/u/code/Arcwise' }))
  on('fs.exists', async ($, e) => ({ value: files.has(e.path) }))
  on('fs.read', async ($, e) => ({ value: files.get(e.path) ?? '' }))
  on('fs.write', async ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('fs.list', async ($, e) => {
    const prefix = `${e.path}/`
    const names = new Map<string, 'file' | 'dir'>()
    for (const path of files.keys()) {
      if (!path.startsWith(prefix)) continue
      const rest = path.slice(prefix.length).split('/')
      names.set(rest[0]!, rest.length > 1 ? 'dir' : 'file')
    }
    return { value: [...names].map(([name, kind]) => ({ name, kind, size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('ui.open', async ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true as const } }
  })

  const first = await $.tool.call({ tool: TOOL, ...STRATEGY })
  expect(String(first.result)).toContain('saved to /home/u/concept-wiki/design-pattern/strategy-pattern.md')
  const card = files.get('/home/u/concept-wiki/design-pattern/strategy-pattern.md')!
  expect(card).toContain('**Origin:** Gang of Four')
  expect(card).toContain('Arcwise: Picking a model provider per Chat.')
  expect(files.get('/home/u/concept-wiki/README.md')).toContain(
    '- [Strategy pattern](design-pattern/strategy-pattern.md)',
  )
  expect(opened).toEqual(['concept'])

  const again = await $.tool.call({ tool: TOOL, ...STRATEGY })
  expect(String(again.result)).toContain('already carded this session')
  expect(opened).toEqual(['concept'])
})

test('a concept already in the wiki gets a new Seen in line, not a rewrite', async ($, on) => {
  const path = '/home/u/concept-wiki/design-pattern/strategy-pattern.md'
  const files = new Map([[path, '---\nname: x\n---\n\n# Strategy pattern\n\nMy own notes.\n\n## Seen in\n\n- 2026-01-01 — Old\n']])
  mock.env(on, { HOME: '/home/u' })
  on('session.root', async () => ({ value: '/home/u/code/Arcwise' }))
  on('fs.exists', async ($, e) => ({ value: files.has(e.path) }))
  on('fs.read', async ($, e) => ({ value: files.get(e.path) ?? '' }))
  on('fs.write', async ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('fs.list', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))

  const result = await $.tool.call({ tool: TOOL, ...STRATEGY })
  expect(String(result.result)).toContain('already in the wiki')
  const text = files.get(path)!
  expect(text).toContain('My own notes.')
  expect(text).toContain('- 2026-01-01 — Old\n- ')
  expect(text).toContain('Arcwise: Picking a model provider per Chat.')
})
