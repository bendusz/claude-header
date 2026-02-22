# claude-header Design

## Problem
Agent context windows are limited (~200K tokens, ~40K consumed on startup). Reading 300-500 line files wastes context on content the agent doesn't need. This skill creates ultra-dense file headers that let agents understand file contents without reading the full file.

## Design Decisions
- **Format:** Flat sequential index, ultra-dense, `@claude-header v1` delimiters
- **Invocation:** Manual only — no hooks, no auto-triggers
- **File types:** Code files (commented header) + docs (HTML comment header)
- **Agent behavior:** Context-dependent — scan (header only), target (line range), or full (rare)
- **Summary line:** One terse domain:description line at top

## Header Format Spec

### Delimiters
- Open: `@claude-header v1 DOMAIN:terse-description`
- Close: `@end-claude-header`
- Wrapped in language-appropriate comment syntax

### Symbol Line Format
```
ID:TYPE:name(params)[startLine-endLine]->returnType deps:ID,ID optional-note
```

- **ID**: Sequential integer. Class members: `3a`, `3b`, `3c`
- **TYPE**: `fn` `cls` `mtd` `prop` `const` `var` `type` `iface` `enum` `exp` `imp`
- **params**: Names only, no types
- **[lines]**: Start-end range
- **->return**: Only if non-void
- **deps:N,N**: References to other items
- **note**: 2-5 words ONLY if name isn't self-explanatory

### Code Example
```
// @claude-header v1 AUTH:jwt-session-mgmt
// 1:imp:express,jwt,config
// 2:fn:parseConfig(path)[12-34]->Config
// 3:fn:validateSchema(cfg)[36-58]->bool deps:2
// 4:cls:AuthManager[60-150] deps:2,3
// 4a:mtd:login(creds)[65-90]->Token
// 4b:mtd:logout(tok)[92-110]->void
// 5:exp:AuthManager
// @end-claude-header
```

### Doc Header Format
- Delimiters: `<!-- @claude-header v1 -->` / `<!-- @end-claude-header -->`
- List headings with line numbers + condensed content
- Telegraphic style: drop articles, prepositions, filler
- Key-value notation for data: `revenue:$2.4M arr:32%`
- Hierarchical: `h2:Section[line];fact1;fact2;fact3`
- Preserve specifics (numbers, names, dates, decisions), drop narrative
- Max size: ~5-8% of original token count, capped at ~2000 tokens

### Doc Example
```
<!-- @claude-header v1 PLAN:acme-corp-2026 -->
<!-- 1:h1:Executive Summary[1];B2B-SaaS;fintech-compliance;seed-$2M;target-series-A-Q4 -->
<!-- 2:h2:Problem[8];manual-compliance-costs-$500K/yr;error-rate-12%;no-automation-under-$1M -->
<!-- 3:h2:Solution[15];automated-audit-pipeline;reduce-cost-80%;3-integrations:quickbooks,xero,sage -->
<!-- 4:h2:Market[28];TAM:$8B;SAM:$1.2B;SOM:$40M-yr3;competitors:bigco(enterprise),startupX(SMB) -->
<!-- 5:h2:Financials[45];arr-yr1:$400K;yr2:$1.8M;yr3:$5.2M;burn:$120K/mo;runway:16mo -->
<!-- @end-claude-header -->
```

## Large Document Handling
- Threshold: >3000 lines or ~80K tokens triggers chunked mode
- Agent reads first ~60K tokens, generates header for that portion
- Spawns continuation agent with: condensed header so far, file path, line number to continue
- Parent agent merges chunk headers into final header
- Chunk boundary marker: `(cont:L342)` if mid-section

## Agent Behavior Modes

**Mode 1 — Scan (default):** Read only header. Stop at `@end-claude-header`. Use when exploring/searching.

**Mode 2 — Target:** Read header to find item + line range. Read only that range + deps. Use when editing/debugging specific symbol.

**Mode 3 — Full:** Read entire file. Use only for major refactor/full review. Rare.

Decision: default to Mode 1, escalate only when task requires it.

## Generation Rules

### Comment Syntax
| Language | Syntax |
|----------|--------|
| JS/TS/Go/Rust/Java/C | `// ` per line |
| Python/Shell/Ruby | `# ` per line |
| CSS | `/* ... */` block |
| HTML/MD/XML | `<!-- ... -->` |
| SQL | `-- ` per line |

### Ordering
1. Imports first
2. Top-level symbols in source order
3. Class members as sub-items immediately after parent
4. Exports last

### Include
- All functions, classes, types, interfaces, enums, constants
- Exports explicitly marked
- Dependencies between items

### Exclude
- Local variables inside functions
- Implementation details
- Source comments
- Obvious boilerplate

### Line Number Accuracy
Generate header, insert at top, then adjust all line numbers by header line count.

## Scope Rules
- Skip files under 30 lines
- Skip generated/binary files
- Update = full regeneration (remove old, regenerate)
- Each file's header is self-contained (no cross-file deps)
- Nested functions: flatten to max 2 levels
- Barrel/re-export files: list re-exports, don't recurse
