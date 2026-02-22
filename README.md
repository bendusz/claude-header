# claude-header

A [Claude Code](https://claude.ai/code) skill that generates ultra-dense file headers, so AI agents can understand file contents without reading the full file.

## The Problem

AI agent context windows are limited. Opus and Sonnet cap at 200K tokens, and ~40K is consumed on startup alone. When an agent reads a 300-500 line file just to understand what's in it, that's context wasted on content it may never need.

## The Solution

`claude-header` inserts a compact, machine-readable index at the top of each file. When an agent encounters a file with a header, it reads only the header first, then decides whether it needs the rest — saving 50-70% of context on typical files.

## Install

Copy the skill into your Claude Code skills directory:

```bash
mkdir -p ~/.claude/skills/claude-header
cp skill/SKILL.md ~/.claude/skills/claude-header/SKILL.md
```

## Usage

Ask Claude Code:

- "Add a claude-header to this file"
- "Add claude-headers to all files in src/"
- "Update the claude-header on this file"

The skill recommends dispatching a subagent for the work, keeping the heavy lifting out of your main conversation context.

## What It Produces

### Code files

A commented block at the top indexing every symbol with line ranges, return types, and dependencies:

```typescript
// @claude-header v1 AUTH:jwt-session-mgmt
// 1:imp:express,bcrypt,jwt,zod,prisma
// 2:enum:AuthRole[17-22]
// 3:fn:sanitizeUser(user)[74-83]->SanitizedUser
// 4:fn:generateTokenPair(user,secret)[109-127]->{accessToken,refreshToken} deps:2
// 4a:fn:_signToken(payload,expiresIn)[113-115]->string nested-helper
// 5:cls:AuthService[133-248]
// 5a:mtd:register(input)[146-175]->Promise<AuthResult> deps:3,4
// 5b:mtd:login(email,password)[181-220]->Promise<AuthResult> deps:3,4
// 6:exp:AuthRole,sanitizeUser,generateTokenPair
// 7:exp-default:AuthService
// @end-claude-header
```

### Documents (Markdown)

YAML frontmatter condensing the entire document to telegraphic key-value facts:

```yaml
---
claude-header: v1 PLAN:acme-series-a
index:
  - "1:h1:Executive Summary[10];B2B-SaaS;raising-$24M@$120M-pre;founded-Mar2023"
  - "2:h2:Market[22];TAM:$12.8B;mid-market:38%=$4.9B"
  - "3:h2:Traction[34];ARR:Q1=$2.1M->Q4=$5.8M;customers:38->97;NRR:126%"
  - "4:h2:Financials[71];burn:$680K/mo;breakeven:Q3-2028@$50M-ARR"
---
```

## How Agents Read Headers

The skill teaches agents three reading modes:

| Mode | When | What it reads |
|------|------|---------------|
| **Scan** (default) | Exploring, searching, understanding | Header only |
| **Target** | Editing a specific function/section | Header + that line range + deps |
| **Full** | Major refactors | Entire file (rare) |

## Format Reference

| Field | Format | Example |
|-------|--------|---------|
| ID | Sequential integer | `1`, `2`, `3` |
| Sub-item | Parent + letter | `3a`, `3b` |
| Types | Short abbreviation | `fn` `cls` `mtd` `prop` `const` `type` `iface` `enum` `exp` `imp` |
| Params | Names only, no types | `(user,secret)` not `(user:string,secret:string)` |
| Lines | Start-end range | `[74-83]` |
| Return | After `->` | `->SanitizedUser` |
| Deps | Comma-separated IDs | `deps:3,4` |
| Note | 2-5 words if name unclear | `nested-helper` |

### Comment syntax per language

| Language | Syntax |
|----------|--------|
| JS/TS/Go/Rust/Java/C | `// ` per line |
| Python/Shell/Ruby | `# ` per line |
| CSS | `/* ... */` block |
| HTML/XML | `<!-- ... -->` per line |
| Markdown | YAML frontmatter `---` block |
| SQL | `-- ` per line |

## Doc Condensation Techniques

When generating headers for documents, the skill applies:

- **Behavior-only retention** — keep facts that change actions/outputs, drop narrative
- **Deduplication** — capture repeated facts once in the most relevant section
- **Date/number normalization** — `Mar-2023` not `March 2023`, `$2.4M` not `$2,400,000`
- **Audience stripping** — drop filler like "note that", "importantly", "as mentioned"
- **Constraint ordering** — hard constraints first, soft preferences after

Target: ~5-8% of original document tokens, capped at ~2000 tokens.

## License

MIT
