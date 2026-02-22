---
name: claude-header
description: Use when asked to add, update, or generate @claude-header blocks on files. Also use when reading a file that contains @claude-header — read header first (limit), then decide whether to read more.
---

# claude-header (Ultra-Dense File Map)

Generate ultra-dense file headers that let agents understand file contents without reading the full file. Protects context window.

## Before Generating (Context Protection)
When asked to generate a claude-header, **ask the user whether to dispatch a `general-purpose` subagent** (recommended). If user agrees, dispatch with **the full skill text + the file path**.

## Format (Code)
```text
COMMENT @claude-header v1 DOMAIN:terse-description
COMMENT ID:TYPE:name(params)[startLine-endLine]->returnType deps:ID,ID optional-note
COMMENT @end-claude-header
```

- **COMMENT:** Use correct comment prefix per language (`//`, `#`, `/* ... */`, `<!-- ... -->`, `--`). Keep the rest literal: `@claude-header v1`, `@end-claude-header`, `[startLine-endLine]`.
- **IDs:** `1,2,3...` Nested/class members: `3a,3b...` **No prefix** (`F1` ❌).
- **TYPE:** `fn cls mtd prop const var type iface enum exp exp-type exp-default imp`
- **params:** names only; **no types** (`sanitizeUser(user)` ✅, `sanitizeUser(user:User)` ❌).
- **deps:** sequential IDs only (`deps:1,2a`), not symbol names.
- **optional-note:** 2–5 words **only if** name unclear.
- **->returnType:** include only if non-void/non-undefined.

## Doc Format (Markdown)
Use YAML frontmatter (not comment lines). Condense **content**, not just headings: telegraphic facts, key-value data, drop narrative.

```yaml
---
claude-header: v1 DOMAIN:terse-description
index:
  - "1:h1:Title[10];fact;fact"
  - "2:h2:Section[22];fact;fact"
---
```

## Comment Syntax
| Language | Syntax |
|---|---|
| JS/TS/Go/Rust/Java/C | `// ` per line |
| Python/Shell/Ruby | `# ` per line |
| CSS | `/* ... */` block |
| HTML/XML | `<!-- ... -->` per line |
| Markdown | YAML frontmatter `--- ... ---` |
| SQL | `-- ` per line |

## Generation Rules (Code)
- **Order:** `imp` → top-level symbols (source order) → class/object members as sub-items → exports last.
- **Include:** all functions, classes, types, interfaces, enums, **exported constants**.
- **Exclude:** local vars, implementation details, source comments, obvious boilerplate.
- **Nested functions:** flatten max depth 2 (`11a`, `11b`).
- **Line numbers:** generate header, insert at top, then **offset ALL** `[startLine-endLine]` by header line count in **one pass**.
- **Skip:** files `<30` lines; generated/binary files. **Update = full regeneration**.

## Generation Rules (Docs)
- **Cap:** ~5–8% tokens, hard cap 2000 tokens.
- **Behavior-only retention:** keep only facts that change actions/outputs; drop adjectives/justifications/explanations.
- **Deduplicate:** capture repeated facts once in most relevant section.
- **Normalize:** `Mar-2023`, `$2.4M`, `+176%`.
- **Specs:** hard constraints/decisions first; soft prefs after.
- Collapse brief `h3` into parent `h2` unless substantial unique data.

## Reading a File with @claude-header
If file contains `@claude-header`:
- **Default (Scan):** read **ONLY** the header using `Read` with `limit = header line count`.
- **Target:** to edit a symbol, read its `[startLine-endLine]`, then `Read` with `offset/limit` for that range; **follow `deps:`** and read dependency ranges too.
- **Full:** only for major refactors requiring full-file understanding (rare).

## Large Documents (>3000 lines)
Read first ~60K tokens, generate header for that portion. Spawn continuation agent with **header-so-far + file path + line to continue from**, mark boundary `(cont:L342)`, then merge.