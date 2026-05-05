# My Claude Code skills

Single repo for skills I use regularly. External skills are pulled from their
upstream repos — never copy-pasted into this tree.

## Install on a fresh machine

```bash
curl -fsSL https://raw.githubusercontent.com/Ja-yy/skills/main/bootstrap.sh | bash
```

## Update everything later

```bash
npx skills update -g -y
```

`update` re-pulls every installed skill from its recorded origin (this repo for
mine, upstream for externals). No need to re-run the bootstrap.

## See what's installed

```bash
npx skills list -g
```

## What's installed

### My skills (`skills/`)

_None yet — repo skeleton only. Add to `skills/<category>/<name>/SKILL.md` and re-bootstrap._

### External skills (pulled by `bootstrap.sh`)

| Skill                            | Source                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `caveman`                        | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman/tree/main/caveman)                                                               |
| `caveman-commit`                 | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman/tree/main/skills/caveman-commit)                                                 |
| `compress`                       | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman/tree/main/caveman-compress)                                                      |
| `find-skills`                    | [vercel-labs/skills](https://github.com/vercel-labs/skills/tree/main/skills/find-skills)                                                          |
| `setup-matt-pocock-skills`       | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills) — run once per repo               |
| `diagnose`                       | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnose)                                                   |
| `grill-with-docs`                | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs)                                            |
| `triage`                         | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/triage)                                                     |
| `improve-codebase-architecture`  | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture)                              |
| `tdd`                            | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd)                                                        |
| `to-issues`                      | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-issues)                                                  |
| `to-prd`                         | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-prd)                                                     |
| `zoom-out`                       | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/zoom-out)                                                   |
| `grill-me`                       | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me)                                                  |
| `write-a-skill`                  | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/write-a-skill)                                             |

> **Note**: matt's `caveman` is intentionally **not** installed — it would collide with `JuliusBrussee/caveman` (same skill name) which is more featured (intensity levels, wenyan modes, sibling `caveman-commit` / `compress`).
>
> **Note**: after a fresh install, run `/setup-matt-pocock-skills` once per repo where you plan to use `to-issues`, `to-prd`, `triage`, `diagnose`, `tdd`, `improve-codebase-architecture`, or `zoom-out`. It scaffolds the per-repo config those skills need.

`bootstrap.sh` is the source of truth for the external list. To add or remove,
edit it directly.

## Bootstrap flags

| Flag             | Effect                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| `--project`      | Install at project scope (`./.claude/skills`) instead of global                       |
| `--no-external`  | Skip externals, install only this repo                                                |
| `--list`         | Print what would be installed, install nothing                                        |
| `--agent NAME`   | Target a specific coding agent (repeatable). Default: `claude-code`                   |

Multi-agent example:

```bash
bash bootstrap.sh --agent claude-code --agent codex --agent cursor
```

Supported agent names: `claude-code`, `codex`, `cursor`, `amp`, `cline`, `opencode`, `gemini-cli`, `github-copilot`, `warp`, `kimi-cli`, `antigravity`, `deepagents`, `firebender` (anything `npx skills` accepts).

## Detecting upstream drift

External skills live in other people's repos. If matt or anyone else renames or
deletes a skill folder, your bootstrap will fail silently on next install. Run
the verifier to catch this early:

```bash
./scripts/verify-externals.sh
```

It pings every `github.com/.../tree/...` URL in `bootstrap.sh` via the GitHub
API and exits non-zero if any path is dead. Requires `gh` CLI authenticated.

## Adding a new skill

**Mine** — drop a folder under `skills/<category>/<name>/` with a valid
`SKILL.md` (must have `name` + `description` frontmatter), push, then re-run
`bootstrap.sh` on each machine (or `npx skills update -g -y` if it was already
present in an earlier bootstrap).

**External** — add a `npx skills add <github-tree-url>` line in
`bootstrap.sh`, push, then re-run on each machine.

## Statusline (tokens + session %)

A minimal Claude Code statusline. Two values, one space, no labels:

```
50K 5%
```

- First number — total tokens in the current API call (auto-scaled K/M)
- Second number — Claude.ai 5-hour rolling-window usage %

The session % only renders for Pro/Max accounts and only after the first model
response in a session — it reads `rate_limits.five_hour.used_percentage` from
the statusline JSON, which is absent before that point. On non-subscription
accounts that segment is simply omitted.

Install:

```bash
./scripts/install-statusline.sh
```

That copies `scripts/statusline-tokens.sh` to `~/.claude/statusline-tokens.sh`
and patches `~/.claude/settings.json` to use it. Backs up the existing settings
first. Restart Claude Code to see it.

Requires `python3` (preinstalled on virtually every dev machine).

## Local development

When iterating on a skill in this repo without re-installing every time:

```bash
./scripts/link-skills.sh
```

Symlinks each skill folder into `~/.claude/skills/`. Edit, save, Claude Code
picks up the change immediately.

## Contributing

`main` is protected. All changes — including from the repo owner — go through a pull request:

```bash
git checkout -b feature/xyz
# ...edit...
git push -u origin feature/xyz
gh pr create --fill
gh pr merge --squash --delete-branch
```
