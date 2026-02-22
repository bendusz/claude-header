# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **skill development project** for `claude-header` — a Claude Code skill that generates ultra-dense file headers to reduce agent context window consumption. The skill lives at `~/.claude/skills/claude-header/SKILL.md` and is mirrored in `skill/SKILL.md` in this repo.

There is no source code to build, test, or lint. The deliverable is the SKILL.md document itself. Testing is done via subagent pressure scenarios following TDD for documentation (RED → GREEN → REFACTOR).

## Key Files

- `skill/SKILL.md` — The skill definition (canonical copy synced to `~/.claude/skills/claude-header/SKILL.md`)
- `docs/plans/2026-02-22-claude-header-design.md` — Design decisions and format specification
- `docs/plans/baseline-findings.md` — What agents get wrong without the skill (RED phase)
- `docs/plans/green-test-results.md` — Compliance results with the skill (GREEN phase)
- `test-fixtures/` — Sample files for testing header generation (TS, MD, Python)

## Workflow

When modifying the skill:

1. **Always edit `~/.claude/skills/claude-header/SKILL.md` first** (the live copy agents load)
2. **Then sync**: `cp ~/.claude/skills/claude-header/SKILL.md skill/SKILL.md`
3. **Test via subagent**: dispatch a `general-purpose` agent with the skill text injected into the prompt + a target file. Do NOT test in the main session (defeats the purpose of context protection).
4. **Compare against baseline**: `docs/plans/baseline-findings.md` documents the specific failures the skill must fix.

## Header Format Quick Reference

Code: `// @claude-header v1 DOMAIN:desc` with `ID:TYPE:name(params)[lines]->return deps:N,N`

Docs: YAML frontmatter `claude-header: v1 DOMAIN:desc` with `index:` list of quoted entry strings

IDs are sequential integers (1, 2, 3). Class members use sub-items (3a, 3b). Types: `fn cls mtd prop const var type iface enum exp exp-type exp-default imp`. Params are names only, no types.

## Conventions

- Skill word count target: under 1500 words (currently ~650)
- `evoloop-context.md` is a personal file used for real-world testing, not part of the skill itself
- Test fixtures in `test-fixtures/` should not be modified permanently — reset with `git checkout -- test-fixtures/` after testing
