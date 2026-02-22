---
name: claude-header
description: Use when asked to add or update claude-header blocks, or when reading a file containing @claude-header.
---

# claude-header

Ultra-dense file headers so agents understand file contents without reading the full file.

## Before Generating

Ask user whether to dispatch a subagent (recommended — protects main context window). If yes, dispatch `general-purpose` subagent with full skill text + file path.

## Format

```
COMMENT @claude-header v1 DOMAIN:terse-description
COMMENT ID:TYPE:name(params)[startLine-endLine]->returnType deps:ID,ID optional-note
COMMENT @end-claude-header
```

**IDs:** Sequential integers: `1`, `2`, `3`. Members: `3a`, `3b`, `3c`. NOT prefixed (`F0`, `E1`, `H2`).

**Types:** `fn` `cls` `mtd` `prop` `const` `var` `type` `iface` `enum` `exp` `exp-type` `exp-default` `imp`

**Params:** Names only. NO types. `sanitizeUser(user)` not `sanitizeUser(user:PrismaUser)`.

**deps:** Reference sequential IDs. `deps:1,2` not `deps:F0,I2`.

**note:** 2-5 words ONLY if name is unclear. Most items need no note.

**->return:** Only if non-void/non-undefined.

## Code Example

```
// @claude-header v1 AUTH:jwt-session-mgmt
// 1:imp:express,bcrypt,jwt,zod,prisma
// 2:enum:AuthRole[17-22]
// 3:enum:AccountStatus[24-29]
// 4:iface:TokenPayload[35-41]
// 5:iface:AuthResult[43-47] deps:6
// 6:iface:SanitizedUser[49-56]
// 7:type:PasswordStrength[58]
// 8:const:RegisterSchema[60-65]
// 9:fn:sanitizeUser(user)[74-83]->SanitizedUser
// 10:fn:evaluatePasswordStrength(password)[90-102]->PasswordStrength
// 11:fn:generateTokenPair(user,secret)[109-127]->{accessToken,refreshToken} deps:4
// 11a:fn:_signToken(payload,expiresIn)[113-115]->string nested-helper
// 12:cls:AuthService[133-248]
// 12a:mtd:register(input)[146-175]->Promise<AuthResult> deps:8,10,9,11
// 12b:mtd:login(email,password)[181-220]->Promise<AuthResult> deps:9,11
// 12c:mtd:verifyToken(token)[223-225]->TokenPayload
// 12d:mtd:requireAuth(allowedRoles)[231-247]->middleware deps:12c
// 13:exp:AuthRole,AccountStatus,sanitizeUser,evaluatePasswordStrength,generateTokenPair,RegisterSchema
// 14:exp-type:TokenPayload,AuthResult,SanitizedUser,PasswordStrength,RegisterInput
// 15:exp-default:AuthService
// @end-claude-header
```

## Doc Example

```yaml
---
claude-header: v1 PLAN:acme-series-a
index:
  - "1:h1:Executive Summary[10];B2B-SaaS;fintech-compliance;raising-$24M@$120M-pre;founded-Mar2023"
  - "2:h2:Market[22];TAM:$12.8B;mid-market:38%=$4.9B;incumbents-enterprise-only;gap-in-mid-market"
  - "3:h2:Traction[34];ARR:Q1=$2.1M->Q4=$5.8M;customers:38->97;NRR:126%;churn:1.3%"
  - "4:h2:Product[55];3-modules:Workspace,Forecast,Insights;15%-utilization-improvement"
  - "5:h2:Financials[71];burn:$680K/mo;runway:26mo;breakeven:Q3-2028@$50M-ARR"
  - "6:h2:Team[111];CEO:Kessler(ex-Palantir);CTO:Chandrasekaran(ex-Stripe);headcount:42->78"
  - "7:h2:Ask[150];$24M@$120M-pre;1-board-seat;close:Mar-15-2026"
---
```

**Doc condensation rules:**
- Max ~5-8% of original tokens, cap 2000 tokens
- **Behavior-only retention:** Keep only facts that change actions/outputs. Drop narrative, adjectives, justifications
- **Deduplication:** Same fact in multiple sections? Capture once where most relevant
- **Date/number normalization:** `Mar-2023` not `March 2023`, `$2.4M` not `$2,400,000`, `+176%` not `grew by 176 percent`
- **Audience stripping:** Drop filler: "note that", "importantly", "as mentioned", "please consider"
- **Constraint ordering:** For spec docs, hard constraints first per section, soft preferences after
- Collapse h3 into parent h2 when brief

## Comment Syntax

| Language | Syntax |
|----------|--------|
| JS/TS/Go/Rust/Java/C | `// ` per line |
| Python/Shell/Ruby | `# ` per line |
| CSS | `/* ... */` block |
| HTML/XML | `<!-- ... -->` per line |
| Markdown | YAML frontmatter `---` block |
| SQL | `-- ` per line |

## Generation Rules

**Order:** imports → symbols in source order → class members as sub-items → exports last.

**Include:** Functions, classes, types, interfaces, enums, exported constants.

**Exclude:** Local variables, implementation details, comments, boilerplate.

**Nesting:** Flatten to max 2 levels. Sub-item notation (`11a`).

**Line numbers:** Insert header, then adjust ALL line numbers by header line count.

**Skip:** Files <30 lines. Generated/binary files. Update = full regeneration.

## Reading a File with @claude-header

**Scan (default):** Read ONLY header via `Read` with `limit` = header line count.

**Target:** `Read` with `offset`/`limit` for specific line range + deps from header.

**Full:** Major refactors only. Rare.

## Large Documents (>3000 lines)

Chunk: read ~60K tokens, generate header, spawn continuation agent with header-so-far + file path + continue-from line. Merge. Mark: `(cont:L342)`.
