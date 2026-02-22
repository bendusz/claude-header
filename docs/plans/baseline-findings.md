# Baseline Findings — claude-header Skill

## Code Header Generation (without skill)

**Format deviations from spec:**
1. **ID format wrong**: Used prefixed IDs (`E0`, `I0`, `F0`, `C0`, `M0`) instead of sequential integers (`1`, `2`, `3a`, `3b`). This makes cross-referencing harder and inconsistent.
2. **Type info in params**: Included type annotations (`user:PrismaUser`, `password:string`) — spec says names only to save tokens.
3. **No import line**: Missing `N:imp:` entry entirely.
4. **Export format verbose**: Used prose-like `exports: Name1,Name2` lines instead of `N:exp:Name1,Name2` with sequential ID.
5. **Summary line format off**: Used em dash + prose (`— Auth service: registration, login...`) instead of compact `DOMAIN:terse-description` (`AUTH:jwt-session-mgmt`).
6. **Nested function omitted**: Didn't index `_signToken` inside `generateTokenPair`. Should be `Fa` sub-item.
7. **Line numbers pre-header**: Referenced original line numbers, not adjusted for header insertion.
8. **deps reference custom IDs**: Used `I2`, `E0` prefixed IDs in deps instead of sequential numbers.
9. **Constants selectively indexed**: Omitted 5 simple constants — arguably correct, but RegisterSchema was included.

**What it got right:**
- Captured all major symbols (functions, class, methods, types, interfaces, enums)
- Included return types
- Tracked dependencies between items
- Class methods listed under parent class
- Used delimiter markers correctly

**Rationalizations observed:**
- "chose not to index [nested function] since it is purely internal" — reasonable but inconsistent with spec
- "omitted [constants] to keep token count minimal" — agent making judgment calls without spec guidance
- Lengthy "format explanation" and "difficulties" sections — agent adds verbose meta-commentary

## Doc Header Generation (without skill)

**Format deviations:**
1. **ID format wrong**: Used `H1`, `H2` prefix instead of sequential integers.
2. **Opening delimiter malformed**: `<!-- @claude-header v1` without closing `-->` on the same line.
3. **Content-inside-comment style**: All entries inside a single HTML comment block rather than separate comments per line.

**What it got right (impressively):**
- Excellent content density — captured all key facts
- Good telegraphic style with arrow notation for trends (`38->54->72->97`)
- Preserved all numbers, names, dates, dollar amounts, percentages
- Tables encoded compactly
- Summary metadata line at top
- Only 29 lines for 152-line doc (19% ratio — slightly over 5-8% target but acceptable for data-dense doc)

**Rationalizations observed:**
- Adjusted line numbers for header offset (good!) but discussed it at length in meta-commentary
- Described "density vs completeness tradeoff" — agent editorializing on its choices

## Reading Behavior (without skill)

**Key findings:**
1. **Read tool returns entire file**: Agent cannot physically stop at `@end-claude-header` — the Read tool returns full file contents.
2. **Agent was transparently honest**: Acknowledged it saw the full file and potential unconscious bias.
3. **Answered correctly from header alone**: All 4 questions answered accurately using only header data.
4. **Insight on mitigation**: Agent suggested using `limit` parameter on Read to restrict to header lines only.

**Critical gap:**
- Without skill authority, agent has no protocol for reading headers first with `limit`, then deciding whether to read more.
- The 3-mode behavior (scan/target/full) doesn't emerge naturally — agent just reads everything.
- The skill needs to explicitly instruct: "Use Read with `limit` set to header line count when in Scan mode."

## Summary of Issues to Address in Skill

| Issue | Fix in Skill |
|-------|-------------|
| Prefixed IDs instead of sequential integers | Explicit format spec with example |
| Type annotations in params | "params: names only, no types" with example |
| Missing imp/exp lines | Include in ordering rules |
| Verbose summary line | Show exact format: `DOMAIN:terse-desc` |
| Nested functions omitted | Explicit rule: flatten to 2 levels, sub-item notation |
| Line numbers not adjusted | Explicit: "adjust all line numbers after header insertion" |
| Reading behavior: no scan mode | Explicit: "use Read with limit parameter for scan mode" |
| Agent adds meta-commentary | Not a skill issue — just subagent reporting |
