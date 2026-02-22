---
name: claude-header
description: Use when asked to add, update, or generate claude-header blocks on files. Also use when reading a file that contains @claude-header — read header first with limit, then decide whether to read more.
---

# claude-header

Generate ultra-dense file headers that let agents understand file contents without reading the full file. Protects context window.

## Format

```
COMMENT @claude-header v1 DOMAIN:terse-description
COMMENT ID:TYPE:name(params)[startLine-endLine]->returnType deps:ID,ID optional-note
COMMENT @end-claude-header
```

**IDs:** Sequential integers: `1`, `2`, `3`. Class/object members: `3a`, `3b`, `3c`. NOT prefixed (`F0`, `E1`, `H2`).

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

For documents, condense content — not just headings. Telegraphic style, key-value data, drop narrative.

```
<!-- @claude-header v1 PLAN:acme-series-a -->
<!-- 1:h1:Executive Summary[7];B2B-SaaS;fintech-compliance;raising-$24M@$120M-pre;founded-Mar2023 -->
<!-- 2:h2:Market[19];TAM:$12.8B;mid-market:38%=$4.9B;incumbents-enterprise-only;gap-in-mid-market -->
<!-- 3:h2:Traction[31];ARR:Q1=$2.1M->Q4=$5.8M;customers:38->97;NRR:126%;churn:1.3% -->
<!-- 4:h2:Product[52];3-modules:Workspace,Forecast,Insights;15%-utilization-improvement -->
<!-- 5:h2:Financials[68];burn:$680K/mo;runway:26mo;breakeven:Q3-2028@$50M-ARR -->
<!-- 6:h2:Team[108];CEO:Kessler(ex-Palantir);CTO:Chandrasekaran(ex-Stripe);headcount:42->78 -->
<!-- 7:h2:Ask[147];$24M@$120M-pre;1-board-seat;close:Mar-15-2026 -->
<!-- @end-claude-header -->
```

**Doc rules:** Max ~5-8% of original tokens, cap 2000 tokens. Preserve: numbers, names, dates, decisions. Drop: narrative, adjectives, justifications. Collapse h3 subsections into parent h2 line when content is brief — use separate entries only when a subsection has substantial unique data.

## Comment Syntax

| Language | Syntax |
|----------|--------|
| JS/TS/Go/Rust/Java/C | `// ` per line |
| Python/Shell/Ruby | `# ` per line |
| CSS | `/* ... */` block |
| HTML/MD/XML | `<!-- ... -->` per line |
| SQL | `-- ` per line |

## Generation Rules

**Order:** imports → top-level symbols in source order → class members as sub-items → exports last.

**Include:** All functions, classes, types, interfaces, enums, exported constants.

**Exclude:** Local variables, implementation details, source comments, obvious boilerplate.

**Nested functions:** Flatten to max 2 levels. Use sub-item notation (`11a`).

**Line numbers:** Generate header, insert at top, then adjust ALL line numbers by header line count in a single pass.

**Skip:** Files under 30 lines. Generated/binary files. Update = full regeneration.

## Reading a File with @claude-header

When you encounter `@claude-header` in a file:

**Default (Scan):** Read ONLY the header using `Read` with `limit` set to header line count. This gives you full file understanding without consuming context on the body.

**Target:** Need to edit a specific symbol? Read its line range from the header, then `Read` with `offset` and `limit` for just that section. Follow `deps:` to read dependencies too.

**Full:** Only for major refactors requiring full-file understanding. Rare.

## Large Documents (>3000 lines)

Read first ~60K tokens, generate header for that portion. Spawn continuation agent with: header-so-far, file path, line to continue from. Merge results. Mark boundaries: `(cont:L342)`.
